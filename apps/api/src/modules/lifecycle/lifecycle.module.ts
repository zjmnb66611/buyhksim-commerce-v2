import { Module } from "@nestjs/common";
import { OrderLifecycleService } from "./order-lifecycle.service";

@Module({providers:[OrderLifecycleService],exports:[OrderLifecycleService]})
export class LifecycleModule{}
