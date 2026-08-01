import { Body, Controller, Headers, Param, Post, RawBodyRequest, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { idempotencyKeySchema, paymentChannelSchema } from "@buyhksim/contracts";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard, RequirePermissions } from "../auth/permissions.guard";
import { PaymentsService } from "./payments.service";

@Controller()
export class PaymentsController {
  constructor(private readonly service:PaymentsService){}
  @Post("payments") @UseGuards(JwtAuthGuard) create(@Headers("idempotency-key") key:string,@Body() body:{orderId:string;channel:string}){return this.service.create(idempotencyKeySchema.parse(key),body.orderId,paymentChannelSchema.parse(body.channel))}
  @Post("payment-webhooks/:channel") webhook(@Param("channel") channel:string,@Headers("x-sandbox-signature") signature:string,@Body() body:Record<string,unknown>,@Req() request:RawBodyRequest<Request>){return this.service.webhook(paymentChannelSchema.parse(channel.toUpperCase()),signature,body,request.rawBody)}
  @Post("refunds") @UseGuards(JwtAuthGuard,PermissionsGuard) @RequirePermissions("finance.write") refund(@Headers("idempotency-key") key:string,@Body() body:{paymentId:string;amountMinor:number;reason:string}){return this.service.refund(idempotencyKeySchema.parse(key),body)}
}
