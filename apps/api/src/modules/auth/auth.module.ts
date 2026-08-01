import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { PermissionsGuard } from "./permissions.guard";

@Global()
@Module({
  imports: [JwtModule.register({ global: true, secret: process.env.JWT_ACCESS_SECRET ?? "development-only-secret-change-before-production", signOptions: { issuer: "buyhksim-api", audience: "buyhksim-clients" } })],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, PermissionsGuard],
  exports: [AuthService, JwtAuthGuard, PermissionsGuard],
})
export class AuthModule {}
