ALTER TABLE "error_events" ALTER COLUMN "message" TYPE varchar(10485760);
ALTER TABLE "error_events" ALTER COLUMN "stack" TYPE varchar(10485760);
ALTER TABLE "error_events" ALTER COLUMN "metadata" TYPE varchar(10485760);
ALTER TABLE "error_events" ALTER COLUMN "user_context" TYPE varchar(10485760);
ALTER TABLE "error_events" ALTER COLUMN "url" TYPE varchar(2048);
ALTER TABLE "error_events" ALTER COLUMN "user_agent" TYPE varchar(1024);
