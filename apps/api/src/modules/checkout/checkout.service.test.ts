import { describe, expect, it } from "vitest";
import { CheckoutService } from "./checkout.service";
import { IdempotencyService } from "../../shared/idempotency.service";

describe("结算服务", () => {
  const service = new CheckoutService(new IdempotencyService());

  it("由服务端计算商品总价并签名", async () => {
    const response = await service.preview({ lines: [{ skuId: "5a1a1111-1111-4111-8111-111111111111", quantity: 2 }], pointsToUse: 0 });
    expect(response.data.subtotalMinor).toBe(11600);
    expect(response.data.previewToken.split(".")).toHaveLength(2);
  });

  it("拒绝不存在的 SKU", async () => {
    await expect(service.preview({ lines: [{ skuId: "5a1a9999-9999-4999-8999-999999999999", quantity: 1 }], pointsToUse: 0 })).rejects.toThrow("商品已下架或不存在");
  });
});
