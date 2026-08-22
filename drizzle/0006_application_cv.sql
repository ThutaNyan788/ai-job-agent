CREATE TABLE IF NOT EXISTS "application_cv" (
  "user_id" text NOT NULL,
  "job_id" text NOT NULL,
  "file_name" text NOT NULL,
  "mime_type" text NOT NULL,
  "data_base64" text NOT NULL,
  "source" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("user_id", "job_id"),
  FOREIGN KEY ("user_id", "job_id") REFERENCES "applications"("user_id", "job_id") ON DELETE CASCADE
);
