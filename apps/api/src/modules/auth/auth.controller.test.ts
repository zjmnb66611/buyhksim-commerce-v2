import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { AuthController } from "./auth.controller";
import type { AuthService } from "./auth.service";

function responseDouble() {
  return { cookie: vi.fn(), clearCookie: vi.fn() } as unknown as Response;
}

describe("AuthController", () => {
  it("注册成功后签发访问令牌并设置 HttpOnly 刷新 Cookie", async () => {
    const service = {
      register: vi.fn().mockResolvedValue({ ok: true, data: { accessToken: "access", refreshToken: "refresh", user: { id: "u1" } }, requestId: "r1" }),
    } as unknown as AuthService;
    const controller = new AuthController(service);
    const response = responseDouble();

    const result = await controller.register({ email: "user@example.com", password: "password-123", name: "测试用户", locale: "zh-CN",client:"storefront" }, response);

    expect(result.data).toEqual({ accessToken: "access", user: { id: "u1" } });
    expect(response.cookie).toHaveBeenCalledWith("buyhksim_storefront_refresh", "refresh", expect.objectContaining({ httpOnly: true, sameSite: "strict" }));
  });

  it("退出时撤销服务端会话并清理刷新 Cookie", async () => {
    const service = { logout: vi.fn().mockResolvedValue({ ok: true, data: { revoked: true }, requestId: "r2" }) } as unknown as AuthService;
    const controller = new AuthController(service);
    const response = responseDouble();
    const request = { headers: { cookie: "buyhksim_storefront_refresh=token-123" },header:()=>undefined } as unknown as Request;

    await controller.logout(request, response);

    expect(service.logout).toHaveBeenCalledWith("token-123");
    expect(response.clearCookie).toHaveBeenCalledWith("buyhksim_storefront_refresh", expect.objectContaining({ httpOnly: true, path: "/api/v1/auth" }));
  });
});
