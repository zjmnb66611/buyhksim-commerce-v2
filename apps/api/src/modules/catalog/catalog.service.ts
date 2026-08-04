import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Sql, TransactionSql } from "postgres";
import { DB_CLIENT } from "../../shared/database.module";

type CatalogQuery = { q: string; kind: "" | "ESIM" | "PHYSICAL_SIM" };
type ProductWrite = {
  slug: string;
  title: string;
  description: string;
  destination: string;
  kind: "ESIM" | "PHYSICAL_SIM";
  imageUrl?: string;
  sku: {
    code: string;
    title: string;
    priceMinor: number;
    compareAtPriceMinor: number | null;
    attributes: Record<string, unknown>;
    commissionBps: number;
    stock: number;
  };
};

const fallback = [
  {
    id: "31111111-1111-4111-8111-111111111111",
    slug: "hong-kong-5g-esim",
    title: "香港 5G eSIM",
    description: "香港本地 5G 高速套餐",
    destination: "香港",
    kind: "ESIM",
    image: "/images/hong-kong.webp",
    status: "ACTIVE",
    skus: [
      {
        id: "5a1a1111-1111-4111-8111-111111111111",
        code: "HK-5G-5D-5G",
        title: "5 天 5GB",
        priceMinor: 5800,
        compareAtPriceMinor: 7200,
        currency: "CNY",
        attributes: { days: 5, data: "5GB" },
        available: 1000,
      },
    ],
  },
  {
    id: "32222222-2222-4222-8222-222222222222",
    slug: "japan-5g-esim",
    title: "日本 5G eSIM",
    description: "日本多网络高速套餐",
    destination: "日本",
    kind: "ESIM",
    image: "/images/japan.webp",
    status: "ACTIVE",
    skus: [
      {
        id: "5a1a2222-2222-4222-8222-222222222222",
        code: "JP-5G-7D-10G",
        title: "7 天 10GB",
        priceMinor: 6800,
        compareAtPriceMinor: 8800,
        currency: "CNY",
        attributes: { days: 7, data: "10GB" },
        available: 800,
      },
    ],
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    slug: "europe-33-countries-esim",
    title: "欧洲多国 33 国 eSIM",
    description: "欧洲 33 国通用套餐",
    destination: "欧洲 33 国",
    kind: "ESIM",
    image: "/images/europe.webp",
    status: "ACTIVE",
    skus: [
      {
        id: "5a1a3333-3333-4333-8333-333333333333",
        code: "EU-33-15D-30G",
        title: "15 天 30GB",
        priceMinor: 19800,
        compareAtPriceMinor: 23800,
        currency: "CNY",
        attributes: { days: 15, data: "30GB" },
        available: 500,
      },
    ],
  },
  {
    id: "34444444-4444-4444-8444-444444444444",
    slug: "singapore-5g-esim",
    title: "新加坡 5G eSIM",
    description: "新加坡本地高速上网套餐",
    destination: "新加坡",
    kind: "ESIM",
    image: "/images/hero-rome.webp",
    status: "ACTIVE",
    skus: [
      {
        id: "5a1a4444-4444-4444-8444-444444444444",
        code: "SG-5G-5D-5G",
        title: "5 天 5GB",
        priceMinor: 4800,
        compareAtPriceMinor: null,
        currency: "CNY",
        attributes: { days: 5, data: "5GB" },
        available: 600,
      },
    ],
  },
  {
    id: "35555555-5555-4555-8555-555555555555",
    slug: "thailand-8-day-sim",
    title: "泰国 8 天上网卡",
    description: "泰国实体 SIM 15GB 套餐",
    destination: "泰国",
    kind: "PHYSICAL_SIM",
    image: "/images/hero-rome.webp",
    status: "ACTIVE",
    skus: [
      {
        id: "5a1a5555-5555-4555-8555-555555555555",
        code: "TH-SIM-8D-15G",
        title: "8 天 15GB",
        priceMinor: 3900,
        compareAtPriceMinor: null,
        currency: "CNY",
        attributes: { days: 8, data: "15GB" },
        available: 300,
      },
    ],
  },
] as const;

