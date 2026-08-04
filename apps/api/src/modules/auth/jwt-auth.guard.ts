import { CanActivate, ExecutionContext, Inject, Injectable, Optional, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Sql } from "postgres";
import { DB_CLIENT } from "../../shared/database.module";

export type AuthenticatedUser = {
  sub: string;
  sid: string;
  email?: string;
  merchantId?: string;
  permissions: string[];
  type: "access";
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService,@Optional() @Inject(DB_CLIENT) private readonly client:Sql|null=null) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string }; user?: AuthenticatedUser }>();
    const [scheme, token] = (request.headers.authorization ?? "").split(" ");
    if (scheme !== "Bearer" || !token) throw new UnauthorizedException("请先登录后再执行此操作");

    try {
      const payload = await this.jwt.verifyAsync<AuthenticatedUser>(token, {
        issuer: "buyhksim-api",
        audience: "buyhksim-clients",
      });
      if (payload.type !== "access" || !payload.sub || !payload.sid) throw new Error("invalid token type");
      if(this.client){const sessions=await this.client<{id:string}[]>`select id from sessions where id=${payload.sid} and user_id=${payload.sub} and revoked_at is null and expires_at>now()`;if(!sessions.length)throw new Error("session revoked")}
      request.user = { ...payload, permissions: Array.isArray(payload.permissions) ? payload.permissions : [] };
      return true;
    } catch {
      throw new UnauthorizedException("登录会话已失效，请重新登录");
    }
  }
}
