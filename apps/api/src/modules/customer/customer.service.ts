import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import type { Sql } from "postgres";
import { DB_CLIENT } from "../../shared/database.module";
import { EncryptionService } from "../../shared/encryption.service";

type AddressInput = {
  name: string;
  phone: string;
  country: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  postalCode: string;
  isDefault: boolean;
};
@Injectable()
export class CustomerService {
  constructor(
    @Inject(DB_CLIENT) private readonly client: Sql | null,
    private readonly crypto: EncryptionService,
  ) {}
  private db() {
    if (!this.client)
      throw new ServiceUnavailableException("客户数据库尚未配置");
    return this.client;
  }
  async addresses(userId: string) {
    const rows = await this.db()<
      Array<{
        id: string;
        name: string;
        phone_encrypted: string;
        country: string;
        province: string | null;
        city: string | null;
        district: string | null;
        detail_encrypted: string;
        postal_code: string | null;
        is_default: boolean;
      }>
    >`select id,name,phone_encrypted,country,province,city,district,detail_encrypted,postal_code,is_default from addresses where user_id=${userId} order by is_default desc,created_at desc`;
    return {
      ok: true,
      data: rows.map((row) => ({
        id: row.id,
        name: row.name,
        phone: this.crypto.decrypt(row.phone_encrypted),
        country: row.country,
        province: row.province ?? "",
        city: row.city ?? "",
        district: row.district ?? "",
        detail: this.crypto.decrypt(row.detail_encrypted),
        postalCode: row.postal_code ?? "",
        isDefault: row.is_default,
      })),
      requestId: randomUUID(),
    };
  }
  async addAddress(userId: string, input: AddressInput) {
    const sql = this.db();
    return sql.begin(async (tx) => {
      if (input.isDefault)
        await tx`update addresses set is_default=false,updated_at=now() where user_id=${userId}`;
      const id = randomUUID();
      await tx`insert into addresses (id,user_id,name,phone_encrypted,country,province,city,district,detail_encrypted,postal_code,is_default,created_at,updated_at) values (${id},${userId},${input.name},${this.crypto.encrypt(input.phone)},${input.country},${input.province || null},${input.city || null},${input.district || null},${this.crypto.encrypt(input.detail)},${input.postalCode || null},${input.isDefault},now(),now())`;
      return { ok: true, data: { id }, requestId: randomUUID() };
    });
  }
  async setDefaultAddress(userId: string, id: string) {
    const sql = this.db();
    return sql.begin(async (tx) => {
      const rows = await tx<
        { id: string }[]
      >`select id from addresses where id=${id} and user_id=${userId} for update`;
      if (!rows.length) throw new NotFoundException("地址不存在");
      await tx`update addresses set is_default=(id=${id}),updated_at=now() where user_id=${userId}`;
      return {
        ok: true,
        data: { id, isDefault: true },
        requestId: randomUUID(),
      };
    });
  }
  async removeAddress(userId: string, id: string) {
    const rows = await this.db()<
      Array<{ id: string }>
    >`delete from addresses where id=${id} and user_id=${userId} returning id`;
    if (!rows.length) throw new NotFoundException("地址不存在");
    return { ok: true, data: { removed: true }, requestId: randomUUID() };
  }
  async favorites(userId: string) {
    const rows =
      await this.db()`select p.id,p.slug,p.title,p.destination,p.kind from favorites f join products p on p.id=f.product_id where f.user_id=${userId} and p.status='ACTIVE' order by f.created_at desc`;
    return { ok: true, data: rows, requestId: randomUUID() };
  }
  async addFavorite(userId: string, productId: string) {
    const sql = this.db();
    const products = await sql<
      { id: string }[]
    >`select id from products where id=${productId} and status='ACTIVE'`;
    if (!products.length) throw new NotFoundException("商品不存在或已下架");
    await sql`insert into favorites (user_id,product_id,created_at) values (${userId},${productId},now()) on conflict do nothing`;
    return {
      ok: true,
      data: { productId, favorite: true },
      requestId: randomUUID(),
    };
  }
  async removeFavorite(userId: string, productId: string) {
    await this.db()`delete from favorites where user_id=${userId} and product_id=${productId}`;
    return {
      ok: true,
      data: { productId, favorite: false },
      requestId: randomUUID(),
    };
  }
  async cart(userId: string) {
    const rows =
      await this.db()`select cl.sku_id as "skuId",cl.quantity,p.id as "productId",p.slug,p.title,p.kind,s.price_minor as "priceMinor",s.attributes,coalesce((select pm.url from product_media pm where pm.product_id=p.id order by pm.sort_order limit 1),'/images/'||case when p.slug like 'hong-kong%' then 'hong-kong' when p.slug like 'japan%' then 'japan' when p.slug like 'europe%' then 'europe' else 'hero-rome' end||'.webp') as image from carts c join cart_lines cl on cl.cart_id=c.id join skus s on s.id=cl.sku_id join products p on p.id=s.product_id where c.user_id=${userId} and s.active=true and p.status='ACTIVE' order by cl.created_at`;
    return { ok: true, data: { lines: rows }, requestId: randomUUID() };
  }
  async replaceCart(
    userId: string,
    lines: Array<{ skuId: string; quantity: number }>,
  ) {
    const sql = this.db();
    return sql.begin(async (tx) => {
      const ids = lines.map((line) => line.skuId);
      if (ids.length) {
        const valid = await tx<
          { id: string }[]
        >`select s.id from skus s join products p on p.id=s.product_id where s.id in ${tx(ids)} and s.active=true and p.status='ACTIVE'`;
        if (valid.length !== ids.length)
          throw new ConflictException("购物车包含已失效商品");
      }
      const carts = await tx<
        { id: string }[]
      >`select id from carts where user_id=${userId} order by created_at limit 1 for update`;
      const cartId = carts[0]?.id ?? randomUUID();
      if (!carts.length)
        await tx`insert into carts (id,user_id,currency,guest_token_hash,created_at,updated_at) values (${cartId},${userId},'CNY',${createHash("sha256").update(randomBytes(32)).digest("hex")},now(),now())`;
      await tx`delete from cart_lines where cart_id=${cartId}`;
      for (const line of lines)
        await tx`insert into cart_lines (cart_id,sku_id,quantity,created_at,updated_at) values (${cartId},${line.skuId},${line.quantity},now(),now())`;
      return { ok: true, data: { lines }, requestId: randomUUID() };
    });
  }
  async orders(userId: string) {
    const rows =
      await this.db()`select o.id,o.order_no as "orderNo",o.status,o.currency,o.total_minor as "totalMinor",o.refunded_minor as "refundedMinor",o.created_at as "createdAt",coalesce(json_agg(json_build_object('id',oi.id,'title',oi.title_snapshot,'sku',oi.sku_snapshot,'quantity',oi.quantity,'totalMinor',oi.total_minor)) filter (where oi.id is not null),'[]'::json) as items from orders o left join order_items oi on oi.order_id=o.id where o.user_id=${userId} group by o.id order by o.created_at desc limit 200`;
    return { ok: true, data: rows, requestId: randomUUID() };
  }
}