@Injectable()
export class CatalogService {
  constructor(
    @Optional() @Inject(DB_CLIENT) private readonly client: Sql | null = null,
  ) {}
  async list(query: CatalogQuery) {
    const data = this.client
      ? await this.queryProducts(query)
      : fallback.filter(
          (p) =>
            (!query.q ||
              `${p.title}${p.destination}`
                .toLowerCase()
                .includes(query.q.toLowerCase())) &&
            (!query.kind || p.kind === query.kind),
        );
    return { ok: true, data, requestId: randomUUID() };
  }
  async detail(slug: string) {
    if (!slug || slug.length > 180)
      throw new BadRequestException("商品标识无效");
    const products = this.client
      ? await this.queryProducts({ q: "", kind: "" }, slug)
      : fallback.filter((p) => p.slug === slug);
    const product = products[0];
    if (!product) throw new NotFoundException("商品不存在或已下架");
    return { ok: true, data: product, requestId: randomUUID() };
  }
  async adminList(merchantId: string) {
    const sql = this.db(merchantId);
    const rows =
      await sql`select p.id,p.slug,p.title,p.description,p.destination,p.kind,p.status,p.updated_at,(select pm.url from product_media pm where pm.product_id=p.id order by pm.sort_order limit 1) as image_url,s.id as sku_id,s.code as sku_code,s.title as sku_title,s.price_minor,s.compare_at_price_minor,s.attributes as sku_attributes,s.commission_bps,coalesce(sum(i.available),0)::int as stock from products p left join lateral (select * from skus where product_id=p.id order by created_at limit 1) s on true left join inventory i on i.sku_id=s.id where p.merchant_id=${merchantId} group by p.id,s.id,s.code,s.title,s.price_minor,s.compare_at_price_minor,s.attributes,s.commission_bps order by p.updated_at desc limit 1000`;
    return { ok: true, data: rows, requestId: randomUUID() };
  }
  async create(merchantId: string, actorId: string, input: ProductWrite) {
    const sql = this.db(merchantId);
    return sql.begin(async (tx) => {
      const productId = randomUUID();
      const skuId = randomUUID();
      try {
        await tx`insert into products (id,merchant_id,slug,title,description,destination,kind,status,created_at,updated_at) values (${productId},${merchantId},${input.slug},${input.title},${input.description},${input.destination},${input.kind},'DRAFT',now(),now())`;
        if (input.imageUrl)
          await tx`insert into product_media (id,product_id,url,alt,sort_order,created_at,updated_at) values (${randomUUID()},${productId},${input.imageUrl},${input.title},0,now(),now())`;
        await tx`insert into skus (id,product_id,code,title,price_minor,compare_at_price_minor,currency,attributes,commission_bps,active,created_at,updated_at) values (${skuId},${productId},${input.sku.code},${input.sku.title},${input.sku.priceMinor},${input.sku.compareAtPriceMinor},'CNY',${tx.json(input.sku.attributes as never)},${input.sku.commissionBps},true,now(),now())`;
        const warehouses = await tx<
          { id: string }[]
        >`select id from warehouses where merchant_id=${merchantId} order by created_at limit 1`;
        if (!warehouses[0]) throw new ConflictException("请先创建仓库");
        await tx`insert into inventory (sku_id,warehouse_id,available,locked,sold,version,created_at,updated_at) values (${skuId},${warehouses[0].id},${input.sku.stock},0,0,0,now(),now())`;
        await this.audit(
          tx,
          actorId,
          merchantId,
          "catalog.product.create",
          productId,
          null,
          { title: input.title, skuCode: input.sku.code },
        );
        return {
          ok: true,
          data: { id: productId, skuId, status: "DRAFT" },
          requestId: randomUUID(),
        };
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          (error as { code: string }).code === "23505"
        )
          throw new ConflictException("商品标识或 SKU 编码已存在");
        throw error;
      }
    });
  }
  async update(
    merchantId: string,
    actorId: string,
    id: string,
    input: Partial<ProductWrite> & { status?: string },
  ) {
    const sql = this.db(merchantId);
    const before = await sql<
      Record<string, unknown>[]
    >`select id,slug,title,description,destination,kind,status from products where id=${id} and merchant_id=${merchantId}`;
    if (!before[0]) throw new NotFoundException("商品不存在");
    const next = { ...before[0], ...input };
    await sql.begin(async (tx) => {
      await tx`update products set slug=${String(next.slug)},title=${String(next.title)},description=${String(next.description)},destination=${String(next.destination)},kind=${String(next.kind)},status=${String(next.status)},published_at=case when ${String(next.status)}='ACTIVE' then coalesce(published_at,now()) else published_at end,updated_at=now() where id=${id} and merchant_id=${merchantId}`;
      if (input.imageUrl !== undefined) {
        await tx`delete from product_media where product_id=${id}`;
        await tx`insert into product_media (id,product_id,url,alt,sort_order,created_at,updated_at) values (${randomUUID()},${id},${input.imageUrl},${String(next.title)},0,now(),now())`;
      }
      if (input.sku) {
        await tx`update skus set code=${input.sku.code},title=${input.sku.title},price_minor=${input.sku.priceMinor},compare_at_price_minor=${input.sku.compareAtPriceMinor},attributes=${tx.json(input.sku.attributes as never)},commission_bps=${input.sku.commissionBps},updated_at=now() where product_id=${id}`;
        await tx`with ranked as (select i.sku_id,i.warehouse_id,row_number() over(partition by i.sku_id order by i.created_at) as rn from inventory i join skus s on s.id=i.sku_id where s.product_id=${id}) update inventory i set available=case when r.rn=1 then ${input.sku.stock} else 0 end,version=version+1,updated_at=now() from ranked r where i.sku_id=r.sku_id and i.warehouse_id=r.warehouse_id`;
      }
      await this.audit(
        tx,
        actorId,
        merchantId,
        "catalog.product.update",
        id,
        before[0],
        input,
      );
    });
    return {
      ok: true,
      data: { id, status: next.status },
      requestId: randomUUID(),
    };
  }
  private async queryProducts(query: CatalogQuery, slug?: string) {
    const sql = this.client!;
    return sql`select p.id,p.slug,p.title,p.description,p.destination,p.kind,p.status,coalesce((select pm.url from product_media pm where pm.product_id=p.id order by pm.sort_order limit 1),'/images/'||case when p.slug like 'hong-kong%' then 'hong-kong' when p.slug like 'japan%' then 'japan' when p.slug like 'europe%' then 'europe' else 'hero-rome' end||'.webp') as image,coalesce((select json_agg(json_build_object('id',s.id,'code',s.code,'title',s.title,'priceMinor',s.price_minor,'compareAtPriceMinor',s.compare_at_price_minor,'currency',s.currency,'attributes',s.attributes,'available',coalesce((select sum(i.available) from inventory i where i.sku_id=s.id),0)) order by s.price_minor) from skus s where s.product_id=p.id and s.active=true),'[]'::json) as skus from products p where p.status='ACTIVE' and (${slug ?? null}::text is null or p.slug=${slug ?? null}) and (${query.q}='' or p.title ilike ${`%${query.q}%`} or p.destination ilike ${`%${query.q}%`}) and (${query.kind}='' or p.kind::text=${query.kind}) order by p.published_at desc nulls last limit 200`;
  }
  private db(merchantId: string) {
    if (!merchantId) throw new BadRequestException("当前账户未绑定商户");
    if (!this.client)
      throw new ServiceUnavailableException("商品数据库尚未配置");
    return this.client;
  }
  private async audit(
    tx: TransactionSql,
    actorId: string,
    merchantId: string,
    action: string,
    targetId: string,
    before: unknown,
    after: unknown,
  ) {
    await tx`insert into audit_logs (actor_id,merchant_id,action,target_type,target_id,request_id,before,after,created_at) values (${actorId},${merchantId},${action},'PRODUCT',${targetId},${randomUUID()},${before ? tx.json(before as never) : null},${after ? tx.json(after as never) : null},now())`;
  }
}
