-- Pending project invitations. Separate from project_members (which grants
-- ACTIVE access): an invite is a not-yet-accepted offer, addressed to an email,
-- carrying a secret token that backs the join link emailed to the recipient.
-- Accepting moves the invite into project_members and deletes the invite row.
-- Like project_members, this is managed via raw db.unsafe queries (no model) to
-- avoid the framework regenerating & renumbering every migration from models.
CREATE TABLE IF NOT EXISTS "project_invites" (
  "id" varchar(255) PRIMARY KEY,
  "project_id" varchar(255) NOT NULL REFERENCES "projects" ("id"),
  "email" varchar(255) NOT NULL,
  "token" varchar(255) NOT NULL,
  "invited_by" integer,
  "created_at" timestamp not null default CURRENT_TIMESTAMP
);

-- The join link resolves an invite by its token.
CREATE UNIQUE INDEX IF NOT EXISTS "project_invites_token" ON "project_invites" ("token");
-- One outstanding invite per (project, email); re-inviting is idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS "project_invites_project_email" ON "project_invites" ("project_id", lower("email"));
-- The banner looks up a signed-in user's pending invites by their email.
CREATE INDEX IF NOT EXISTS "project_invites_email" ON "project_invites" (lower("email"));
