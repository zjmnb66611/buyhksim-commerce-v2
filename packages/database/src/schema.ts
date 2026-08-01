import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const userStatus = pgEnum("user_status", ["PENDING", "ACTIVE", "SUSPENDED", "DELETED"]);
export const productStatus = pgEnum("product_status", ["DRAFT", "PENDING_REVIEW", "SCHEDULED", "ACTIVE", "INACTIVE", "REJECTED"]);
export const orderStatus = pgEnum("order_status", ["PENDING_PAYMENT", "PAID", "FULFILLING", "COMPLETED", "CLOSED", "AFTER_SALE", "REFUNDED"]);
export const paymentStatus = pgEnum("payment_status", ["CREATED", "PENDING", "SUCCEEDED", "FAILED", "CLOSED"]);
export const simKind = pgEnum("sim_kind", ["ESIM", "PHYSICAL_SIM"]);

export const merchants = pgTable("merchants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 160 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("PENDING"),
  ...timestamps,
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  merchantId: uuid("merchant_id").references(() => merchants.id),
  email: varchar("email", { length: 254 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  passwordHash: text("password_hash").notNull(),
  locale: varchar("locale", { length: 16 }).notNull().default("zh-CN"),
  status: userStatus("status").notNull().default("ACTIVE"),
  points: integer("points").notNull().default(0),
  membershipLevel: varchar("membership_level", { length: 32 }).notNull().default("STANDARD"),
  ...timestamps,
}, (t) => [uniqueIndex("users_email_unique").on(t.email), index("users_merchant_idx").on(t.merchantId)]);

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  ipHash: text("ip_hash"),
  userAgent: text("user_agent"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  ...timestamps,
}, (t) => [uniqueIndex("sessions_token_hash_unique").on(t.tokenHash), index("sessions_user_idx").on(t.userId)]);

export const roles = pgTable("roles", { id: uuid("id").primaryKey().defaultRandom(), code: varchar("code", { length: 80 }).notNull(), name: varchar("name", { length: 120 }).notNull(), ...timestamps }, (t) => [uniqueIndex("roles_code_unique").on(t.code)]);
export const permissions = pgTable("permissions", { id: uuid("id").primaryKey().defaultRandom(), code: varchar("code", { length: 120 }).notNull(), description: text("description"), ...timestamps }, (t) => [uniqueIndex("permissions_code_unique").on(t.code)]);
export const userRoles = pgTable("user_roles", { userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }) }, (t) => [primaryKey({ columns: [t.userId, t.roleId] })]);

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  merchantId: uuid("merchant_id").notNull().references(() => merchants.id),
  slug: varchar("slug", { length: 180 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description").notNull(),
  destination: varchar("destination", { length: 80 }).notNull(),
  kind: simKind("kind").notNull(),
  status: productStatus("status").notNull().default("DRAFT"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  ...timestamps,
}, (t) => [uniqueIndex("products_merchant_slug_unique").on(t.merchantId, t.slug), index("products_catalog_idx").on(t.status, t.destination)]);

export const productMedia = pgTable("product_media", { id: uuid("id").primaryKey().defaultRandom(), productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }), url: text("url").notNull(), alt: varchar("alt", { length: 240 }).notNull(), sortOrder: integer("sort_order").notNull().default(0), ...timestamps });

export const skus = pgTable("skus", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 80 }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  priceMinor: integer("price_minor").notNull(),
  compareAtPriceMinor: integer("compare_at_price_minor"),
  currency: varchar("currency", { length: 3 }).notNull().default("CNY"),
  attributes: jsonb("attributes").notNull().default({}),
  commissionBps: integer("commission_bps").notNull().default(0),
  active: boolean("active").notNull().default(true),
  ...timestamps,
}, (t) => [uniqueIndex("skus_code_unique").on(t.code), index("skus_product_idx").on(t.productId)]);

