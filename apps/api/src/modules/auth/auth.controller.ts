import { Body, Controller, Get, HttpCode, Post, Req, Res, UnauthorizedException, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import { Throttle } from "@nestjs/throttler";
import { ZodValidationPipe } from "../../shared/zod-validation.pipe";
import { AuthService } from "./auth.service";
import { JwtAuthGuard, type AuthenticatedUser } from "./jwt-auth.guard";

const clientSchema=z.enum(["storefront","admin"]).default("storefront");
const registerSchema=z.object({email:z.string().email().max(254),password:z.string().min(10).max(128),name:z.string().trim().min(2).max(80),locale:z.enum(["zh-CN","zh-HK","en"]).default("zh-CN"),client:clientSchema});
const loginSchema=z.object({email:z.string().email().max(254),password:z.string().min(1).max(128),client:clientSchema});

@Controller("auth")
export class AuthController {
  constructor(private readonly service:AuthService){}
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("register") async register(@Body(new ZodValidationPipe(registerSchema)) body:z.infer<typeof registerSchema>,@Res({passthrough:true}) response:Response){const result=await this.service.register(body);this.setRefreshCookie(response,result.data.refreshToken,body.client);return {...result,data:{accessToken:result.data.accessToken,user:result.data.user}}}
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post("login") @HttpCode(200) async login(@Body(new ZodValidationPipe(loginSchema)) body:z.infer<typeof loginSchema>,@Res({passthrough:true}) response:Response){const result=await this.service.login(body);this.setRefreshCookie(response,result.data.refreshToken,body.client);return {...result,data:{accessToken:result.data.accessToken,user:result.data.user}}}
  @Post("refresh") @HttpCode(200) async refresh(@Req() request:Request,@Res({passthrough:true}) response:Response){const client=this.client(request);const result=await this.service.refresh(this.readRefreshCookie(request,client));this.setRefreshCookie(response,result.data.refreshToken,client);return {...result,data:{accessToken:result.data.accessToken,user:result.data.user}}}
  @Post("logout") @HttpCode(200) async logout(@Req() request:Request,@Res({passthrough:true}) response:Response){const client=this.client(request);const result=await this.service.logout(this.readRefreshCookie(request,client,false));response.clearCookie(this.cookieName(client),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/api/v1/auth"});return result}
  @Get("me") @UseGuards(JwtAuthGuard) me(@Req() request:Request&{user:AuthenticatedUser}){return this.service.me(request.user.sub)}
  private setRefreshCookie(response:Response,token:string,client:"storefront"|"admin"){response.cookie(this.cookieName(client),token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/api/v1/auth",maxAge:30*24*60*60*1000})}
  private readRefreshCookie(request:Request,client:"storefront"|"admin",required=true){const name=this.cookieName(client);const raw=request.headers.cookie?.split(";").map((part)=>part.trim()).find((part)=>part.startsWith(`${name}=`))?.slice(name.length+1);const token=raw?decodeURIComponent(raw):"";if(required&&!token)throw new UnauthorizedException("缺少刷新会话，请重新登录");return token}
  private client(request:Request){return request.header("x-client-type")==="admin"?"admin" as const:"storefront" as const}
  private cookieName(client:"storefront"|"admin"){return client==="admin"?"buyhksim_admin_refresh":"buyhksim_storefront_refresh"}
}
