import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { HealthModule } from "./modules/health/health.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { CheckoutModule } from "./modules/checkout/checkout.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { ImportsModule } from "./modules/imports/imports.module";
import { AiModule } from "./modules/ai/ai.module";
import { DatabaseModule } from "./shared/database.module";
import { AuthModule } from "./modules/auth/auth.module";
import { DistributionModule } from "./modules/distribution/distribution.module";
import { CustomerModule } from "./modules/customer/customer.module";
import { LifecycleModule } from "./modules/lifecycle/lifecycle.module";
import { CmsModule } from "./modules/cms/cms.module";
import { OperationsModule } from "./modules/operations/operations.module";
import { BusinessModule } from "./modules/business/business.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 120 }]),
    DatabaseModule, AuthModule, HealthModule, CatalogModule, CheckoutModule,
    PaymentsModule, ImportsModule, DistributionModule, CustomerModule, LifecycleModule, CmsModule, OperationsModule, BusinessModule, AiModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
