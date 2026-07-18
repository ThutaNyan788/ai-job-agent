ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'user' NOT NULL;
--> statement-breakpoint
ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "user_role_check";
--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_role_check" CHECK ("role" IN ('user', 'company'));
--> statement-breakpoint
ALTER TABLE "job_posts" ADD COLUMN IF NOT EXISTS "owner_user_id" text;
--> statement-breakpoint
ALTER TABLE "job_posts" DROP CONSTRAINT IF EXISTS "job_posts_owner_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "job_posts" ADD CONSTRAINT "job_posts_owner_user_id_user_id_fk"
  FOREIGN KEY ("owner_user_id") REFERENCES "user"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_posts_owner_user_id_idx" ON "job_posts" USING btree ("owner_user_id");
