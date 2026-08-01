import { Module } from "@nestjs/common"; import { DistributionController } from "./distribution.controller"; import { DistributionService } from "./distribution.service"; import { IdempotencyService } from "../../shared/idempotency.service";
@Module({controllers:[DistributionController],providers:[DistributionService,IdempotencyService]}) export class DistributionModule{}
