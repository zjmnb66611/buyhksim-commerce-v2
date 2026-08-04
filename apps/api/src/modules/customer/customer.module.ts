import { Module } from "@nestjs/common";
import { EncryptionService } from "../../shared/encryption.service";
import { CustomerController } from "./customer.controller";
import { CustomerService } from "./customer.service";
@Module({controllers:[CustomerController],providers:[CustomerService,EncryptionService],exports:[CustomerService]}) export class CustomerModule{}
