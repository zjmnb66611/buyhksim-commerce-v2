import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import { ZodValidationPipe } from "../../shared/zod-validation.pipe";
import { JwtAuthGuard, type AuthenticatedUser } from "../auth/jwt-auth.guard";
import {
  PermissionsGuard,
  RequirePermissions,
} from "../auth/permissions.guard";
import { CatalogService } from "./catalog.service";

const catalogQuerySchema = z.object({
  q: z.string().trim().max(100).default(""),
  kind: z.enum(["", "ESIM", "PHYSICAL_SIM"]).default(""),
});
const productWriteSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(180)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().min(10).max(10_000),
  destination: z.string().trim().min(1).max(80),
  kind: z.enum(["ESIM", "PHYSICAL_SIM"]),
  imageUrl: z
    .string()
    .url()
    .max(2048)
    .refine((value) => value.startsWith("https://"), "商品图片必须使用 HTTPS")
    .optional(),
  sku: z.object({
    code: z.string().trim().min(1).max(80),
    title: z.string().trim().min(1).max(160),
    priceMinor: z.number().int().nonnegative(),
    compareAtPriceMinor: z
      .number()
      .int()
      .nonnegative()
      .nullable()
      .default(null),
    attributes: z.record(z.string(), z.unknown()).default({}),
    commissionBps: z.number().int().min(0).max(5000).default(0),
    stock: z.number().int().nonnegative(),
  }),
});
const productPatchSchema = productWriteSchema.partial().extend({
  status: z
    .enum([
      "DRAFT",
      "PENDING_REVIEW",
      "SCHEDULED",
      "ACTIVE",
      "INACTIVE",
      "REJECTED",
    ])
    .optional(),
});

@Controller("catalog")
export class CatalogController {
  constructor(private readonly service: CatalogService) {}
  @Get("products") list(
    @Query(new ZodValidationPipe(catalogQuerySchema))
    query: z.infer<typeof catalogQuerySchema>,
  ) {
    return this.service.list(query);
  }
  @Get("products/:slug") detail(@Param("slug") slug: string) {
    return this.service.detail(slug);
  }
}

@Controller("admin/products")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions("catalog.write")
export class AdminCatalogController {
  constructor(private readonly service: CatalogService) {}
  @Get() list(@Req() request: Request & { user: AuthenticatedUser }) {
    return this.service.adminList(this.merchant(request));
  }
  @Post() create(
    @Req() request: Request & { user: AuthenticatedUser },
    @Body(new ZodValidationPipe(productWriteSchema))
    body: z.infer<typeof productWriteSchema>,
  ) {
    return this.service.create(this.merchant(request), request.user.sub, body);
  }
  @Patch(":id") update(
    @Req() request: Request & { user: AuthenticatedUser },
    @Param("id") id: string,
    @Body(new ZodValidationPipe(productPatchSchema))
    body: z.infer<typeof productPatchSchema>,
  ) {
    return this.service.update(
      this.merchant(request),
      request.user.sub,
      id,
      body,
    );
  }
  private merchant(request: Request & { user: AuthenticatedUser }) {
    return request.user.merchantId ?? "";
  }
}
