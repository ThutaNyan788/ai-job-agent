ALTER TABLE "candidate_profiles" ADD COLUMN IF NOT EXISTS "position" text;
--> statement-breakpoint
ALTER TABLE "candidate_profiles" ADD COLUMN IF NOT EXISTS "programming_languages" jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE "candidate_profiles" ADD COLUMN IF NOT EXISTS "project_count" real;
--> statement-breakpoint
ALTER TABLE "candidate_profiles" ADD COLUMN IF NOT EXISTS "project_details" text;
--> statement-breakpoint
ALTER TABLE "candidate_profiles" ADD COLUMN IF NOT EXISTS "country_region" text;
--> statement-breakpoint
ALTER TABLE "candidate_profiles" ADD COLUMN IF NOT EXISTS "job_type" text;
