import { Controller, Get } from "@nestjs/common";
@Controller("health") export class HealthController { @Get() getHealth(){return {ok:true,data:{status:"ready",service:"buyhksim-api",paymentMode:process.env.PAYMENT_MODE??"sandbox",timestamp:new Date().toISOString()},requestId:"health"}} }
