-- Compliance suppression list consulted by @stacksjs/email before every send
-- (bounces, complaints, unsubscribes, manual blocks). The mail layer fails
-- open when the table is missing on sqlite/mysql but not on postgres (its
-- missing-table matcher doesn't know postgres phrasing), so ship the table.
CREATE TABLE IF NOT EXISTS "email_suppressions" (
  "id" serial PRIMARY KEY,
  "email" varchar(255) NOT NULL,
  "type" varchar(32) NOT NULL,
  "reason" varchar(255),
  "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "email_suppressions_email_type_unique" ON "email_suppressions" ("email", "type");
