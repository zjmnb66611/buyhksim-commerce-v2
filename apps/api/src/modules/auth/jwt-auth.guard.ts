import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

export type AuthenticatedUser = {
  sub: string;
  email?: string;
  merchantId?: string;
  permissions: string[];
  type: "access";
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string }; user?: AuthenticatedUser }>();
    const [scheme, token] = (request.headers.authorization ?? "").split(" ");
    if (scheme !== "Bearer" || !token) throw new UnauthorizedException("请先登录后再执行此操作");

    try {
      const payload = await this.jwt.verifyAsync<AuthenticatedUser>(token, {
        issuer: "buyhksim-api",
        audience: "buyhksim-clients",
      });
      if (payload.type !== "access" || !payload.sub) throw new Error("invalid token type");
      request.user = { ...payload, permissions: Array.isArray(payload.permissions) ? payload.permissions : [] };
      return true;
    } catch {
      throw new UnauthorizedException("登录会话已失效，请重新登录");
    }
  }
}
