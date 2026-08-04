ALTER TABLE "products" ADD COLUMN "source_external_id" varchar(100);
CREATE UNIQUE INDEX "products_merchant_external_unique" ON "products" USING btree ("merchant_id","source_external_id") WHERE "source_external_id" IS NOT NULL;
CREATE TABLE "import_job_rows" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "job_id" uuid NOT NULL REFERENCES "import_jobs"("id") ON DELETE cascade,
  "row_number" integer NOT NULL,
  "payload" jsonb NOT NULL,
  "status" varchar(24) NOT NULL,
  "errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "import_job_row_unique" ON "import_job_rows" USING btree ("job_id","row_number");
CREATE INDEX "import_job_rows_status_idx" ON "import_job_rows" USING btree ("job_id","status");
