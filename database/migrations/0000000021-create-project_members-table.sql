-- Project collaborators. A project is owned by projects.owner_id; this table
-- holds everyone ELSE granted access, keyed by email so an invite works before
-- the person has signed up (access resolves the moment someone logs in with a
-- matching email). Deliberately NOT backed by an app/Models/*.ts: adding a model
-- makes the framework regenerate & renumber every migration from models and wipe
-- hand-written ones, so this table is managed via raw db.unsafe queries instead.
CREATE TABLE IF NOT EXISTS "project_members" (
  "id" varchar(255) PRIMARY KEY,
  "project_id" varchar(255) NOT NULL REFERENCES "projects" ("id"),
  "email" varchar(255) NOT NULL,
  "role" varchar(20) NOT NULL DEFAULT 'member',
  "created_at" timestamp not null default CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "project_members_project" ON "project_members" ("project_id");
-- One membership per (project, email); invites are idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS "project_members_project_email" ON "project_members" ("project_id", lower("email"));
-- Access lookups filter by the logged-in user's email across all their projects.
CREATE INDEX IF NOT EXISTS "project_members_email" ON "project_members" (lower("email"));
