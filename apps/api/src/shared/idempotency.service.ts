import { ConflictException, Inject, Injectable, Optional, ServiceUnavailableException } from "@nestjs/common";
import { createHash } from "node:crypto";
import type { Sql } from "postgres";
import { DB_CLIENT } from "./database.module";
type Entry={requestHash:string;response:unknown};
@Injectable()
export class IdempotencyService {
  private readonly cache=new Map<string,Entry>();
  private readonly inflight=new Map<string,{requestHash:string;promise:Promise<unknown>}>();
  constructor(@Optional() @Inject(DB_CLIENT) private readonly client:Sql|null=null){}
  async execute<T>(scope:string,key:string,payload:unknown,work:()=>Promise<T>):Promise<T>{
    const requestHash=createHash("sha256").update(JSON.stringify(payload)).digest("hex");
    if(!this.client)return this.executeInMemory(scope,key,requestHash,work);
    const inserted=await this.client<{request_hash:string}[]>`insert into idempotency_records (scope,key,request_hash,expires_at,created_at,updated_at) values (${scope},${key},${requestHash},now()+interval '24 hours',now(),now()) on conflict (scope,key) do nothing returning request_hash`;
    if(!inserted.length){const rows=await this.client<{request_hash:string;response_body:unknown}[]>`select request_hash,response_body from idempotency_records where scope=${scope} and key=${key}`;const existing=rows[0];if(!existing)throw new ServiceUnavailableException("幂等状态暂时不可用，请安全重试");if(existing.request_hash!==requestHash)throw new ConflictException("幂等键已用于不同请求");if(existing.response_body!==null)return existing.response_body as T;throw new ConflictException("同一请求正在处理中，请稍后使用相同幂等键重试");}
    try{const response=await work();await this.client`update idempotency_records set response_status=200,response_body=${this.client.json(response as never)},updated_at=now() where scope=${scope} and key=${key}`;return response;}catch(error){await this.client`delete from idempotency_records where scope=${scope} and key=${key} and response_body is null`;throw error;}
  }
  private async executeInMemory<T>(scope:string,key:string,requestHash:string,work:()=>Promise<T>):Promise<T>{const composite=`${scope}:${key}`;const existing=this.cache.get(composite);if(existing){if(existing.requestHash!==requestHash)throw new ConflictException("幂等键已用于不同请求");return existing.response as T;}const active=this.inflight.get(composite);if(active){if(active.requestHash!==requestHash)throw new ConflictException("幂等键已用于不同请求");return active.promise as Promise<T>;}const promise=work().then((response)=>{this.cache.set(composite,{requestHash,response});return response}).finally(()=>this.inflight.delete(composite));this.inflight.set(composite,{requestHash,promise});return promise;}
}
