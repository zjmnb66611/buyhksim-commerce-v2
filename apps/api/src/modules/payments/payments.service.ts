import { BadRequestException, ConflictException, Inject, Injectable, Optional, UnauthorizedException } from "@nestjs/common";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { Sql } from "postgres";
import type { PaymentChannel } from "@buyhksim/contracts";
import { DB_CLIENT } from "../../shared/database.module";
import { IdempotencyService } from "../../shared/idempotency.service";

type WebhookPayload={merchantId:string;orderNo:string;amountMinor:number;currency:string;transactionId:string};
type OrderRow={id:string;order_no:string;user_id:string|null;merchant_id:string;status:string;total_minor:number;refunded_minor:number;currency:string;expires_at:Date};

@Injectable()
export class PaymentsService {
  constructor(private readonly idem:IdempotencyService,@Optional() @Inject(DB_CLIENT) private readonly client:Sql|null=null){}

  async create(key:string,orderId:string,channel:PaymentChannel,userId:string){
    return this.idem.execute(`payment:${userId}`,key,{orderId,channel},async()=>{
      let paymentId:string=randomUUID();
      if(this.client)paymentId=await this.client.begin(async(tx)=>{const orders=await tx<OrderRow[]>`select id,order_no,user_id,merchant_id,status,total_minor,refunded_minor,currency,expires_at from orders where id=${orderId} for update`;const order=orders[0];if(!order||order.user_id!==userId)throw new BadRequestException("订单不存在");if(order.status!=="PENDING_PAYMENT")throw new ConflictException("订单当前状态不可支付");if(order.expires_at<=new Date())throw new ConflictException("订单已超过支付有效期，请重新下单");const existing=await tx<{id:string}[]>`select id from payments where order_id=${orderId} and channel=${channel} and status='PENDING' order by created_at desc limit 1`;if(existing[0])return existing[0].id;const id=randomUUID();await tx`insert into payments (id,order_id,channel,status,amount_minor,currency,raw_metadata,created_at,updated_at) values (${id},${orderId},${channel},'PENDING',${order.total_minor},${order.currency},${tx.json({sandbox:true} as never)},now(),now())`;return id});
      return {ok:true,data:{paymentId,orderId,channel,status:"PENDING",sandbox:true,redirectUrl:`/sandbox-pay/${channel.toLowerCase()}?order=${encodeURIComponent(orderId)}`},requestId:randomUUID()};
    });
  }

  async webhook(channel:PaymentChannel,signature:string,payload:Record<string,unknown>,rawPayload?:Buffer){
    this.verifySignature(signature,payload,rawPayload);
    const parsed=this.parseWebhook(payload);
    if(!this.client)return {ok:true,data:{accepted:true,channel,eventId:parsed.transactionId,reentrant:true,sandbox:true},requestId:randomUUID()};
    return this.client.begin(async(tx)=>{
      await tx`select pg_advisory_xact_lock(hashtext(${`${channel}:${parsed.transactionId}`}))`;
      const duplicate=await tx<{id:string}[]>`select id from payments where channel=${channel} and channel_transaction_id=${parsed.transactionId}`;
      if(duplicate.length)return {ok:true,data:{accepted:true,duplicate:true,channel,eventId:parsed.transactionId,reentrant:true},requestId:randomUUID()};
      const orders=await tx<OrderRow[]>`select id,order_no,user_id,merchant_id,status,total_minor,refunded_minor,currency,expires_at from orders where order_no=${parsed.orderNo} for update`;
      const order=orders[0];
      if(!order||order.merchant_id!==parsed.merchantId||order.total_minor!==parsed.amountMinor||order.currency!==parsed.currency)throw new BadRequestException("支付回调与订单信息不匹配");
      if(order.status!=="PENDING_PAYMENT"){
        await tx`insert into outbox_events (aggregate_type,aggregate_id,event_type,payload,occurred_at,attempts) values ('ORDER',${order.id},'payment.late_or_out_of_order',${tx.json({orderId:order.id,channel,transactionId:parsed.transactionId,orderStatus:order.status} as never)},now(),0)`;
        return {ok:true,data:{accepted:true,duplicate:false,anomaly:true,channel,eventId:parsed.transactionId,reentrant:true},requestId:randomUUID()};
      }
      const paymentRows=await tx<{id:string}[]>`select id from payments where order_id=${order.id} and channel=${channel} and status='PENDING' order by created_at desc limit 1 for update`;
      const paymentId=paymentRows[0]?.id??randomUUID();
      if(paymentRows.length)await tx`update payments set status='SUCCEEDED',channel_transaction_id=${parsed.transactionId},raw_metadata=${tx.json({verified:true} as never)},updated_at=now() where id=${paymentId}`;
      else await tx`insert into payments (id,order_id,channel,status,amount_minor,currency,channel_transaction_id,raw_metadata,created_at,updated_at) values (${paymentId},${order.id},${channel},'SUCCEEDED',${order.total_minor},${order.currency},${parsed.transactionId},${tx.json({verified:true,lateCreate:true} as never)},now(),now())`;
      await tx`update orders set status='PAID',version=version+1,updated_at=now() where id=${order.id} and status='PENDING_PAYMENT'`;
      const reservations=await tx<Array<{id:string;sku_id:string;warehouse_id:string;quantity:number}>>`select id,sku_id,warehouse_id,quantity from inventory_reservations where order_id=${order.id} and status='LOCKED' for update`;
      for(const reservation of reservations){const updated=await tx<{sku_id:string}[]>`update inventory set locked=locked-${reservation.quantity},sold=sold+${reservation.quantity},version=version+1,updated_at=now() where sku_id=${reservation.sku_id} and warehouse_id=${reservation.warehouse_id} and locked>=${reservation.quantity} returning sku_id`;if(!updated.length)throw new ConflictException("库存锁定状态异常，支付已转人工核对");await tx`update inventory_reservations set status='SOLD',updated_at=now() where id=${reservation.id}`;}
      await tx`insert into outbox_events (aggregate_type,aggregate_id,event_type,payload,occurred_at,attempts) values ('ORDER',${order.id},'payment.succeeded',${tx.json({orderId:order.id,paymentId,channel} as never)},now(),0)`;
      return {ok:true,data:{accepted:true,duplicate:false,channel,eventId:parsed.transactionId,reentrant:true},requestId:randomUUID()};
    });
  }

