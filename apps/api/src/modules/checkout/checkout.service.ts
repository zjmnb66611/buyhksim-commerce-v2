import { BadRequestException, ConflictException, Inject, Injectable, Optional } from "@nestjs/common";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { Sql } from "postgres";
import type { z } from "zod";
import { checkoutPreviewRequestSchema, createOrderRequestSchema } from "@buyhksim/contracts";
import { DB_CLIENT } from "../../shared/database.module";
import { IdempotencyService } from "../../shared/idempotency.service";

type Preview=z.infer<typeof checkoutPreviewRequestSchema>;
type CreateOrder=z.infer<typeof createOrderRequestSchema>;
type Snapshot={lines:Preview["lines"];subtotalMinor:number;discountMinor:number;totalMinor:number;currency:"CNY";expiresAt:string};
type SkuRow={id:string;price_minor:number;currency:string;merchant_id:string;product_title:string;sku_title:string;active:boolean;product_status:string};

const sandboxPrices:Record<string,number>={
  "5a1a1111-1111-4111-8111-111111111111":5800,
  "5a1a2222-2222-4222-8222-222222222222":6800,
  "5a1a3333-3333-4333-8333-333333333333":19800,
};

@Injectable()
export class CheckoutService {
  constructor(private readonly idem:IdempotencyService,@Optional() @Inject(DB_CLIENT) private readonly client:Sql|null=null){}
  private secret(){return process.env.JWT_ACCESS_SECRET??"development-only-secret-change-before-production"}

  async preview(input:Preview){
    const priceMap=this.client?await this.loadAuthoritativePrices(input.lines.map((line)=>line.skuId)):sandboxPrices;
    const subtotal=input.lines.reduce((sum,line)=>{const price=priceMap[line.skuId];if(price===undefined)throw new BadRequestException("商品已下架或不存在");return sum+price*line.quantity},0);
    const discount=subtotal>=20000?2000:0;
    const snapshot:Snapshot={lines:input.lines,subtotalMinor:subtotal,discountMinor:discount,totalMinor:subtotal-discount,currency:"CNY",expiresAt:new Date(Date.now()+15*60_000).toISOString()};
    const payload=Buffer.from(JSON.stringify(snapshot)).toString("base64url");
    const signature=createHmac("sha256",this.secret()).update(payload).digest("base64url");
    return {ok:true,data:{...snapshot,previewToken:`${payload}.${signature}`},requestId:randomUUID()};
  }

  async createOrder(key:string,input:CreateOrder){
    return this.idem.execute("order",key,input,async()=>{
      const snapshot=this.verify(input.previewToken);
      if(JSON.stringify(snapshot.lines)!==JSON.stringify(input.lines))throw new BadRequestException("商品清单与结算预览不一致，请重新结算");
      if(!this.client)return this.sandboxOrder();
      return this.persistOrder(this.client,snapshot);
    });
  }

  private async loadAuthoritativePrices(skuIds:string[]){
    const rows=await this.client!<SkuRow[]>`select s.id,s.price_minor,s.currency,s.active,p.merchant_id,p.title as product_title,s.title as sku_title,p.status as product_status from skus s join products p on p.id=s.product_id where s.id in ${this.client!(skuIds)} and s.active=true and p.status='ACTIVE'`;
    if(rows.length!==new Set(skuIds).size)throw new BadRequestException("部分商品已下架或不存在");
    if(rows.some((row)=>row.currency!=="CNY"))throw new BadRequestException("当前结算不支持混合币种");
    return Object.fromEntries(rows.map((row)=>[row.id,row.price_minor]));
  }

