CREATE TABLE IF NOT EXISTS "autofix_runs" (
  "id" varchar(255) PRIMARY KEY,
  "issue_id" varchar(255) NOT NULL REFERENCES "issues" ("id"),
  "project_id" varchar(255) NOT NULL REFERENCES "projects" ("id"),
  "created_by" integer,
  "status" varchar(32) NOT NULL DEFAULT 'queued',
  "provider" varchar(32),
  "model" varchar(255),
  "root_cause" text,
  "plan" text,
  "changes" text,
  "branch_name" varchar(255),
  "pr_url" text,
  "pr_number" integer,
  "error" text,
  "started_at" timestamp,
  "completed_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp
);

CREATE INDEX IF NOT EXISTS "autofix_runs_issue_created" ON "autofix_runs" ("issue_id", "created_at");
CREATE INDEX IF NOT EXISTS "autofix_runs_project_status" ON "autofix_runs" ("project_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "autofix_runs_one_active_per_issue" ON "autofix_runs" ("issue_id")
WHERE "status" IN ('queued', 'analyzing', 'planning', 'editing', 'creating_pr');
