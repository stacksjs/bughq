CREATE TABLE IF NOT EXISTS "projects" (
  "id" varchar(255) PRIMARY KEY,
  "name" varchar(255),
  "platform" varchar(255),
  "dsn" varchar(255),
  "ingest_key" varchar(255),
  "owner_id" integer,
  "is_active" boolean,
  "created_at" timestamp not null default CURRENT_TIMESTAMP,
  "updated_at" timestamp
);
