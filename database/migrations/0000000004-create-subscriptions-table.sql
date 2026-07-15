CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" BIGSERIAL PRIMARY KEY,
  "type" text,
  "plan" varchar(100),
  "provider_id" varchar(255),
  "provider_status" varchar(255),
  "unit_price" integer,
  "provider_type" varchar(255),
  "provider_price_id" varchar(255),
  "quantity" integer,
  "trial_ends_at" timestamp,
  "ends_at" timestamp,
  "last_used_at" timestamp,
  "user_id" bigint,
  "uuid" varchar(255)
);
