-- The framework's password-reset flow stamps an explicit expiry on each token
-- row (@stacksjs/auth passwordResets.createResetToken); older installs created
-- the table without it and the insert hard-fails. Also enforce one outstanding
-- token per email at the DB layer (the code deletes-then-inserts already).
ALTER TABLE "password_resets" ADD COLUMN IF NOT EXISTS "expires_at" timestamp;
CREATE UNIQUE INDEX IF NOT EXISTS "password_resets_email_unique" ON "password_resets" ("email");
