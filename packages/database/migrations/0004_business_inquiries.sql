CREATE TABLE "business_inquiries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "reference" varchar(32) NOT NULL,
  "company" varchar(160) NOT NULL,
  "email_encrypted" text NOT NULL,
  "quantity" integer NOT NULL CHECK ("quantity" BETWEEN 10 AND 100000),
  "requirements_encrypted" text NOT NULL,
  "status" varchar(24) DEFAULT 'SUBMITTED' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "business_inquiry_reference_unique" ON "business_inquiries" USING btree ("reference");
CREATE INDEX "business_inquiry_status_idx" ON "business_inquiries" USING btree ("status","created_at");
