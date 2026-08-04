import { BadRequestException, ConflictException, Inject, Injectable, Optional } from "@nestjs/common";
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type { Sql, TransactionSql } from "postgres";
import type { z } from "zod";
import { checkoutPreviewRequestSchema, createOrderRequestSchema } from "@buyhksim/contracts";
import { DB_CLIENT } from "../../shared/database.module";
import { IdempotencyService } from "../../shared/idempotency.service";

type Preview=z.infer<typeof checkoutPreviewRequestSchema>;
type CreateOrder=z.infer<typeof createOrderRequestSchema>;
type AddressSnapshot={id:string;name:string;phoneEncrypted:string;country:string;province:string|null;city:string|null;district:string|null;detailEncrypted:string;postalCode:string|null};
type Snapshot={userId:string;lines:Preview["lines"];subtotalMinor:number;promotionDiscountMinor:number;couponDiscountMinor:number;pointsDiscountMinor:number;discountMinor:number;shippingMinor:number;totalMinor:number;currency:"CNY";couponId?:string;pointsUsed:number;address?:AddressSnapshot;expiresAt:string};
type SkuRow={id:string;price_minor:number;currency:string;merchant_id:string;product_title:string;sku_title:string;active:boolean;product_status:string;kind:"ESIM"|"PHYSICAL_SIM"};

const sandboxSkus:Record<string,{price:number;kind:"ESIM"|"PHYSICAL_SIM"}>={
  "5a1a1111-1111-4111-8111-111111111111":{price:5800,kind:"ESIM"},
  "5a1a2222-2222-4222-8222-222222222222":{price:6800,kind:"ESIM"},
  "5a1a3333-3333-4333-8333-333333333333":{price:19800,kind:"ESIM"},
  "5a1a4444-4444-4444-8444-444444444444":{price:4800,kind:"ESIM"},
  "5a1a5555-5555-4555-8555-555555555555":{price:3900,kind:"PHYSICAL_SIM"},
};

@Injectable()
export class CheckoutService {
  constructor(private readonly idem:IdempotencyService,@Optional() @Inject(DB_CLIENT) private readonly client:Sql|null=null){}
  private secret(){return process.env.PRICING_TOKEN_SECRET??process.env.JWT_ACCESS_SECRET??"development-only-pricing-secret"}

  async preview(input:Preview,userId="sandbox-user"){
    const skuRows=this.client?await this.loadAuthoritativeSkus(input.lines.map((line)=>line.skuId)):null;
    const price=(skuId:string)=>skuRows?.find((row)=>row.id===skuId)?.price_minor??sandboxSkus[skuId]?.price;
    const subtotal=input.lines.reduce((sum,line)=>{const unit=price(line.skuId);if(unit===undefined)throw new BadRequestException("商品已下架或不存在");return sum+unit*line.quantity},0);
    const promotionDiscount=subtotal>=20000?2000:0;
    const benefit=this.client?await this.loadBenefits(userId,input,subtotal-promotionDiscount):{couponId:input.couponCode?.toUpperCase()==="WELCOME20"?"sandbox-coupon":undefined,couponDiscount:input.couponCode?.toUpperCase()==="WELCOME20"?Math.min(2000,subtotal-promotionDiscount):0,pointsUsed:0,pointsDiscount:0};
    const containsPhysical=skuRows?skuRows.some((row)=>row.kind==="PHYSICAL_SIM"):input.lines.some((line)=>sandboxSkus[line.skuId]?.kind==="PHYSICAL_SIM");
    const address=this.client&&containsPhysical?await this.loadAddress(userId,input.addressId):undefined;
    if(containsPhysical&&!address)throw new BadRequestException("实体 SIM 订单必须选择收货地址");
    const shippingMinor=containsPhysical?1800:0;
    const discount=promotionDiscount+benefit.couponDiscount+benefit.pointsDiscount;
    const snapshot:Snapshot={userId,lines:input.lines,subtotalMinor:subtotal,promotionDiscountMinor:promotionDiscount,couponDiscountMinor:benefit.couponDiscount,pointsDiscountMinor:benefit.pointsDiscount,discountMinor:discount,shippingMinor,totalMinor:Math.max(0,subtotal+shippingMinor-discount),currency:"CNY",couponId:benefit.couponId,pointsUsed:benefit.pointsUsed,address,expiresAt:new Date(Date.now()+15*60_000).toISOString()};
    const payload=Buffer.from(JSON.stringify(snapshot)).toString("base64url");
    const signature=createHmac("sha256",this.secret()).update(payload).digest("base64url");
    return {ok:true,data:{...snapshot,previewToken:`${payload}.${signature}`},requestId:randomUUID()};
  }

