import { Inject, Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown, Optional } from "@nestjs/common";
import type { Sql, TransactionSql } from "postgres";
import { DB_CLIENT } from "../../shared/database.module";

type ExpiredOrder={id:string;user_id:string|null;pricing_snapshot:{pointsUsed?:number;couponId?:string}};

@Injectable()
export class OrderLifecycleService implements OnApplicationBootstrap,OnApplicationShutdown{
  private readonly logger=new Logger(OrderLifecycleService.name);
  private timer?:NodeJS.Timeout;
  private running=false;
  constructor(@Optional() @Inject(DB_CLIENT) private readonly client:Sql|null=null){}

  onApplicationBootstrap(){
    if(process.env.ENABLE_WORKERS!=="true")return;
    if(!this.client)throw new Error("ENABLE_WORKERS=true 时必须配置 DATABASE_URL");
    this.timer=setInterval(()=>void this.tick(),10_000);
    this.timer.unref();
    void this.tick();
  }
  onApplicationShutdown(){if(this.timer)clearInterval(this.timer)}

  async closeExpiredOrders(limit=50){
    if(!this.client)return 0;
    return this.client.begin(async(tx)=>{
      const orders=await tx<ExpiredOrder[]>`select id,user_id,pricing_snapshot from orders where status='PENDING_PAYMENT' and expires_at<=now() order by expires_at for update skip locked limit ${limit}`;
      for(const order of orders)await this.closeOne(tx,order);
      return orders.length;
    });
  }

  private async closeOne(tx:TransactionSql,order:ExpiredOrder){
    const reservations=await tx<Array<{id:string;sku_id:string;warehouse_id:string;quantity:number}>>`select id,sku_id,warehouse_id,quantity from inventory_reservations where order_id=${order.id} and status='LOCKED' for update`;
    for(const reservation of reservations){
      const updated=await tx<{sku_id:string}[]>`update inventory set available=available+${reservation.quantity},locked=locked-${reservation.quantity},version=version+1,updated_at=now() where sku_id=${reservation.sku_id} and warehouse_id=${reservation.warehouse_id} and locked>=${reservation.quantity} returning sku_id`;
      if(!updated.length)throw new Error(`订单 ${order.id} 的库存锁定量不一致`);
      await tx`update inventory_reservations set status='RELEASED',updated_at=now() where id=${reservation.id}`;
    }
    const pointsUsed=Number(order.pricing_snapshot?.pointsUsed??0);
    if(order.user_id&&Number.isSafeInteger(pointsUsed)&&pointsUsed>0){
      const users=await tx<{points:number}[]>`update users set points=points+${pointsUsed},updated_at=now() where id=${order.user_id} returning points`;
      if(users[0])await tx`insert into point_ledger (user_id,change,balance_after,reason,reference_type,reference_id,created_at) values (${order.user_id},${pointsUsed},${users[0].points},'ORDER_EXPIRED_RETURN','ORDER',${order.id},now())`;
    }
    const couponId=order.pricing_snapshot?.couponId;
    if(order.user_id&&couponId&&couponId!=="sandbox-coupon")await tx`update coupon_claims set status='AVAILABLE',used_at=null,order_id=null where coupon_id=${couponId} and user_id=${order.user_id} and order_id=${order.id} and status='USED'`;
    await tx`update payments set status='CLOSED',updated_at=now() where order_id=${order.id} and status in ('CREATED','PENDING')`;
    await tx`update orders set status='CLOSED',version=version+1,updated_at=now() where id=${order.id} and status='PENDING_PAYMENT'`;
    await tx`insert into outbox_events (aggregate_type,aggregate_id,event_type,payload,occurred_at,attempts) values ('ORDER',${order.id},'order.closed',${tx.json({orderId:order.id,reason:'PAYMENT_TIMEOUT'} as never)},now(),0)`;
  }

  private async tick(){
    if(this.running)return;
    this.running=true;
    try{let count=0;do{count=await this.closeExpiredOrders();}while(count===50)}catch(error){this.logger.error("订单超时任务执行失败",error instanceof Error?error.stack:String(error))}finally{this.running=false}
  }
}
