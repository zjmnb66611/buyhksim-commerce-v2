import { Body,Controller,Get,Query,Req,Put,UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import { JwtAuthGuard,type AuthenticatedUser } from "../auth/jwt-auth.guard";
import { PermissionsGuard,RequirePermissions } from "../auth/permissions.guard";
import { ZodValidationPipe } from "../../shared/zod-validation.pipe";
import { CmsService } from "./cms.service";
const locale=z.enum(["zh-CN","zh-HK","en"]);const write=z.object({locale,body:z.object({announcement:z.string().max(240),heroTitle:z.string().max(240),heroSubtitle:z.string().max(500),serviceNote:z.string().max(240),faqTitle:z.string().max(240),faqAnswer:z.string().max(1000)}),publish:z.boolean().default(false)});
@Controller() export class CmsController{constructor(private readonly service:CmsService){}@Get("cms/storefront") published(@Query("locale",new ZodValidationPipe(locale)) localeValue:string){return this.service.published(localeValue)}@Get("admin/cms/storefront") @UseGuards(JwtAuthGuard,PermissionsGuard) @RequirePermissions("cms.write") admin(@Req() req:Request&{user:AuthenticatedUser}){return this.service.admin(req.user.merchantId??"")}@Put("admin/cms/storefront") @UseGuards(JwtAuthGuard,PermissionsGuard) @RequirePermissions("cms.write") save(@Req() req:Request&{user:AuthenticatedUser},@Body(new ZodValidationPipe(write)) body:z.infer<typeof write>){return this.service.save(req.user.merchantId??"",req.user.sub,body.locale,body.body,body.publish)}}
