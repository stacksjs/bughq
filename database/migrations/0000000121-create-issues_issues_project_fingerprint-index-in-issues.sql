CREATE UNIQUE INDEX IF NOT EXISTS "issues_issues_project_fingerprint" ON "issues" ("project_id", "fingerprint");
