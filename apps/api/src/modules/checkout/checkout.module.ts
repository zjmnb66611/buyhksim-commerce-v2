import { Module } from "@nestjs/common"; import { CheckoutController } from "./checkout.controller"; import { CheckoutService } from "./checkout.service"; import { IdempotencyService } from "../../shared/idempotency.service";
@Module({controllers:[CheckoutController],providers:[CheckoutService,IdempotencyService]}) export class CheckoutModule{}
