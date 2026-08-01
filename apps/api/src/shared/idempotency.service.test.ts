import { describe, expect, it, vi } from "vitest";
import { IdempotencyService } from "./idempotency.service";

describe("幂等服务", () => {
  it("相同请求只执行一次", async () => {
    const service = new IdempotencyService();
    const work = vi.fn(async () => ({ orderId: "one" }));
    const first = await service.execute("order", "order_01J123456789ABCDEF", { amount: 5800 }, work);
    const second = await service.execute("order", "order_01J123456789ABCDEF", { amount: 5800 }, work);
    expect(first).toEqual(second);
    expect(work).toHaveBeenCalledTimes(1);
  });

  it("拒绝同一幂等键承载不同请求", async () => {
    const service = new IdempotencyService();
    await service.execute("order", "order_01J123456789ABCDE0", { amount: 5800 }, async () => ({ ok: true }));
    await expect(service.execute("order", "order_01J123456789ABCDE0", { amount: 6800 }, async () => ({ ok: true }))).rejects.toThrow("幂等键已用于不同请求");
  });

  it("并发重复请求共享同一执行结果", async () => {
    const service = new IdempotencyService();
    const work = vi.fn(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); return { orderId: "same" }; });
    const [a, b] = await Promise.all([
      service.execute("order", "order_01J123456789ABCXYZ", { amount: 5800 }, work),
      service.execute("order", "order_01J123456789ABCXYZ", { amount: 5800 }, work),
    ]);
    expect(a).toEqual(b);
    expect(work).toHaveBeenCalledTimes(1);
  });
});
