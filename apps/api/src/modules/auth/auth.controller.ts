import { Body, Controller, HttpCode, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { z } from "zod";
import { Throttle } from "@nestjs/throttler";
import { ZodValidationPipe } from "../../shared/zod-validation.pipe";
import { AuthService } from "./auth.service";

const registerSchema=z.object({email:z.string().email().max(254),password:z.string().min(10).max(128),locale:z.enum(["zh-CN","zh-HK","en"]).default("zh-CN")});
const loginSchema=z.object({email:z.string().email().max(254),password:z.string().min(1).max(128)});

@Controller("auth")
export class AuthController {
  constructor(private readonly service:AuthService){}
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("register") register(@Body(new ZodValidationPipe(registerSchema)) body:z.infer<typeof registerSchema>){return this.service.register(body)}
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post("login") @HttpCode(200) async login(@Body(new ZodValidationPipe(loginSchema)) body:z.infer<typeof loginSchema>,@Res({passthrough:true}) response:Response){const result=await this.service.login(body);response.cookie("buyhksim_refresh",result.data.refreshToken,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/api/v1/auth",maxAge:30*24*60*60*1000});return {...result,data:{accessToken:result.data.accessToken,user:result.data.user}}}
}
