import { afterEach, describe, expect, it } from "vitest";
import { EncryptionService } from "./encryption.service";

describe("EncryptionService", () => {
  const previous=process.env.PII_ENCRYPTION_KEY;
  afterEach(()=>{if(previous===undefined)delete process.env.PII_ENCRYPTION_KEY;else process.env.PII_ENCRYPTION_KEY=previous});
  it("使用带随机 IV 的认证加密保护个人信息", () => {
    process.env.PII_ENCRYPTION_KEY=Buffer.alloc(32,7).toString("base64");
    const service=new EncryptionService();
    const first=service.encrypt("广东省深圳市测试路 1 号");const second=service.encrypt("广东省深圳市测试路 1 号");
    expect(first).not.toBe(second);
    expect(service.decrypt(first)).toBe("广东省深圳市测试路 1 号");
  });
  it("密钥缺失时拒绝处理敏感数据",()=>{delete process.env.PII_ENCRYPTION_KEY;expect(()=>new EncryptionService().encrypt("secret")).toThrow(/PII_ENCRYPTION_KEY/)});
});
