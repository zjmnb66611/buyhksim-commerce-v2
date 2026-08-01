import { Module } from "@nestjs/common"; import { ImportsController } from "./imports.controller"; import { ImportsService } from "./imports.service"; import { IdempotencyService } from "../../shared/idempotency.service";
@Module({controllers:[ImportsController],providers:[ImportsService,IdempotencyService]}) export class ImportsModule{}
