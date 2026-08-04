import { Body, Controller, Headers, HttpCode, Param, Post, RawBodyRequest, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import { idempotencyKeySchema, paymentChannelSchema } from "@buyhksim/contracts";
import { JwtAuthGuard, type AuthenticatedUser } from "../auth/jwt-auth.guard";
import { PermissionsGuard, RequirePermissions } from "../auth/permissions.guard";
import { ZodValidationPipe } from "../../shared/zod-validation.pipe";
import { PaymentsService } from "./payments.service";

const createPaymentSchema=z.object({orderId:z.string().uuid(),channel:paymentChannelSchema});
const refundSchema=z.object({paymentId:z.string().uuid(),amountMinor:z.number().int().positive(),reason:z.string().trim().min(3).max(500)});

@Controller()
export class PaymentsController {
  constructor(private readonly service:PaymentsService){}
  @Post("payments") @UseGuards(JwtAuthGuard) create(@Req() request:Request&{user:AuthenticatedUser},@Headers("idempotency-key") key:string,@Body(new ZodValidationPipe(createPaymentSchema)) body:z.infer<typeof createPaymentSchema>){return this.service.create(idempotencyKeySchema.parse(key),body.orderId,body.channel,request.user.sub)}
  @Post("payment-webhooks/:channel") @HttpCode(200) webhook(@Param("channel") channel:string,@Headers("x-sandbox-signature") signature:string,@Body() body:Record<string,unknown>,@Req() request:RawBodyRequest<Request>){return this.service.webhook(paymentChannelSchema.parse(channel.toUpperCase()),signature,body,request.rawBody)}
  @Post("refunds") @UseGuards(JwtAuthGuard,PermissionsGuard) @RequirePermissions("finance.write") refund(@Req() request:Request&{user:AuthenticatedUser},@Headers("idempotency-key") key:string,@Body(new ZodValidationPipe(refundSchema)) body:z.infer<typeof refundSchema>){return this.service.refund(idempotencyKeySchema.parse(key),body,request.user.sub,request.user.merchantId??"")}
}
