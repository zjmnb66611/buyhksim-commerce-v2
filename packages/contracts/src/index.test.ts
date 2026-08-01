import { describe, expect, it } from "vitest";
import { calculateCommission, calculateLineTotal, canBindReferral, canTransitionOrder, idempotencyKeySchema } from "./index";

describe("交易契约", () => {
  it("只允许合法订单状态迁移", () => {
    expect(canTransitionOrder("PENDING_PAYMENT", "PAID")).toBe(true);
    expect(canTransitionOrder("PENDING_PAYMENT", "COMPLETED")).toBe(false);
    expect(canTransitionOrder("REFUNDED", "PAID")).toBe(false);
  });

  it("使用最小货币单位计算行金额", () => {
    expect(calculateLineTotal(5800, 2)).toBe(11600);
    expect(() => calculateLineTotal(1.2, 2)).toThrow(RangeError);
  });

  it("拒绝过短幂等键", () => {
    expect(idempotencyKeySchema.safeParse("short").success).toBe(false);
    expect(idempotencyKeySchema.safeParse("order_01J123456789ABCDEF").success).toBe(true);
  });

  it("佣金使用整数基点向下取整", () => {
    expect(calculateCommission(5800, 800)).toBe(464);
    expect(() => calculateCommission(5800, 6000)).toThrow(RangeError);
  });

  it("拒绝自邀与循环推广关系", () => {
    expect(canBindReferral("u1", "u1", [])).toBe(false);
    expect(canBindReferral("u1", "u2", ["u1"])).toBe(false);
    expect(canBindReferral("u1", "u2", ["u3"])).toBe(true);
  });
});
