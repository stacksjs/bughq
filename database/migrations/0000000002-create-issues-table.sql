CREATE TABLE IF NOT EXISTS "issues" (
  "id" varchar(255) PRIMARY KEY,
  "project_id" varchar(255),
  "fingerprint" varchar(255),
  "title" text,
  "culprit" varchar(255),
  "error_type" varchar(255),
  "level" varchar(255),
  "status" varchar(255),
  "assignee" varchar(255),
  "count" integer,
  "users_affected" integer,
  "first_seen" varchar(255),
  "last_seen" varchar(255),
  "created_at" timestamp not null default CURRENT_TIMESTAMP,
  "updated_at" timestamp
);
