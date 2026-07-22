ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "repository" varchar(255);
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "repository_branch" varchar(255);
