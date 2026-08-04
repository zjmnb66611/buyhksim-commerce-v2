import { Controller, Get, Inject, Optional, ServiceUnavailableException } from "@nestjs/common";
import type { Sql } from "postgres";
import { DB_CLIENT } from "../../shared/database.module";

@Controller("health")
export class HealthController{
  constructor(@Optional() @Inject(DB_CLIENT) private readonly client:Sql|null=null){}
  @Get("live") live(){return {ok:true,data:{status:"alive",service:"buyhksim-api",timestamp:new Date().toISOString()},requestId:"health-live"}}
  @Get() async ready(){if(!this.client){if(process.env.NODE_ENV==="production")throw new ServiceUnavailableException("数据库未配置");return {ok:true,data:{status:"ready",database:"sandbox",paymentMode:process.env.PAYMENT_MODE??"sandbox",timestamp:new Date().toISOString()},requestId:"health-ready"}}try{await this.client`select 1`;return {ok:true,data:{status:"ready",database:"connected",paymentMode:process.env.PAYMENT_MODE??"sandbox",timestamp:new Date().toISOString()},requestId:"health-ready"}}catch{throw new ServiceUnavailableException("数据库连接不可用")}}
}
