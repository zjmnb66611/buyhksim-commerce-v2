import { BadRequestException, ConflictException, Inject, Injectable, Optional, UnauthorizedException } from "@nestjs/common";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { Sql } from "postgres";
import type { PaymentChannel } from "@buyhksim/contracts";
import { DB_CLIENT } from "../../shared/database.module";
import { IdempotencyService } from "../../shared/idempotency.service";

type WebhookPayload={merchantId:string;orderNo:string;amountMinor:number;currency:string;transactionId:string};
type OrderRow={id:string;order_no:string;merchant_id:string;status:string;total_minor:number;refunded_minor:number;currency:string};

@Injectable()
export class PaymentsService {
  constructor(private readonly idem:IdempotencyService,@Optional() @Inject(DB_CLIENT) private readonly client:Sql|null=null){}

  async create(key:string,orderId:string,channel:PaymentChannel){
    return this.idem.execute("payment",key,{orderId,channel},async()=>{
      const paymentId=randomUUID();
      if(this.client){const orders=await this.client<OrderRow[]>`select id,order_no,merchant_id,status,total_minor,refunded_minor,currency from orders where id=${orderId}`;const order=orders[0];if(!order)throw new BadRequestException("订单不存在");if(order.status!=="PENDING_PAYMENT")throw new ConflictException("订单当前状态不可支付");await this.client`insert into payments (id,order_id,channel,status,amount_minor,currency,raw_metadata,created_at,updated_at) values (${paymentId},${orderId},${channel},'PENDING',${order.total_minor},${order.currency},${this.client.json({sandbox:true} as never)},now(),now())`;}
      return {ok:true,data:{paymentId,orderId,channel,status:"PENDING",sandbox:true,redirectUrl:`/sandbox-pay/${channel.toLowerCase()}?order=${encodeURIComponent(orderId)}`},requestId:randomUUID()};
    });
  }

  async webhook(channel:PaymentChannel,signature:string,payload:Record<string,unknown>,rawPayload?:Buffer){
    this.verifySignature(signature,payload,rawPayload);
    const parsed=this.parseWebhook(payload);
    if(!this.client)return {ok:true,data:{accepted:true,channel,eventId:parsed.transactionId,reentrant:true,sandbox:true},requestId:randomUUID()};
    return this.client.begin(async(tx)=>{
      const duplicate=await tx<{id:string}[]>`select id from payments where channel=${channel} and channel_transaction_id=${parsed.transactionId}`;
      if(duplicate.length)return {ok:true,data:{accepted:true,duplicate:true,channel,eventId:parsed.transactionId,reentrant:true},requestId:randomUUID()};
      const orders=await tx<OrderRow[]>`select id,order_no,merchant_id,status,total_minor,refunded_minor,currency from orders where order_no=${parsed.orderNo} for update`;
      const order=orders[0];
      if(!order||order.merchant_id!==parsed.merchantId||order.total_minor!==parsed.amountMinor||order.currency!==parsed.currency)throw new BadRequestException("支付回调与订单信息不匹配");
      if(order.status!=="PENDING_PAYMENT")throw new ConflictException("晚到支付回调已进入异常处理队列");
      const paymentRows=await tx<{id:string}[]>`select id from payments where order_id=${order.id} and channel=${channel} and status='PENDING' order by created_at desc limit 1 for update`;
      const paymentId=paymentRows[0]?.id??randomUUID();
      if(paymentRows.length)await tx`update payments set status='SUCCEEDED',channel_transaction_id=${parsed.transactionId},raw_metadata=${tx.json({verified:true} as never)},updated_at=now() where id=${paymentId}`;
      else await tx`insert into payments (id,order_id,channel,status,amount_minor,currency,channel_transaction_id,raw_metadata,created_at,updated_at) values (${paymentId},${order.id},${channel},'SUCCEEDED',${order.total_minor},${order.currency},${parsed.transactionId},${tx.json({verified:true,lateCreate:true} as never)},now(),now())`;
      await tx`update orders set status='PAID',version=version+1,updated_at=now() where id=${order.id} and status='PENDING_PAYMENT'`;
      await tx`insert into outbox_events (aggregate_type,aggregate_id,event_type,payload,occurred_at,attempts) values ('ORDER',${order.id},'payment.succeeded',${tx.json({orderId:order.id,paymentId,channel} as never)},now(),0)`;
      return {ok:true,data:{accepted:true,duplicate:false,channel,eventId:parsed.transactionId,reentrant:true},requestId:randomUUID()};
    });
  }

  async refund(key:string,input:{paymentId:string;amountMinor:number;reason:string}){
    if(!Number.isSafeInteger(input.amountMinor)||input.amountMinor<=0)throw new BadRequestException("退款金额无效");
    return this.idem.execute("refund",key,input,async()=>{
      const refundId=randomUUID();
      if(this.client)await this.client.begin(async(tx)=>{const rows=await tx<(OrderRow&{payment_status:string})[]>`select o.id,o.order_no,o.merchant_id,o.status,o.total_minor,o.refunded_minor,o.currency,p.status as payment_status from payments p join orders o on o.id=p.order_id where p.id=${input.paymentId} for update`;const order=rows[0];if(!order||order.payment_status!=="SUCCEEDED")throw new BadRequestException("支付不存在或尚未成功");if(input.amountMinor>order.total_minor-order.refunded_minor)throw new ConflictException("退款金额超过剩余可退金额");await tx`insert into refunds (id,order_id,payment_id,amount_minor,reason,status,created_at,updated_at) values (${refundId},${order.id},${input.paymentId},${input.amountMinor},${input.reason},'PENDING',now(),now())`;await tx`insert into outbox_events (aggregate_type,aggregate_id,event_type,payload,occurred_at,attempts) values ('REFUND',${refundId},'refund.requested',${tx.json({refundId,orderId:order.id,amountMinor:input.amountMinor} as never)},now(),0)`;});
      return {ok:true,data:{refundId,status:"PENDING",sandbox:true},requestId:randomUUID()};
    });
  }

  private verifySignature(signature:string,payload:Record<string,unknown>,rawPayload?:Buffer){const body=rawPayload??Buffer.from(JSON.stringify(payload));const expected=createHmac("sha256",process.env.PAYMENT_SANDBOX_WEBHOOK_SECRET??"sandbox-webhook-secret").update(body).digest();const actual=/^[a-f0-9]{64}$/i.test(signature||"")?Buffer.from(signature,"hex"):Buffer.alloc(0);if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw new UnauthorizedException("支付回调签名无效")}
  private parseWebhook(payload:Record<string,unknown>):WebhookPayload{for(const field of ["merchantId","orderNo","amountMinor","currency","transactionId"]){if(payload[field]===undefined)throw new BadRequestException(`支付回调缺少 ${field}`)}const parsed=payload as WebhookPayload;if(!Number.isSafeInteger(parsed.amountMinor)||parsed.amountMinor<=0)throw new BadRequestException("支付回调金额无效");return parsed}
}