  async refund(key:string,input:{paymentId:string;amountMinor:number;reason:string},actorId:string,merchantId:string){
    if(!Number.isSafeInteger(input.amountMinor)||input.amountMinor<=0)throw new BadRequestException("退款金额无效");
    return this.idem.execute(`refund:${merchantId}:${actorId}`,key,input,async()=>{
      const refundId=randomUUID();
      if(this.client)await this.client.begin(async(tx)=>{const rows=await tx<(OrderRow&{payment_status:string})[]>`select o.id,o.order_no,o.user_id,o.merchant_id,o.status,o.total_minor,o.refunded_minor,o.currency,o.expires_at,p.status as payment_status from payments p join orders o on o.id=p.order_id where p.id=${input.paymentId} for update`;const order=rows[0];if(!order||order.payment_status!=="SUCCEEDED"||order.merchant_id!==merchantId)throw new BadRequestException("支付不存在或尚未成功");const pending=await tx<{amount:number}[]>`select coalesce(sum(amount_minor),0)::int as amount from refunds where order_id=${order.id} and status in ('PENDING','PROCESSING','SUCCEEDED')`;const reserved=pending[0]?.amount??0;if(input.amountMinor>order.total_minor-reserved)throw new ConflictException("退款金额超过剩余可退金额");await tx`insert into refunds (id,order_id,payment_id,amount_minor,reason,status,created_at,updated_at) values (${refundId},${order.id},${input.paymentId},${input.amountMinor},${input.reason},'PENDING',now(),now())`;await tx`insert into audit_logs (actor_id,merchant_id,action,target_type,target_id,request_id,after,created_at) values (${actorId},${merchantId},'refund.request','REFUND',${refundId},${randomUUID()},${tx.json({orderId:order.id,amountMinor:input.amountMinor,reason:input.reason} as never)},now())`;await tx`insert into outbox_events (aggregate_type,aggregate_id,event_type,payload,occurred_at,attempts) values ('REFUND',${refundId},'refund.requested',${tx.json({refundId,orderId:order.id,amountMinor:input.amountMinor} as never)},now(),0)`;});
      return {ok:true,data:{refundId,status:"PENDING",sandbox:true},requestId:randomUUID()};
    });
  }

  private verifySignature(signature:string,payload:Record<string,unknown>,rawPayload?:Buffer){const body=rawPayload??Buffer.from(JSON.stringify(payload));const expected=createHmac("sha256",process.env.PAYMENT_SANDBOX_WEBHOOK_SECRET??"sandbox-webhook-secret").update(body).digest();const actual=/^[a-f0-9]{64}$/i.test(signature||"")?Buffer.from(signature,"hex"):Buffer.alloc(0);if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw new UnauthorizedException("支付回调签名无效")}
  private parseWebhook(payload:Record<string,unknown>):WebhookPayload{for(const field of ["merchantId","orderNo","amountMinor","currency","transactionId"]){if(payload[field]===undefined)throw new BadRequestException(`支付回调缺少 ${field}`)}const parsed=payload as WebhookPayload;if(!Number.isSafeInteger(parsed.amountMinor)||parsed.amountMinor<=0)throw new BadRequestException("支付回调金额无效");return parsed}
}
