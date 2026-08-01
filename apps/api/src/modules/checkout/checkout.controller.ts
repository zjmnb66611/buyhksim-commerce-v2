import { Body, Controller, Headers, HttpCode, Post } from "@nestjs/common";
import { checkoutPreviewRequestSchema, createOrderRequestSchema, idempotencyKeySchema } from "@buyhksim/contracts";
import { ZodValidationPipe } from "../../shared/zod-validation.pipe";
import { CheckoutService } from "./checkout.service";
@Controller("checkout") export class CheckoutController { constructor(private readonly service:CheckoutService){} @Post("preview") @HttpCode(200) preview(@Body(new ZodValidationPipe(checkoutPreviewRequestSchema)) body:unknown){return this.service.preview(body as never)} @Post("orders") create(@Headers("idempotency-key") key:string,@Body(new ZodValidationPipe(createOrderRequestSchema)) body:unknown){return this.service.createOrder(idempotencyKeySchema.parse(key),body as never)} }
