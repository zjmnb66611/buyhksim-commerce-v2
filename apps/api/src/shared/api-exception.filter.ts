import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { Request, Response } from "express";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request & { requestId?: string }>();
    const status = error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw = error instanceof HttpException ? error.getResponse() : null;
    const exposed = typeof raw === "object" && raw && "message" in raw ? (raw as { message: unknown }).message : null;
    const message = status >= 500
      ? "服务暂时不可用，请稍后重试"
      : Array.isArray(exposed) ? exposed.join("；") : exposed ? String(exposed) : "请求处理失败";
    response.status(status).json({ ok: false, error: { code: `HTTP_${status}`, message, requestId: request.requestId ?? "unknown", recoverable: status >= 500 || status === 409 || status === 429 } });
  }
}
