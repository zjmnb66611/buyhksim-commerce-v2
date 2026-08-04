import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { ApiExceptionFilter } from "./shared/api-exception.filter";

async function bootstrap() {
  if (process.env.NODE_ENV === "production") {
    for (const name of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "PRICING_TOKEN_SECRET", "PAYMENT_SANDBOX_WEBHOOK_SECRET"]) {
      const value = process.env[name] ?? "";
      if (value.length < 32 || value.includes("development-only") || value.includes("sandbox-webhook-secret")) throw new Error(`${name} 必须配置为至少 32 位的生产密钥`);
    }
    for(const name of ["DATABASE_URL","CORS_ORIGINS"]){if(!(process.env[name]??"").trim())throw new Error(`${name} 是生产环境必填配置`)}
    const piiKey=Buffer.from(process.env.PII_ENCRYPTION_KEY??"","base64");
    if(piiKey.length!==32)throw new Error("PII_ENCRYPTION_KEY 必须是 Base64 编码的 32 字节密钥");
  }
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true, rawBody: true });
  app.setGlobalPrefix("api/v1");
  const configuredOrigins=(process.env.CORS_ORIGINS??"").split(",").map((value)=>value.trim()).filter(Boolean);
  const localOrigins=["http://127.0.0.1:3100","http://127.0.0.1:3101","http://localhost:3100","http://localhost:3101","http://localhost:3000","http://localhost:3001"];
  const allowedOrigins=new Set(process.env.NODE_ENV==="production"?configuredOrigins:[...configuredOrigins,...localOrigins]);
  app.enableCors({ origin:(origin,callback)=>{if(!origin||allowedOrigins.has(origin))return callback(null,true);callback(new Error("CORS origin denied"),false)}, credentials: true, methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], allowedHeaders:["Authorization","Content-Type","Idempotency-Key","X-Request-Id","X-Sandbox-Signature","X-Client-Type"] });
  app.use(helmet({ contentSecurityPolicy:{directives:{defaultSrc:["'none'"],frameAncestors:["'none'"],baseUri:["'none'"],formAction:["'none'"]}},crossOriginResourcePolicy:{policy:"same-site"},strictTransportSecurity:process.env.NODE_ENV==="production"?{maxAge:31_536_000,includeSubDomains:true,preload:true}:false,referrerPolicy:{policy:"no-referrer"} }));
  app.useBodyParser("json", { limit: "1mb" });
  app.useBodyParser("urlencoded", { limit: "256kb", extended: false });
  app.getHttpAdapter().getInstance().disable("x-powered-by");
  app.use((req: Request & { requestId?: string }, res: Response, next: NextFunction) => { const id = String(req.header("x-request-id") ?? randomUUID()); req.requestId = id; res.setHeader("x-request-id", id); next(); });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 4000, "0.0.0.0");
}
void bootstrap();