export const warehouses = pgTable("warehouses", { id: uuid("id").primaryKey().defaultRandom(), merchantId: uuid("merchant_id").notNull().references(() => merchants.id), name: varchar("name", { length: 120 }).notNull(), code: varchar("code", { length: 40 }).notNull(), kind: varchar("kind", { length: 24 }).notNull(), ...timestamps }, (t) => [uniqueIndex("warehouse_merchant_code_unique").on(t.merchantId, t.code)]);
export const inventory = pgTable("inventory", { skuId: uuid("sku_id").notNull().references(() => skus.id), warehouseId: uuid("warehouse_id").notNull().references(() => warehouses.id), available: integer("available").notNull().default(0), locked: integer("locked").notNull().default(0), sold: integer("sold").notNull().default(0), version: integer("version").notNull().default(0), ...timestamps }, (t) => [primaryKey({ columns: [t.skuId, t.warehouseId] })]);

export const carts = pgTable("carts", { id: uuid("id").primaryKey().defaultRandom(), userId: uuid("user_id").references(() => users.id), guestTokenHash: text("guest_token_hash"), currency: varchar("currency", { length: 3 }).notNull().default("CNY"), expiresAt: timestamp("expires_at", { withTimezone: true }), ...timestamps });
export const cartLines = pgTable("cart_lines", { id: uuid("id").primaryKey().defaultRandom(), cartId: uuid("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" }), skuId: uuid("sku_id").notNull().references(() => skus.id), quantity: integer("quantity").notNull(), ...timestamps }, (t) => [uniqueIndex("cart_sku_unique").on(t.cartId, t.skuId)]);
export const favorites = pgTable("favorites", { userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (t) => [primaryKey({ columns: [t.userId, t.productId] })]);

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(), orderNo: varchar("order_no", { length: 32 }).notNull(), userId: uuid("user_id").references(() => users.id), merchantId: uuid("merchant_id").notNull().references(() => merchants.id), status: orderStatus("status").notNull().default("PENDING_PAYMENT"), currency: varchar("currency", { length: 3 }).notNull(), subtotalMinor: integer("subtotal_minor").notNull(), discountMinor: integer("discount_minor").notNull().default(0), shippingMinor: integer("shipping_minor").notNull().default(0), totalMinor: integer("total_minor").notNull(), refundedMinor: integer("refunded_minor").notNull().default(0), addressSnapshot: jsonb("address_snapshot"), pricingSnapshot: jsonb("pricing_snapshot").notNull(), expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), version: integer("version").notNull().default(0), ...timestamps,
}, (t) => [uniqueIndex("orders_order_no_unique").on(t.orderNo), index("orders_user_idx").on(t.userId, t.createdAt), index("orders_merchant_idx").on(t.merchantId, t.createdAt)]);

export const orderItems = pgTable("order_items", { id: uuid("id").primaryKey().defaultRandom(), orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }), skuId: uuid("sku_id").notNull().references(() => skus.id), titleSnapshot: varchar("title_snapshot", { length: 240 }).notNull(), skuSnapshot: jsonb("sku_snapshot").notNull(), unitPriceMinor: integer("unit_price_minor").notNull(), quantity: integer("quantity").notNull(), totalMinor: integer("total_minor").notNull(), ...timestamps });

export const payments = pgTable("payments", { id: uuid("id").primaryKey().defaultRandom(), orderId: uuid("order_id").notNull().references(() => orders.id), channel: varchar("channel", { length: 24 }).notNull(), status: paymentStatus("status").notNull().default("CREATED"), amountMinor: integer("amount_minor").notNull(), currency: varchar("currency", { length: 3 }).notNull(), channelTransactionId: varchar("channel_transaction_id", { length: 128 }), rawMetadata: jsonb("raw_metadata").notNull().default({}), ...timestamps }, (t) => [uniqueIndex("payments_channel_tx_unique").on(t.channel, t.channelTransactionId), index("payments_order_idx").on(t.orderId)]);
export const refunds = pgTable("refunds", { id: uuid("id").primaryKey().defaultRandom(), orderId: uuid("order_id").notNull().references(() => orders.id), paymentId: uuid("payment_id").notNull().references(() => payments.id), amountMinor: integer("amount_minor").notNull(), reason: text("reason").notNull(), status: varchar("status", { length: 24 }).notNull(), channelRefundId: varchar("channel_refund_id", { length: 128 }), ...timestamps });

