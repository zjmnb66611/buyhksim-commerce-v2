import { Body, Controller, Headers, HttpCode, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { checkoutPreviewRequestSchema, createOrderRequestSchema, idempotencyKeySchema } from "@buyhksim/contracts";
import { ZodValidationPipe } from "../../shared/zod-validation.pipe";
import { CheckoutService } from "./checkout.service";
import { JwtAuthGuard, type AuthenticatedUser } from "../auth/jwt-auth.guard";
@Controller("checkout") @UseGuards(JwtAuthGuard) export class CheckoutController { constructor(private readonly service:CheckoutService){} @Post("preview") @HttpCode(200) preview(@Req() req:Request&{user:AuthenticatedUser},@Body(new ZodValidationPipe(checkoutPreviewRequestSchema)) body:unknown){return this.service.preview(body as never,req.user.sub)} @Post("orders") create(@Req() req:Request&{user:AuthenticatedUser},@Headers("idempotency-key") key:string,@Body(new ZodValidationPipe(createOrderRequestSchema)) body:unknown){return this.service.createOrder(idempotencyKeySchema.parse(key),body as never,req.user.sub)} }
