CREATE INDEX IF NOT EXISTS "issues_issues_project_lastseen" ON "issues" ("project_id", "last_seen");
