ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "display_name" varchar(80);

CREATE TABLE IF NOT EXISTS "inventory_reservations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE cascade,
  "sku_id" uuid NOT NULL REFERENCES "skus"("id"),
  "warehouse_id" uuid NOT NULL REFERENCES "warehouses"("id"),
  "quantity" integer NOT NULL,
  "status" varchar(24) DEFAULT 'LOCKED' NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "inventory_reservation_quantity_check" CHECK (quantity > 0)
);
CREATE INDEX IF NOT EXISTS "inventory_reservation_order_idx" ON "inventory_reservations" ("order_id");
CREATE INDEX IF NOT EXISTS "inventory_reservation_expiry_idx" ON "inventory_reservations" ("status", "expires_at");

ALTER TABLE "inventory" ADD CONSTRAINT "inventory_nonnegative_check"
  CHECK (available >= 0 AND locked >= 0 AND sold >= 0);
ALTER TABLE "skus" ADD CONSTRAINT "skus_money_commission_check"
  CHECK (price_minor >= 0 AND (compare_at_price_minor IS NULL OR compare_at_price_minor >= 0) AND commission_bps BETWEEN 0 AND 5000);
ALTER TABLE "orders" ADD CONSTRAINT "orders_money_check"
  CHECK (subtotal_minor >= 0 AND discount_minor >= 0 AND shipping_minor >= 0 AND total_minor >= 0 AND refunded_minor >= 0 AND refunded_minor <= total_minor);
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_values_check"
  CHECK (unit_price_minor >= 0 AND quantity > 0 AND total_minor >= 0);
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_amount_check" CHECK (amount_minor > 0);
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rating_check" CHECK (rating BETWEEN 1 AND 5);
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_amount_check" CHECK (amount_minor <> 0);
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_amount_check" CHECK (amount_minor > 0);
CREATE UNIQUE INDEX IF NOT EXISTS "commissions_order_item_beneficiary_unique" ON "commissions" ("order_item_id", "beneficiary_id") WHERE reversal_of_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "refunds_channel_refund_unique" ON "refunds" ("channel_refund_id") WHERE channel_refund_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS "sessions_active_user_idx" ON "sessions" ("user_id", "expires_at") WHERE revoked_at IS NULL;
