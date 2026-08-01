import { BadRequestException, Injectable, type PipeTransform } from "@nestjs/common";
import type { ZodType } from "zod";
@Injectable() export class ZodValidationPipe implements PipeTransform { constructor(private readonly schema: ZodType) {} transform(value: unknown) { const result=this.schema.safeParse(value); if(!result.success) throw new BadRequestException({ message:"请求参数校验失败", issues:result.error.flatten() }); return result.data; } }
