-- Applications had no timestamp, so a company-wide applicant list had no
-- meaningful order. Existing rows all take the migration time; only
-- applications made from here on sort truthfully.
ALTER TABLE "applications"
  ADD COLUMN IF NOT EXISTS "applied_at" timestamp DEFAULT now() NOT NULL;

CREATE INDEX IF NOT EXISTS "applications_job_id_idx" ON "applications" ("job_id");
