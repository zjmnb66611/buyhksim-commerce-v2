import { ConflictException, Inject, Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { hash, verify } from "@node-rs/argon2";
import { createHash, randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import { DB_CLIENT } from "../../shared/database.module";

type RegisterInput={email:string;password:string;locale:"zh-CN"|"zh-HK"|"en"};
type LoginInput={email:string;password:string};
type DbUser={id:string;merchant_id:string|null;email:string;password_hash:string;status:string;locale:string;membership_level:string};

const rolePermissions:Record<string,string[]>={
  platform_admin:["platform.cross_merchant","catalog.write","inventory.write","orders.write","finance.write","distribution.write","cms.write","ai.copy"],
  merchant_admin:["catalog.write","inventory.write","orders.write","finance.write","distribution.write","cms.write","ai.copy"],
  operator:["catalog.write","inventory.write","orders.write","cms.write","ai.copy"],
  finance:["finance.write","distribution.write"],
};

@Injectable()
export class AuthService {
  constructor(@Inject(DB_CLIENT) private readonly client:Sql|null,private readonly jwt:JwtService){}
  private db(){if(!this.client)throw new ServiceUnavailableException("数据库尚未配置");return this.client}
  async register(input:RegisterInput){const sql=this.db();const passwordHash=await hash(input.password,{memoryCost:19456,timeCost:2,parallelism:1});try{const rows=await sql<DbUser[]>`insert into users (email,password_hash,locale,status,points,membership_level,created_at,updated_at) values (${input.email.toLowerCase()},${passwordHash},${input.locale},'ACTIVE',0,'STANDARD',now(),now()) returning id,merchant_id,email,status,locale,membership_level,password_hash`;const user=rows[0];if(!user)throw new ServiceUnavailableException("账户创建失败");return {ok:true,data:{user:{id:user.id,email:user.email,locale:user.locale,membershipLevel:user.membership_level}},requestId:randomUUID()}}catch(error){if(error&&typeof error==="object"&&"code" in error&&(error as {code:string}).code==="23505")throw new ConflictException("该邮箱已注册");throw error}}
  async login(input:LoginInput){const sql=this.db();const rows=await sql<DbUser[]>`select id,merchant_id,email,password_hash,status,locale,membership_level from users where email=${input.email.toLowerCase()} limit 1`;const user=rows[0];if(!user||user.status!=="ACTIVE"||!(await verify(user.password_hash,input.password)))throw new UnauthorizedException("邮箱或密码错误");const roleRows=await sql<{code:string}[]>`select r.code from roles r join user_roles ur on ur.role_id=r.id where ur.user_id=${user.id}`;const permissions=[...new Set(roleRows.flatMap((role)=>rolePermissions[role.code]??[]))];const accessToken=await this.jwt.signAsync({sub:user.id,email:user.email,merchantId:user.merchant_id??undefined,permissions,type:"access"},{expiresIn:"15m"});const refreshToken=await this.jwt.signAsync({sub:user.id,type:"refresh",jti:randomUUID()},{secret:process.env.JWT_REFRESH_SECRET??"development-only-refresh-secret-change",expiresIn:"30d"});await sql`insert into sessions (user_id,token_hash,expires_at,created_at,updated_at) values (${user.id},${createHash("sha256").update(refreshToken).digest("hex")},now()+interval '30 days',now(),now())`;return {ok:true,data:{accessToken,refreshToken,user:{id:user.id,email:user.email,locale:user.locale,membershipLevel:user.membership_level,merchantId:user.merchant_id,permissions}},requestId:randomUUID()}}
}
