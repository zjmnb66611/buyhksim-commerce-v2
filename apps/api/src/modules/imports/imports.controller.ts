import { Body, Controller, Headers, Post, Req, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Express } from "express";
import { idempotencyKeySchema } from "@buyhksim/contracts";
import type { Request } from "express";
import { z } from "zod";
import { JwtAuthGuard, type AuthenticatedUser } from "../auth/jwt-auth.guard";
import { PermissionsGuard, RequirePermissions } from "../auth/permissions.guard";
import { ImportsService } from "./imports.service";
import { ZodValidationPipe } from "../../shared/zod-validation.pipe";
const commitSchema=z.object({jobId:z.string().uuid()});

@Controller("admin/imports")
@UseGuards(JwtAuthGuard,PermissionsGuard)
@RequirePermissions("catalog.write")
export class ImportsController {
  constructor(private readonly service:ImportsService){}
  @Post("products/validate")
  @UseInterceptors(FileInterceptor("file",{limits:{fileSize:20*1024*1024,files:1},fileFilter:(_request,file,callback)=>callback(null,/\.(csv|xlsx)$/i.test(file.originalname))}))
  validate(@Req() request:Request&{user:AuthenticatedUser},@Headers("idempotency-key") key:string,@UploadedFile() file:Express.Multer.File){return this.service.validate(idempotencyKeySchema.parse(key),request.user.merchantId??"",file)}
  @Post("products/commit") commit(@Req() request:Request&{user:AuthenticatedUser},@Headers("idempotency-key") key:string,@Body(new ZodValidationPipe(commitSchema)) body:z.infer<typeof commitSchema>){return this.service.commit(idempotencyKeySchema.parse(key),request.user.merchantId??"",request.user.sub,body.jobId)}
}
