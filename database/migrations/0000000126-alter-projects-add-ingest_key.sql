ALTER TABLE "projects" ADD COLUMN "ingest_key" varchar(255);
UPDATE "projects" SET "ingest_key" = md5(random()::text || clock_timestamp()::text || "id") WHERE "ingest_key" IS NULL;
