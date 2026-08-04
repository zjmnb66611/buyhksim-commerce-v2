import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import { ZodValidationPipe } from "../../shared/zod-validation.pipe";
import { JwtAuthGuard, type AuthenticatedUser } from "../auth/jwt-auth.guard";
import { CustomerService } from "./customer.service";

const uuid=z.string().uuid();
const addressSchema=z.object({name:z.string().trim().min(1).max(80),phone:z.string().trim().min(8).max(30),country:z.string().trim().min(1).max(80).default("中国"),province:z.string().trim().max(80).default(""),city:z.string().trim().max(80).default(""),district:z.string().trim().max(80).default(""),detail:z.string().trim().min(5).max(300),postalCode:z.string().trim().max(24).default(""),isDefault:z.boolean().default(false)});
const cartSchema=z.object({lines:z.array(z.object({skuId:uuid,quantity:z.number().int().min(1).max(99)})).max(100)}).refine((value)=>new Set(value.lines.map((line)=>line.skuId)).size===value.lines.length,"购物车存在重复 SKU");

@Controller()
@UseGuards(JwtAuthGuard)
export class CustomerController {
  constructor(private readonly service:CustomerService){}
  @Get("addresses") addresses(@Req() req:Request&{user:AuthenticatedUser}){return this.service.addresses(req.user.sub)}
  @Post("addresses") addAddress(@Req() req:Request&{user:AuthenticatedUser},@Body(new ZodValidationPipe(addressSchema)) body:z.infer<typeof addressSchema>){return this.service.addAddress(req.user.sub,body)}
  @Put("addresses/:id/default") setDefault(@Req() req:Request&{user:AuthenticatedUser},@Param("id",new ZodValidationPipe(uuid)) id:string){return this.service.setDefaultAddress(req.user.sub,id)}
  @Delete("addresses/:id") removeAddress(@Req() req:Request&{user:AuthenticatedUser},@Param("id",new ZodValidationPipe(uuid)) id:string){return this.service.removeAddress(req.user.sub,id)}
  @Get("favorites") favorites(@Req() req:Request&{user:AuthenticatedUser}){return this.service.favorites(req.user.sub)}
  @Post("favorites/:productId") addFavorite(@Req() req:Request&{user:AuthenticatedUser},@Param("productId",new ZodValidationPipe(uuid)) productId:string){return this.service.addFavorite(req.user.sub,productId)}
  @Delete("favorites/:productId") removeFavorite(@Req() req:Request&{user:AuthenticatedUser},@Param("productId",new ZodValidationPipe(uuid)) productId:string){return this.service.removeFavorite(req.user.sub,productId)}
  @Get("cart") cart(@Req() req:Request&{user:AuthenticatedUser}){return this.service.cart(req.user.sub)}
  @Put("cart") replaceCart(@Req() req:Request&{user:AuthenticatedUser},@Body(new ZodValidationPipe(cartSchema)) body:z.infer<typeof cartSchema>){return this.service.replaceCart(req.user.sub,body.lines)}
  @Get("orders") orders(@Req() req:Request&{user:AuthenticatedUser}){return this.service.orders(req.user.sub)}
}
