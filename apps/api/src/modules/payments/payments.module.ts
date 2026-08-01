import { Module } from "@nestjs/common"; import { PaymentsController } from "./payments.controller"; import { PaymentsService } from "./payments.service"; import { IdempotencyService } from "../../shared/idempotency.service";
@Module({controllers:[PaymentsController],providers:[PaymentsService,IdempotencyService]}) export class PaymentsModule{}
