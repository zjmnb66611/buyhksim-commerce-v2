import { describe, expect, it } from "vitest";
import { CatalogService } from "./catalog.service";

describe("CatalogService sandbox catalog", () => {
  const service = new CatalogService(null);
  it("按目的地和卡类型筛选，并返回可结算 SKU", async () => {
    const result = await service.list({ q: "日本", kind: "ESIM" });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.skus[0]?.id).toMatch(/^[0-9a-f-]{36}$/);
  });
  it("不存在的商品详情返回 404", async () => {
    await expect(service.detail("missing-product")).rejects.toMatchObject({ status: 404 });
  });
});