  async createOrder(key:string,input:CreateOrder,userId="sandbox-user"){
    return this.idem.execute(`order:${userId}`,key,input,async()=>{
      const snapshot=this.verify(input.previewToken);
      if(snapshot.userId!==userId)throw new BadRequestException("结算预览不属于当前账户");
      if(JSON.stringify(snapshot.lines)!==JSON.stringify(input.lines))throw new BadRequestException("商品清单与结算预览不一致，请重新结算");
      if(!this.client)return this.sandboxOrder();
      return this.persistOrder(this.client,snapshot);
    });
  }

  private async loadAuthoritativeSkus(skuIds:string[]){
    const rows=await this.client!<SkuRow[]>`select s.id,s.price_minor,s.currency,s.active,p.merchant_id,p.title as product_title,s.title as sku_title,p.status as product_status,p.kind from skus s join products p on p.id=s.product_id where s.id in ${this.client!(skuIds)} and s.active=true and p.status='ACTIVE'`;
    if(rows.length!==new Set(skuIds).size)throw new BadRequestException("部分商品已下架或不存在");
    if(rows.some((row)=>row.currency!=="CNY"))throw new BadRequestException("当前结算不支持混合币种");
    return rows;
  }
  private async loadBenefits(userId:string,input:Preview,discountBase:number){
    const sql=this.client!;const users=await sql<{points:number}[]>`select points from users where id=${userId} and status='ACTIVE'`;const points=users[0]?.points;if(points===undefined)throw new BadRequestException("账户不存在或已停用");const maxPoints=Math.floor(discountBase*0.2);if(input.pointsToUse>points||input.pointsToUse>maxPoints)throw new BadRequestException(`本单最多可使用 ${Math.min(points,maxPoints)} 积分`);
    if(!input.couponCode)return {couponId:undefined,couponDiscount:0,pointsUsed:input.pointsToUse,pointsDiscount:input.pointsToUse};
    const coupons=await sql<{id:string;rule_snapshot:{amountMinor?:number}}[]>`select c.id,c.rule_snapshot from coupons c join coupon_claims cc on cc.coupon_id=c.id where cc.user_id=${userId} and cc.status='AVAILABLE' and upper(c.code)=upper(${input.couponCode}) and c.starts_at<=now() and c.ends_at>now() limit 1`;
    const coupon=coupons[0];if(!coupon)throw new BadRequestException("优惠券无效、已使用或已过期");const amount=Math.max(0,Math.min(Number(coupon.rule_snapshot.amountMinor??0),discountBase-input.pointsToUse));return {couponId:coupon.id,couponDiscount:amount,pointsUsed:input.pointsToUse,pointsDiscount:input.pointsToUse};
  }
  private async loadAddress(userId:string,addressId?:string){if(!addressId)return undefined;const rows=await this.client!<Array<{id:string;name:string;phone_encrypted:string;country:string;province:string|null;city:string|null;district:string|null;detail_encrypted:string;postal_code:string|null}>>`select id,name,phone_encrypted,country,province,city,district,detail_encrypted,postal_code from addresses where id=${addressId} and user_id=${userId}`;const row=rows[0];if(!row)throw new BadRequestException("收货地址不存在");return {id:row.id,name:row.name,phoneEncrypted:row.phone_encrypted,country:row.country,province:row.province,city:row.city,district:row.district,detailEncrypted:row.detail_encrypted,postalCode:row.postal_code}}