export const coupons = pgTable("coupons", { id: uuid("id").primaryKey().defaultRandom(), merchantId: uuid("merchant_id").references(() => merchants.id), code: varchar("code", { length: 64 }).notNull(), ruleSnapshot: jsonb("rule_snapshot").notNull(), totalQuota: integer("total_quota").notNull(), claimed: integer("claimed").notNull().default(0), startsAt: timestamp("starts_at", { withTimezone: true }).notNull(), endsAt: timestamp("ends_at", { withTimezone: true }).notNull(), ...timestamps }, (t) => [uniqueIndex("coupons_code_unique").on(t.code)]);

export const distributorRelations = pgTable("distributor_relations", { ancestorId: uuid("ancestor_id").notNull().references(() => users.id), descendantId: uuid("descendant_id").notNull().references(() => users.id), depth: integer("depth").notNull(), channelCode: varchar("channel_code", { length: 80 }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (t) => [primaryKey({ columns: [t.ancestorId, t.descendantId] }), index("distribution_descendant_idx").on(t.descendantId)]);
export const commissions = pgTable("commissions", { id: uuid("id").primaryKey().defaultRandom(), beneficiaryId: uuid("beneficiary_id").notNull().references(() => users.id), orderItemId: uuid("order_item_id").notNull().references(() => orderItems.id), amountMinor: integer("amount_minor").notNull(), currency: varchar("currency", { length: 3 }).notNull(), status: varchar("status", { length: 24 }).notNull(), availableAt: timestamp("available_at", { withTimezone: true }).notNull(), reversalOfId: uuid("reversal_of_id"), ...timestamps });
export const withdrawals = pgTable("withdrawals", { id: uuid("id").primaryKey().defaultRandom(), userId: uuid("user_id").notNull().references(() => users.id), amountMinor: integer("amount_minor").notNull(), currency: varchar("currency", { length: 3 }).notNull(), status: varchar("status", { length: 24 }).notNull(), payoutSnapshot: jsonb("payout_snapshot").notNull(), reviewedBy: uuid("reviewed_by").references(() => users.id), ...timestamps });

export const importJobs = pgTable("import_jobs", { id: uuid("id").primaryKey().defaultRandom(), merchantId: uuid("merchant_id").notNull().references(() => merchants.id), idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(), filename: varchar("filename", { length: 240 }).notNull(), status: varchar("status", { length: 24 }).notNull(), totalRows: integer("total_rows").notNull().default(0), validRows: integer("valid_rows").notNull().default(0), errorRows: integer("error_rows").notNull().default(0), errorReportUrl: text("error_report_url"), ...timestamps }, (t) => [uniqueIndex("import_job_idempotency_unique").on(t.merchantId, t.idempotencyKey)]);
export const idempotencyRecords = pgTable("idempotency_records", { scope: varchar("scope", { length: 80 }).notNull(), key: varchar("key", { length: 128 }).notNull(), requestHash: text("request_hash").notNull(), responseStatus: integer("response_status"), responseBody: jsonb("response_body"), expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), ...timestamps }, (t) => [primaryKey({ columns: [t.scope, t.key] })]);
export const outboxEvents = pgTable("outbox_events", { id: uuid("id").primaryKey().defaultRandom(), aggregateType: varchar("aggregate_type", { length: 80 }).notNull(), aggregateId: uuid("aggregate_id").notNull(), eventType: varchar("event_type", { length: 120 }).notNull(), payload: jsonb("payload").notNull(), occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(), publishedAt: timestamp("published_at", { withTimezone: true }), attempts: integer("attempts").notNull().default(0) }, (t) => [index("outbox_pending_idx").on(t.publishedAt, t.occurredAt)]);
export const auditLogs = pgTable("audit_logs", { id: uuid("id").primaryKey().defaultRandom(), actorId: uuid("actor_id").references(() => users.id), merchantId: uuid("merchant_id").references(() => merchants.id), action: varchar("action", { length: 120 }).notNull(), targetType: varchar("target_type", { length: 80 }).notNull(), targetId: varchar("target_id", { length: 120 }), requestId: varchar("request_id", { length: 80 }).notNull(), ipHash: text("ip_hash"), before: jsonb("before"), after: jsonb("after"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (t) => [index("audit_target_idx").on(t.targetType, t.targetId), index("audit_actor_idx").on(t.actorId, t.createdAt)]);
export const riskEvents = pgTable("risk_events", { id: uuid("id").primaryKey().defaultRandom(), userId: uuid("user_id").references(() => users.id), kind: varchar("kind", { length: 80 }).notNull(), score: integer("score").notNull(), decision: varchar("decision", { length: 24 }).notNull(), signals: jsonb("signals").notNull(), requestId: varchar("request_id", { length: 80 }).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() });
export const aiAuditLogs = pgTable("ai_audit_logs", { id: uuid("id").primaryKey().defaultRandom(), userId: uuid("user_id").references(() => users.id), sessionId: varchar("session_id", { length: 100 }).notNull(), intent: varchar("intent", { length: 80 }).notNull(), toolName: varchar("tool_name", { length: 120 }), inputRedacted: jsonb("input_redacted").notNull(), outputRedacted: jsonb("output_redacted").notNull(), decision: varchar("decision", { length: 24 }).notNull(), requestId: varchar("request_id", { length: 80 }).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() });

export const addresses = pgTable("addresses", { id: uuid("id").primaryKey().defaultRandom(), userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), name: varchar("name", { length: 80 }).notNull(), phoneEncrypted: text("phone_encrypted").notNull(), country: varchar("country", { length: 80 }).notNull(), province: varchar("province", { length: 80 }), city: varchar("city", { length: 80 }), district: varchar("district", { length: 80 }), detailEncrypted: text("detail_encrypted").notNull(), postalCode: varchar("postal_code", { length: 24 }), isDefault: boolean("is_default").notNull().default(false), ...timestamps }, (t) => [index("addresses_user_idx").on(t.userId)]);
export const invoices = pgTable("invoices", { id: uuid("id").primaryKey().defaultRandom(), userId: uuid("user_id").notNull().references(() => users.id), orderId: uuid("order_id").references(() => orders.id), kind: varchar("kind", { length: 24 }).notNull(), title: varchar("title", { length: 180 }).notNull(), taxNumberEncrypted: text("tax_number_encrypted"), emailEncrypted: text("email_encrypted"), status: varchar("status", { length: 24 }).notNull().default("PENDING"), ...timestamps });
export const shipments = pgTable("shipments", { id: uuid("id").primaryKey().defaultRandom(), orderId: uuid("order_id").notNull().references(() => orders.id), carrier: varchar("carrier", { length: 80 }).notNull(), trackingNoEncrypted: text("tracking_no_encrypted").notNull(), status: varchar("status", { length: 32 }).notNull(), events: jsonb("events").notNull().default([]), ...timestamps }, (t) => [index("shipments_order_idx").on(t.orderId)]);
export const esimProfiles = pgTable("esim_profiles", { id: uuid("id").primaryKey().defaultRandom(), orderItemId: uuid("order_item_id").notNull().references(() => orderItems.id), encryptedPayload: text("encrypted_payload").notNull(), kmsKeyVersion: varchar("kms_key_version", { length: 120 }).notNull(), state: varchar("state", { length: 24 }).notNull().default("ALLOCATED"), revealCount: integer("reveal_count").notNull().default(0), lastRevealedAt: timestamp("last_revealed_at", { withTimezone: true }), ...timestamps }, (t) => [uniqueIndex("esim_order_item_unique").on(t.orderItemId)]);
export const afterSales = pgTable("after_sales", { id: uuid("id").primaryKey().defaultRandom(), orderId: uuid("order_id").notNull().references(() => orders.id), userId: uuid("user_id").notNull().references(() => users.id), type: varchar("type", { length: 24 }).notNull(), reason: text("reason").notNull(), evidence: jsonb("evidence").notNull().default([]), status: varchar("status", { length: 24 }).notNull().default("SUBMITTED"), requestedAmountMinor: integer("requested_amount_minor"), version: integer("version").notNull().default(0), ...timestamps }, (t) => [index("after_sales_order_idx").on(t.orderId)]);
export const reviews = pgTable("reviews", { id: uuid("id").primaryKey().defaultRandom(), orderItemId: uuid("order_item_id").notNull().references(() => orderItems.id), userId: uuid("user_id").notNull().references(() => users.id), rating: integer("rating").notNull(), content: text("content").notNull(), media: jsonb("media").notNull().default([]), status: varchar("status", { length: 24 }).notNull().default("PENDING"), ...timestamps }, (t) => [uniqueIndex("review_order_item_unique").on(t.orderItemId)]);
export const notifications = pgTable("notifications", { id: uuid("id").primaryKey().defaultRandom(), userId: uuid("user_id").notNull().references(() => users.id), channel: varchar("channel", { length: 24 }).notNull(), template: varchar("template", { length: 80 }).notNull(), payload: jsonb("payload").notNull(), status: varchar("status", { length: 24 }).notNull().default("PENDING"), readAt: timestamp("read_at", { withTimezone: true }), ...timestamps }, (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)]);
export const supportTickets = pgTable("support_tickets", { id: uuid("id").primaryKey().defaultRandom(), userId: uuid("user_id").references(() => users.id), orderId: uuid("order_id").references(() => orders.id), subject: varchar("subject", { length: 180 }).notNull(), priority: varchar("priority", { length: 24 }).notNull().default("NORMAL"), status: varchar("status", { length: 24 }).notNull().default("OPEN"), assignedTo: uuid("assigned_to").references(() => users.id), transcript: jsonb("transcript").notNull().default([]), ...timestamps });
export const pointLedger = pgTable("point_ledger", { id: uuid("id").primaryKey().defaultRandom(), userId: uuid("user_id").notNull().references(() => users.id), change: integer("change").notNull(), balanceAfter: integer("balance_after").notNull(), reason: varchar("reason", { length: 80 }).notNull(), referenceType: varchar("reference_type", { length: 80 }), referenceId: varchar("reference_id", { length: 120 }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (t) => [index("points_user_idx").on(t.userId, t.createdAt)]);
export const couponClaims = pgTable("coupon_claims", { couponId: uuid("coupon_id").notNull().references(() => coupons.id), userId: uuid("user_id").notNull().references(() => users.id), status: varchar("status", { length: 24 }).notNull().default("AVAILABLE"), orderId: uuid("order_id").references(() => orders.id), claimedAt: timestamp("claimed_at", { withTimezone: true }).notNull().defaultNow(), usedAt: timestamp("used_at", { withTimezone: true }) }, (t) => [primaryKey({ columns: [t.couponId, t.userId] })]);
export const reconciliationResults = pgTable("reconciliation_results", { id: uuid("id").primaryKey().defaultRandom(), channel: varchar("channel", { length: 24 }).notNull(), businessDate: timestamp("business_date", { withTimezone: true }).notNull(), status: varchar("status", { length: 24 }).notNull(), matchedCount: integer("matched_count").notNull().default(0), mismatchCount: integer("mismatch_count").notNull().default(0), reportUrl: text("report_url"), details: jsonb("details").notNull().default({}), ...timestamps }, (t) => [uniqueIndex("reconciliation_channel_date_unique").on(t.channel, t.businessDate)]);
export const cmsContents = pgTable("cms_contents", { id: uuid("id").primaryKey().defaultRandom(), merchantId: uuid("merchant_id").references(() => merchants.id), key: varchar("key", { length: 120 }).notNull(), locale: varchar("locale", { length: 16 }).notNull(), title: varchar("title", { length: 240 }).notNull(), body: jsonb("body").notNull(), status: varchar("status", { length: 24 }).notNull().default("DRAFT"), publishedAt: timestamp("published_at", { withTimezone: true }), ...timestamps }, (t) => [uniqueIndex("cms_key_locale_unique").on(t.merchantId, t.key, t.locale)]);
