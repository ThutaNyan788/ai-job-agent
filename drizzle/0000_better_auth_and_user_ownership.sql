-- Better Auth core schema. These tables are maintained through Drizzle migrations,
-- never through the server's boot-time DDL helper.
CREATE TABLE IF NOT EXISTS "user" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "email_verified" boolean NOT NULL,
  "image" text,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL,
  CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session" (
  "id" text PRIMARY KEY NOT NULL,
  "expires_at" timestamp NOT NULL,
  "token" text NOT NULL,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "session_user_id_idx" ON "session" USING btree ("user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "account" (
  "id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "access_token" text,
  "refresh_token" text,
  "id_token" text,
  "access_token_expires_at" timestamp,
  "refresh_token_expires_at" timestamp,
  "scope" text,
  "password" text,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "account_user_id_idx" ON "account" USING btree ("user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification" (
  "id" text PRIMARY KEY NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp,
  "updated_at" timestamp
);
--> statement-breakpoint
-- The prior schema keyed these rows by an anonymous browser session. The plan
-- intentionally removes that data instead of trying to associate it with users.
DROP TABLE IF EXISTS "applications";
--> statement-breakpoint
DROP TABLE IF EXISTS "candidate_profiles";
--> statement-breakpoint
CREATE TABLE "candidate_profiles" (
  "user_id" text PRIMARY KEY NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "skills" jsonb NOT NULL,
  "experience_years" real
);
--> statement-breakpoint
CREATE TABLE "applications" (
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "job_id" text NOT NULL,
  "workflow_id" text NOT NULL,
  "status" text NOT NULL,
  PRIMARY KEY("user_id", "job_id")
);
--> statement-breakpoint
CREATE INDEX "applications_user_workflow_idx" ON "applications" USING btree ("user_id", "workflow_id");