  private async persistOrder(client:Sql,snapshot:Snapshot){
    return client.begin(async(tx)=>{
      const skuIds=snapshot.lines.map((line)=>line.skuId);
      const skuRows=await tx<SkuRow[]>`select s.id,s.price_minor,s.currency,s.active,p.merchant_id,p.title as product_title,s.title as sku_title,p.status as product_status from skus s join products p on p.id=s.product_id where s.id in ${tx(skuIds)} for update`;
      if(skuRows.length!==new Set(skuIds).size||skuRows.some((row)=>!row.active||row.product_status!=="ACTIVE"))throw new ConflictException("商品状态已变化，请重新结算");
      const serverSubtotal=snapshot.lines.reduce((sum,line)=>{const sku=skuRows.find((row)=>row.id===line.skuId);return sum+(sku?.price_minor??0)*line.quantity},0);
      const serverDiscount=serverSubtotal>=20000?2000:0;
      if(serverSubtotal!==snapshot.subtotalMinor||serverDiscount!==snapshot.discountMinor)throw new ConflictException("价格或优惠已变化，请重新结算");
      const merchantIds=new Set(skuRows.map((row)=>row.merchant_id));
      if(merchantIds.size!==1)throw new BadRequestException("跨商户商品需要拆分结算");
      for(const line of snapshot.lines){const locked=await tx<{sku_id:string}[]>`update inventory set available=available-${line.quantity},locked=locked+${line.quantity},version=version+1,updated_at=now() where sku_id=${line.skuId} and warehouse_id=(select warehouse_id from inventory where sku_id=${line.skuId} and available>=${line.quantity} order by available desc limit 1 for update) and available>=${line.quantity} returning sku_id`;if(!locked.length)throw new ConflictException("库存不足，请调整数量后重试")}
      const orderId=randomUUID();const orderNo=`BH${new Date().toISOString().slice(0,10).replaceAll("-","")}${Math.floor(100000+Math.random()*899999)}`;const expiresAt=new Date(Date.now()+15*60_000);
      await tx`insert into orders (id,order_no,merchant_id,status,currency,subtotal_minor,discount_minor,shipping_minor,total_minor,refunded_minor,pricing_snapshot,expires_at,version,created_at,updated_at) values (${orderId},${orderNo},${[...merchantIds][0]!},'PENDING_PAYMENT','CNY',${serverSubtotal},${serverDiscount},0,${serverSubtotal-serverDiscount},0,${tx.json(snapshot as never)},${expiresAt},0,now(),now())`;
      for(const line of snapshot.lines){const sku=skuRows.find((row)=>row.id===line.skuId)!;await tx`insert into order_items (order_id,sku_id,title_snapshot,sku_snapshot,unit_price_minor,quantity,total_minor,created_at,updated_at) values (${orderId},${sku.id},${sku.product_title},${tx.json({title:sku.sku_title} as never)},${sku.price_minor},${line.quantity},${sku.price_minor*line.quantity},now(),now())`}
      await tx`insert into outbox_events (aggregate_type,aggregate_id,event_type,payload,occurred_at,attempts) values ('ORDER',${orderId},'order.created',${tx.json({orderId,orderNo} as never)},now(),0)`;
      return {ok:true,data:{orderId,orderNo,status:"PENDING_PAYMENT",inventoryState:"LOCKED",paymentExpiresInSeconds:900},requestId:randomUUID()};
    });
  }

  private sandboxOrder(){return {ok:true,data:{orderId:randomUUID(),orderNo:`BH${new Date().toISOString().slice(0,10).replaceAll("-","")}${Math.floor(100000+Math.random()*899999)}`,status:"PENDING_PAYMENT",inventoryState:"LOCKED",paymentExpiresInSeconds:900,sandbox:true},requestId:randomUUID()}}
  private verify(token:string):Snapshot{const [payload,signature]=token.split(".");if(!payload||!signature)throw new BadRequestException("结算预览已失效");const expected=createHmac("sha256",this.secret()).update(payload).digest();const actual=Buffer.from(signature,"base64url");if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw new BadRequestException("结算预览签名无效");const decoded=JSON.parse(Buffer.from(payload,"base64url").toString()) as Snapshot;if(Date.parse(decoded.expiresAt)<Date.now())throw new BadRequestException("结算预览已过期");return decoded}
}
