ALTER TABLE "candidate_profiles" ADD COLUMN IF NOT EXISTS "profile_data" jsonb;
--> statement-breakpoint
ALTER TABLE "candidate_profiles" ADD COLUMN IF NOT EXISTS "profile_status" text DEFAULT 'draft' NOT NULL;
--> statement-breakpoint
ALTER TABLE "candidate_profiles" ADD COLUMN IF NOT EXISTS "profile_source" text DEFAULT 'chat' NOT NULL;
--> statement-breakpoint
ALTER TABLE "candidate_profiles" ADD COLUMN IF NOT EXISTS "profile_revision" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE "candidate_profiles"
SET "profile_data" = jsonb_build_object(
  'fullName', NULL,
  'email', NULL,
  'phone', NULL,
  'location', "country_region",
  'links', '[]'::jsonb,
  'targetRole', "position",
  'summary', NULL,
  'skills', COALESCE("skills", '[]'::jsonb),
  'programmingLanguages', COALESCE("programming_languages", '[]'::jsonb),
  'workExperience', '[]'::jsonb,
  'education', '[]'::jsonb,
  'projects', CASE
    WHEN "project_details" IS NULL THEN '[]'::jsonb
    ELSE jsonb_build_array(jsonb_build_object(
      'name', 'Project',
      'description', "project_details",
      'technologies', '[]'::jsonb,
      'url', NULL
    ))
  END,
  'certifications', '[]'::jsonb,
  'spokenLanguages', '[]'::jsonb,
  'experienceYears', "experience_years",
  'countryRegion', "country_region",
  'jobType', "job_type"
)
WHERE "profile_data" IS NULL;
--> statement-breakpoint
ALTER TABLE "candidate_profiles" ALTER COLUMN "profile_data" SET NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cv_uploads" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "file_name" text NOT NULL,
  "mime_type" text NOT NULL,
  "data_base64" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cv_uploads_user_id_idx" ON "cv_uploads" ("user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cv_previews" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "profile_revision" integer NOT NULL,
  "profile_snapshot" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cv_previews_user_id_idx" ON "cv_previews" ("user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cv_documents" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "file_name" text NOT NULL,
  "data_base64" text NOT NULL,
  "profile_snapshot" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cv_documents_user_id_idx" ON "cv_documents" ("user_id");
