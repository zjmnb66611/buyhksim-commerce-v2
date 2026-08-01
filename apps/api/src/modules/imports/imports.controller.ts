import { Controller, Headers, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Express } from "express";
import { idempotencyKeySchema } from "@buyhksim/contracts";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard, RequirePermissions } from "../auth/permissions.guard";
import { ImportsService } from "./imports.service";

@Controller("admin/imports")
@UseGuards(JwtAuthGuard,PermissionsGuard)
@RequirePermissions("catalog.write")
export class ImportsController {
  constructor(private readonly service:ImportsService){}
  @Post("products/validate")
  @UseInterceptors(FileInterceptor("file",{limits:{fileSize:20*1024*1024,files:1},fileFilter:(_request,file,callback)=>callback(null,/\.(csv|xlsx)$/i.test(file.originalname))}))
  validate(@UploadedFile() file:Express.Multer.File){return this.service.validate(file)}
  @Post("products/commit") commit(@Headers("idempotency-key") key:string){return this.service.commit(idempotencyKeySchema.parse(key))}
}
