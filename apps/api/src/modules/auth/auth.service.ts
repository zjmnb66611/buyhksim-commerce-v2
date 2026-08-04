import { ConflictException, Inject, Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { hash, verify } from "@node-rs/argon2";
import { createHash, randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import { DB_CLIENT } from "../../shared/database.module";

type RegisterInput={email:string;password:string;name:string;locale:"zh-CN"|"zh-HK"|"en"};
type LoginInput={email:string;password:string};
type DbUser={id:string;merchant_id:string|null;email:string;display_name:string|null;password_hash:string;status:string;locale:string;membership_level:string;points:number};

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
  async register(input:RegisterInput){const sql=this.db();const passwordHash=await hash(input.password,{memoryCost:19456,timeCost:2,parallelism:1});try{const rows=await sql<DbUser[]>`insert into users (email,display_name,password_hash,locale,status,points,membership_level,created_at,updated_at) values (${input.email.toLowerCase()},${input.name.trim()},${passwordHash},${input.locale},'ACTIVE',0,'STANDARD',now(),now()) returning id,merchant_id,email,display_name,status,locale,membership_level,password_hash,points`;const user=rows[0];if(!user)throw new ServiceUnavailableException("账户创建失败");return this.issueSession(sql,user)}catch(error){if(error&&typeof error==="object"&&"code" in error&&(error as {code:string}).code==="23505")throw new ConflictException("该邮箱已注册");throw error}}
  async login(input:LoginInput){const sql=this.db();const rows=await sql<DbUser[]>`select id,merchant_id,email,display_name,password_hash,status,locale,membership_level,points from users where email=${input.email.toLowerCase()} limit 1`;const user=rows[0];if(!user||user.status!=="ACTIVE"||!(await verify(user.password_hash,input.password)))throw new UnauthorizedException("邮箱或密码错误");return this.issueSession(sql,user)}
  async refresh(refreshToken:string){const sql=this.db();let payload:{sub?:string;type?:string};try{payload=await this.jwt.verifyAsync(refreshToken,{secret:this.refreshSecret(),issuer:"buyhksim-api",audience:"buyhksim-clients"})}catch{throw new UnauthorizedException("刷新会话已失效，请重新登录")};if(payload.type!=="refresh"||!payload.sub)throw new UnauthorizedException("刷新会话无效");const userId=payload.sub;const tokenHash=this.hashToken(refreshToken);const user=await sql.begin(async(tx)=>{const sessions=await tx<{id:string}[]>`select id from sessions where user_id=${userId} and token_hash=${tokenHash} and revoked_at is null and expires_at>now() for update`;if(!sessions.length)throw new UnauthorizedException("刷新会话已撤销或过期");await tx`update sessions set revoked_at=now(),updated_at=now() where id=${sessions[0]!.id}`;const users=await tx<DbUser[]>`select id,merchant_id,email,display_name,password_hash,status,locale,membership_level,points from users where id=${userId} and status='ACTIVE'`;const activeUser=users[0];if(!activeUser)throw new UnauthorizedException("账户已停用");return activeUser});return this.issueSession(sql,user)}
  async logout(refreshToken?:string){if(!refreshToken)return {ok:true,data:{revoked:true},requestId:randomUUID()};const sql=this.db();await sql`update sessions set revoked_at=coalesce(revoked_at,now()),updated_at=now() where token_hash=${this.hashToken(refreshToken)}`;return {ok:true,data:{revoked:true},requestId:randomUUID()}}
  async me(userId:string){const sql=this.db();const rows=await sql<DbUser[]>`select id,merchant_id,email,display_name,password_hash,status,locale,membership_level,points from users where id=${userId} and status='ACTIVE'`;const user=rows[0];if(!user)throw new UnauthorizedException("账户不存在或已停用");const permissions=await this.permissions(sql,user.id);return {ok:true,data:{user:this.publicUser(user,permissions)},requestId:randomUUID()}}
  private async issueSession(sql:Sql,user:DbUser){const permissions=await this.permissions(sql,user.id);const sessionId=randomUUID();const refreshToken=await this.jwt.signAsync({sub:user.id,type:"refresh",jti:sessionId},{secret:this.refreshSecret(),expiresIn:"30d"});await sql`insert into sessions (id,user_id,token_hash,expires_at,created_at,updated_at) values (${sessionId},${user.id},${this.hashToken(refreshToken)},now()+interval '30 days',now(),now())`;const accessToken=await this.jwt.signAsync({sub:user.id,sid:sessionId,email:user.email,merchantId:user.merchant_id??undefined,permissions,type:"access"},{expiresIn:"15m"});return {ok:true,data:{accessToken,refreshToken,user:this.publicUser(user,permissions)},requestId:randomUUID()}}
  private async permissions(sql:Sql,userId:string){const roleRows=await sql<{code:string}[]>`select r.code from roles r join user_roles ur on ur.role_id=r.id where ur.user_id=${userId}`;return [...new Set(roleRows.flatMap((role)=>rolePermissions[role.code]??[]))]}
  private publicUser(user:DbUser,permissions:string[]){return {id:user.id,email:user.email,name:user.display_name??user.email.split("@")[0],locale:user.locale,membershipLevel:user.membership_level,points:user.points,merchantId:user.merchant_id,permissions}}
  private refreshSecret(){return process.env.JWT_REFRESH_SECRET??"development-only-refresh-secret-change"}
  private hashToken(token:string){return createHash("sha256").update(token).digest("hex")}
}
