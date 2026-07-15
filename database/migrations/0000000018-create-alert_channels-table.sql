CREATE TABLE IF NOT EXISTS "alert_channels" (
  "id" varchar(255) PRIMARY KEY,
  "project_id" varchar(255) NOT NULL REFERENCES "projects" ("id"),
  "type" varchar(20) NOT NULL,
  "label" varchar(255),
  "webhook_url" text NOT NULL,
  "enabled" boolean NOT NULL DEFAULT true,
  "created_at" timestamp not null default CURRENT_TIMESTAMP,
  "updated_at" timestamp
);

CREATE INDEX IF NOT EXISTS "alert_channels_project" ON "alert_channels" ("project_id");
