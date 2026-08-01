import { describe, expect, it } from "vitest";
import { formatMoney, products } from "./products";

describe("商品目录", () => {
  it("每个演示商品都有可售 SKU 信息", () => {
    expect(products).toHaveLength(5);
    expect(products.every((item) => item.priceMinor > 0 && item.days.length > 0 && item.data.length > 0)).toBe(true);
  });

  it("金额从最小货币单位格式化", () => {
    expect(formatMoney(5800)).toContain("58");
  });
});