  private async persistOrder(client:Sql,snapshot:Snapshot){
    return client.begin(async(tx)=>{
      const skuIds=snapshot.lines.map((line)=>line.skuId);
      const skuRows=await tx<SkuRow[]>`select s.id,s.price_minor,s.currency,s.active,p.merchant_id,p.title as product_title,s.title as sku_title,p.status as product_status,p.kind from skus s join products p on p.id=s.product_id where s.id in ${tx(skuIds)} for update`;
      if(skuRows.length!==skuIds.length||skuRows.some((row)=>!row.active||row.product_status!=="ACTIVE"))throw new ConflictException("商品状态已变化，请重新结算");
      const serverSubtotal=snapshot.lines.reduce((sum,line)=>sum+skuRows.find((row)=>row.id===line.skuId)!.price_minor*line.quantity,0);
      const serverPromotion=serverSubtotal>=20000?2000:0;
      if(serverSubtotal!==snapshot.subtotalMinor||serverPromotion!==snapshot.promotionDiscountMinor)throw new ConflictException("价格或优惠已变化，请重新结算");
      const merchantIds=new Set(skuRows.map((row)=>row.merchant_id));if(merchantIds.size!==1)throw new BadRequestException("跨商户商品需要拆分结算");
      if(snapshot.pointsUsed>0){const updated=await tx<{id:string}[]>`update users set points=points-${snapshot.pointsUsed},updated_at=now() where id=${snapshot.userId} and points>=${snapshot.pointsUsed} returning id`;if(!updated.length)throw new ConflictException("积分余额已变化，请重新结算")}
      if(snapshot.couponId&&snapshot.couponId!=="sandbox-coupon"){const claimed=await tx<{coupon_id:string}[]>`update coupon_claims set status='USED',used_at=now() where coupon_id=${snapshot.couponId} and user_id=${snapshot.userId} and status='AVAILABLE' returning coupon_id`;if(!claimed.length)throw new ConflictException("优惠券状态已变化，请重新结算")}
      const orderId=randomUUID();const orderNo=this.orderNo();const expiresAt=new Date(Date.parse(snapshot.expiresAt));
      await tx`insert into orders (id,order_no,user_id,merchant_id,status,currency,subtotal_minor,discount_minor,shipping_minor,total_minor,refunded_minor,address_snapshot,pricing_snapshot,expires_at,version,created_at,updated_at) values (${orderId},${orderNo},${snapshot.userId},${[...merchantIds][0]!},'PENDING_PAYMENT','CNY',${serverSubtotal},${snapshot.discountMinor},${snapshot.shippingMinor},${snapshot.totalMinor},0,${snapshot.address?tx.json(snapshot.address as never):null},${tx.json(snapshot as never)},${expiresAt},0,now(),now())`;
      for(const line of snapshot.lines){const sku=skuRows.find((row)=>row.id===line.skuId)!;await this.reserveAcrossWarehouses(tx,orderId,line.skuId,line.quantity,expiresAt);await tx`insert into order_items (order_id,sku_id,title_snapshot,sku_snapshot,unit_price_minor,quantity,total_minor,created_at,updated_at) values (${orderId},${sku.id},${sku.product_title},${tx.json({title:sku.sku_title,kind:sku.kind} as never)},${sku.price_minor},${line.quantity},${sku.price_minor*line.quantity},now(),now())`}
      if(snapshot.pointsUsed>0)await tx`insert into point_ledger (user_id,change,balance_after,reason,reference_type,reference_id,created_at) select id,${-snapshot.pointsUsed},points,'ORDER_DEDUCTION','ORDER',${orderId},now() from users where id=${snapshot.userId}`;
      if(snapshot.couponId&&snapshot.couponId!=="sandbox-coupon")await tx`update coupon_claims set order_id=${orderId} where coupon_id=${snapshot.couponId} and user_id=${snapshot.userId}`;
      await tx`insert into outbox_events (aggregate_type,aggregate_id,event_type,payload,occurred_at,attempts) values ('ORDER',${orderId},'order.created',${tx.json({orderId,orderNo} as never)},now(),0)`;
      return {ok:true,data:{orderId,orderNo,status:"PENDING_PAYMENT",inventoryState:"LOCKED",paymentExpiresInSeconds:Math.max(0,Math.floor((expiresAt.getTime()-Date.now())/1000))},requestId:randomUUID()};
    });
  }
  private async reserveAcrossWarehouses(tx:TransactionSql,orderId:string,skuId:string,quantity:number,expiresAt:Date){const stocks=await tx<Array<{warehouse_id:string;available:number}>>`select i.warehouse_id,i.available from inventory i join warehouses w on w.id=i.warehouse_id join skus s on s.id=i.sku_id join products p on p.id=s.product_id where i.sku_id=${skuId} and w.merchant_id=p.merchant_id and i.available>0 order by i.available desc for update`;let remaining=quantity;for(const stock of stocks){if(remaining<=0)break;const take=Math.min(remaining,stock.available);await tx`update inventory set available=available-${take},locked=locked+${take},version=version+1,updated_at=now() where sku_id=${skuId} and warehouse_id=${stock.warehouse_id} and available>=${take}`;await tx`insert into inventory_reservations (order_id,sku_id,warehouse_id,quantity,status,expires_at,created_at,updated_at) values (${orderId},${skuId},${stock.warehouse_id},${take},'LOCKED',${expiresAt},now(),now())`;remaining-=take}if(remaining>0)throw new ConflictException("库存不足，请调整数量后重试")}
  private orderNo(){return `BH${new Date().toISOString().slice(2,10).replaceAll("-","")}${randomBytes(6).toString("hex").toUpperCase()}`}
  private sandboxOrder(){return {ok:true,data:{orderId:randomUUID(),orderNo:this.orderNo(),status:"PENDING_PAYMENT",inventoryState:"LOCKED",paymentExpiresInSeconds:900,sandbox:true},requestId:randomUUID()}}
  private verify(token:string):Snapshot{const [payload,signature]=token.split(".");if(!payload||!signature)throw new BadRequestException("结算预览已失效");const expected=createHmac("sha256",this.secret()).update(payload).digest();const actual=Buffer.from(signature,"base64url");if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw new BadRequestException("结算预览签名无效");let decoded:Snapshot;try{decoded=JSON.parse(Buffer.from(payload,"base64url").toString()) as Snapshot}catch{throw new BadRequestException("结算预览内容无效")};if(!decoded.userId||!Array.isArray(decoded.lines)||Date.parse(decoded.expiresAt)<Date.now())throw new BadRequestException("结算预览已过期");return decoded}
}
