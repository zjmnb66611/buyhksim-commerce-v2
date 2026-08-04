import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

@Injectable()
export class EncryptionService {
  encrypt(value: string) {
    const key = this.key(); const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", key, iv);
    const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${ciphertext.toString("base64url")}`;
  }
  decrypt(envelope: string) {
    const [version, iv, tag, ciphertext] = envelope.split(".");
    if (version !== "v1" || !iv || !tag || !ciphertext) throw new ServiceUnavailableException("敏感数据格式无效");
    try { const decipher=createDecipheriv("aes-256-gcm",this.key(),Buffer.from(iv,"base64url"));decipher.setAuthTag(Buffer.from(tag,"base64url"));return Buffer.concat([decipher.update(Buffer.from(ciphertext,"base64url")),decipher.final()]).toString("utf8"); }
    catch { throw new ServiceUnavailableException("敏感数据解密失败"); }
  }
  private key(){const raw=process.env.PII_ENCRYPTION_KEY??"";const key=Buffer.from(raw,"base64");if(key.length!==32)throw new ServiceUnavailableException("PII_ENCRYPTION_KEY 必须是 32 字节 Base64 密钥");return key}
}
