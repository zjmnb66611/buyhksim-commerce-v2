import { z } from "zod";

export const currencySchema = z.enum(["CNY", "HKD", "USD"]);
export type Currency = z.infer<typeof currencySchema>;

export const moneySchema = z.object({
  amount: z.number().int().nonnegative(),
  currency: currencySchema,
});
export type Money = z.infer<typeof moneySchema>;

export const productStatusSchema = z.enum([
  "DRAFT",
  "PENDING_REVIEW",
  "SCHEDULED",
  "ACTIVE",
  "INACTIVE",
  "REJECTED",
]);

export const orderStatusSchema = z.enum([
  "PENDING_PAYMENT",
  "PAID",
  "FULFILLING",
  "COMPLETED",
  "CLOSED",
  "AFTER_SALE",
  "REFUNDED",
]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const paymentChannelSchema = z.enum(["WECHAT", "ALIPAY", "UNIONPAY"]);
export type PaymentChannel = z.infer<typeof paymentChannelSchema>;

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string(),
  recoverable: z.boolean(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export const apiResponseSchema = <T extends z.ZodType>(data: T) =>
  z.discriminatedUnion("ok", [
    z.object({ ok: z.literal(true), data, requestId: z.string() }),
    z.object({ ok: z.literal(false), error: apiErrorSchema }),
  ]);

export const cartLineSchema = z.object({
  skuId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
});

export const checkoutPreviewRequestSchema = z.object({
  lines: z.array(cartLineSchema).min(1).max(100),
  couponCode: z.string().trim().max(64).optional(),
  pointsToUse: z.number().int().nonnegative().default(0),
  addressId: z.string().uuid().optional(),
});

export const createOrderRequestSchema = checkoutPreviewRequestSchema.extend({
  previewToken: z.string().min(24),
  invoiceId: z.string().uuid().optional(),
});

export const batchImportRowSchema = z.object({
  externalId: z.string().trim().min(1).max(100),
  title: z.string().trim().min(2).max(180),
  skuCode: z.string().trim().min(1).max(80),
  destination: z.string().trim().min(1).max(80),
  kind: z.enum(["ESIM", "PHYSICAL_SIM"]),
  dataGb: z.number().positive().nullable(),
  validityDays: z.number().int().positive().max(365),
  priceMinor: z.number().int().nonnegative(),
  stock: z.number().int().nonnegative(),
  commissionBps: z.number().int().min(0).max(5000).default(0),
});

export const idempotencyKeySchema = z
  .string()
  .trim()
  .min(16)
  .max(128)
  .regex(/^[A-Za-z0-9:_-]+$/);

const transitions: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  PENDING_PAYMENT: ["PAID", "CLOSED"],
  PAID: ["FULFILLING", "AFTER_SALE", "REFUNDED"],
  FULFILLING: ["COMPLETED", "AFTER_SALE", "REFUNDED"],
  COMPLETED: ["AFTER_SALE", "REFUNDED"],
  CLOSED: [],
  AFTER_SALE: ["FULFILLING", "COMPLETED", "REFUNDED"],
  REFUNDED: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return transitions[from].includes(to);
}

export function calculateLineTotal(unitPriceMinor: number, quantity: number): number {
  if (!Number.isSafeInteger(unitPriceMinor) || unitPriceMinor < 0) {
    throw new RangeError("unitPriceMinor 必须是非负安全整数");
  }
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new RangeError("quantity 必须是正安全整数");
  }
  const total = unitPriceMinor * quantity;
  if (!Number.isSafeInteger(total)) throw new RangeError("金额超出安全整数范围");
  return total;
}

export function calculateCommission(commissionBaseMinor: number, commissionBps: number): number {
  if (!Number.isSafeInteger(commissionBaseMinor) || commissionBaseMinor < 0) throw new RangeError("佣金基数必须是非负安全整数");
  if (!Number.isSafeInteger(commissionBps) || commissionBps < 0 || commissionBps > 5000) throw new RangeError("佣金比例必须在 0 到 5000 基点之间");
  return Math.floor((commissionBaseMinor * commissionBps) / 10_000);
}

export function canBindReferral(userId: string, inviterId: string, ancestorIds: readonly string[]): boolean {
  return userId !== inviterId && !ancestorIds.includes(userId);
}
