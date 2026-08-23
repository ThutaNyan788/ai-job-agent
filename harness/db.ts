import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { bigserial, index, integer, jsonb, pgTable, primaryKey, real, text, timestamp } from "drizzle-orm/pg-core";
import type { AgentEvent, ApplicationStatus, JobPost } from "@shared/events";
import {
  candidateProfileContentSchema,
  EMPTY_CANDIDATE_PROFILE,
  type CandidateProfile,
  type CandidateProfileContent,
  type CandidateProfilePatch,
  type CvPreview,
} from "@shared/candidate";

export type { CandidateProfile } from "@shared/candidate";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set - copy .dev.vars.example to .dev.vars.");
}

const client = postgres(connectionString, { max: 5 });
export const db = drizzle(client);

export async function closeDatabase(): Promise<void> {
  await client.end({ timeout: 5 });
}

export const eventLog = pgTable("event_log", {
  seq: bigserial("seq", { mode: "number" }).primaryKey(),
  data: jsonb("data").$type<AgentEvent>().notNull(),
});

export const jobPosts = pgTable(
  "job_posts",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id"),
    data: jsonb("data").$type<JobPost>().notNull(),
  },
  (table) => [index("job_posts_owner_user_id_idx").on(table.ownerUserId)],
);

export const candidateProfiles = pgTable("candidate_profiles", {
  userId: text("user_id").primaryKey(),
  // Legacy columns remain during the migration window. New code uses profileData.
  position: text("position"),
  programmingLanguages: jsonb("programming_languages").$type<string[]>().notNull(),
  projectCount: real("project_count"),
  projectDetails: text("project_details"),
  skills: jsonb("skills").$type<string[]>().notNull(),
  experienceYears: real("experience_years"),
  countryRegion: text("country_region"),
  jobType: text("job_type").$type<CandidateProfile["jobType"]>(),
  profileData: jsonb("profile_data").$type<CandidateProfileContent>().notNull(),
  profileStatus: text("profile_status").$type<CandidateProfile["status"]>().notNull(),
  profileSource: text("profile_source").$type<CandidateProfile["source"]>().notNull(),
  profileRevision: integer("profile_revision").notNull(),
});

export const cvUploads = pgTable(
  "cv_uploads",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    dataBase64: text("data_base64"),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [index("cv_uploads_user_id_idx").on(table.userId)],
);

export const cvPreviews = pgTable(
  "cv_previews",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    profileRevision: integer("profile_revision").notNull(),
    profileSnapshot: jsonb("profile_snapshot").$type<CandidateProfileContent>().notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [index("cv_previews_user_id_idx").on(table.userId)],
);

export const cvDocuments = pgTable(
  "cv_documents",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    fileName: text("file_name").notNull(),
    dataBase64: text("data_base64").notNull(),
    profileSnapshot: jsonb("profile_snapshot").$type<CandidateProfileContent>().notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [index("cv_documents_user_id_idx").on(table.userId)],
);

export const applicationCv = pgTable(
  "application_cv",
  {
    userId: text("user_id").notNull(),
    jobId: text("job_id").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    dataBase64: text("data_base64").notNull(),
    source: text("source").$type<"uploaded" | "generated">().notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.jobId] })],
);

export type ApplicationRecord = {
  userId: string;
  jobId: string;
  workflowId: string;
  status: ApplicationStatus;
};

export const applications = pgTable(
  "applications",
  {
    userId: text("user_id").notNull(),
    jobId: text("job_id").notNull(),
    workflowId: text("workflow_id").notNull(),
    status: text("status").$type<ApplicationStatus>().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.jobId] })],
);

// The durable event-log table predates the migration system. All user-owned
// tables and Better Auth tables are created by `npm run db:migrate`.
export async function ensureSchema(): Promise<void> {
  await client`
    CREATE TABLE IF NOT EXISTS event_log (
      seq bigserial PRIMARY KEY,
      data jsonb NOT NULL
    )
  `;
}

export async function ensureAuthSchema(): Promise<void> {
  const rows = await client<{ auth_user_table: string | null }[]>`
    SELECT to_regclass('public."user"') AS auth_user_table
  `;
  if (!rows[0]?.auth_user_table) {
    throw new Error(
      "Better Auth tables are missing. Run `npm run db:migrate` against the same DATABASE_URL, then restart the server.",
    );
  }
}

export async function clearEventLog(userId: string): Promise<void> {
  await client`DELETE FROM event_log WHERE data->>'userId' = ${userId}`;
}

function normalizeLabels(skills: string[]): string[] {
  return [...new Set(skills.map((skill) => skill.trim().toLowerCase()).filter(Boolean))];
}

export async function loadCandidateProfile(userId: string): Promise<CandidateProfile> {
  const rows = await client<{
    profile_data: CandidateProfileContent;
    profile_status: CandidateProfile["status"];
    profile_source: CandidateProfile["source"];
    profile_revision: number;
  }[]>`
    SELECT profile_data, profile_status, profile_source, profile_revision
    FROM candidate_profiles WHERE user_id = ${userId}
  `;
  const profile = rows[0];
  if (!profile) return structuredClone(EMPTY_CANDIDATE_PROFILE);
  return {
    ...candidateProfileContentSchema.parse(profile.profile_data),
    status: profile.profile_status,
    source: profile.profile_source,
    revision: profile.profile_revision,
  };
}

function mergeStringList(current: string[], update: string[] | undefined): string[] {
  return update === undefined ? current : normalizeLabels([...current, ...update]);
}

function mergeEntries<T>(
  current: T[],
  update: T[] | undefined,
  key: (entry: T) => string,
): T[] {
  if (update === undefined) return current;
  const merged = new Map(current.map((entry) => [key(entry), entry]));
  for (const entry of update) {
    const entryKey = key(entry);
    merged.set(entryKey, { ...(merged.get(entryKey) ?? {}), ...entry });
  }
  return [...merged.values()];
}

export async function saveCandidateProfile(
  userId: string,
  update: CandidateProfilePatch,
): Promise<CandidateProfile> {
  const current = await loadCandidateProfile(userId);
  const profile: CandidateProfile = {
    ...current,
    ...Object.fromEntries(
      Object.entries(update).filter(([, value]) => value !== undefined),
    ),
    links: update.replace
      ? update.links ?? []
      : mergeEntries(current.links, update.links, (entry) => entry.url.toLowerCase()),
    skills: update.replace ? update.skills ?? [] : mergeStringList(current.skills, update.skills),
    programmingLanguages: update.replace
      ? update.programmingLanguages ?? []
      : mergeStringList(current.programmingLanguages, update.programmingLanguages),
    workExperience: update.replace
      ? update.workExperience ?? []
      : mergeEntries(
          current.workExperience,
          update.workExperience,
          (entry) => `${entry.company}|${entry.title}|${entry.startDate}`.toLowerCase(),
        ),
    education: update.replace
      ? update.education ?? []
      : mergeEntries(
          current.education,
          update.education,
          (entry) => `${entry.institution}|${entry.qualification}`.toLowerCase(),
        ),
    projects: update.replace
      ? update.projects ?? []
      : mergeEntries(current.projects, update.projects, (entry) => entry.name.toLowerCase()),
    certifications: update.replace
      ? update.certifications ?? []
      : mergeStringList(current.certifications, update.certifications),
    spokenLanguages: update.replace
      ? update.spokenLanguages ?? []
      : mergeStringList(current.spokenLanguages, update.spokenLanguages),
    source: update.source ?? current.source,
    status: update.status ?? "draft",
    revision: current.revision + 1,
  };
  const content = candidateProfileContentSchema.parse(profile);
  await client`
    INSERT INTO candidate_profiles (
      user_id, position, programming_languages, project_count, project_details,
      skills, experience_years, country_region, job_type, profile_data,
      profile_status, profile_source, profile_revision
    )
    VALUES (
      ${userId}, ${profile.targetRole}, ${JSON.stringify(profile.programmingLanguages)}::jsonb,
      ${profile.projects.length}, ${profile.projects[0]?.description ?? null},
      ${JSON.stringify(profile.skills)}::jsonb, ${profile.experienceYears},
      ${profile.countryRegion}, ${profile.jobType}, ${JSON.stringify(content)}::jsonb,
      ${profile.status}, ${profile.source}, ${profile.revision}
    )
    ON CONFLICT (user_id) DO UPDATE SET
      position = EXCLUDED.position, programming_languages = EXCLUDED.programming_languages,
      project_count = EXCLUDED.project_count, project_details = EXCLUDED.project_details,
      skills = EXCLUDED.skills, experience_years = EXCLUDED.experience_years,
      country_region = EXCLUDED.country_region, job_type = EXCLUDED.job_type,
      profile_data = EXCLUDED.profile_data, profile_status = EXCLUDED.profile_status,
      profile_source = EXCLUDED.profile_source, profile_revision = EXCLUDED.profile_revision
  `;
  return profile;
}

export async function clearCandidateProfile(userId: string): Promise<void> {
  await client`DELETE FROM candidate_profiles WHERE user_id = ${userId}`;
  await client`DELETE FROM applications WHERE user_id = ${userId}`;
  await client`DELETE FROM cv_uploads WHERE user_id = ${userId}`;
  await client`DELETE FROM cv_previews WHERE user_id = ${userId}`;
  await client`DELETE FROM cv_documents WHERE user_id = ${userId}`;
}

export type CvUploadRecord = {
  id: string;
  fileName: string;
  mimeType: string;
  data: Buffer;
};

export async function saveCvUpload(
  userId: string,
  fileName: string,
  mimeType: string,
  data: Buffer,
): Promise<{ id: string; fileName: string }> {
  const id = `upload_${crypto.randomUUID()}`;
  await client`
    DELETE FROM cv_uploads
    WHERE created_at < now() - interval '24 hours'
  `;
  await client`
    INSERT INTO cv_uploads (id, user_id, file_name, mime_type, data_base64)
    VALUES (${id}, ${userId}, ${fileName}, ${mimeType}, ${data.toString("base64")})
  `;
  return { id, fileName };
}

export async function loadCvUpload(userId: string, uploadId: string): Promise<CvUploadRecord | null> {
  const rows = await client<{
    id: string;
    file_name: string;
    mime_type: string;
    data_base64: string | null;
  }[]>`
    SELECT id, file_name, mime_type, data_base64
    FROM cv_uploads
    WHERE id = ${uploadId} AND user_id = ${userId}
      AND created_at >= now() - interval '24 hours'
  `;
  const upload = rows[0];
  if (!upload?.data_base64) return null;
  return {
    id: upload.id,
    fileName: upload.file_name,
    mimeType: upload.mime_type,
    data: Buffer.from(upload.data_base64, "base64"),
  };
}

export async function clearCvUploadData(userId: string, uploadId: string): Promise<void> {
  await client`
    UPDATE cv_uploads SET data_base64 = NULL
    WHERE id = ${uploadId} AND user_id = ${userId}
  `;
}

export async function saveCvPreview(
  userId: string,
  profile: CandidateProfile,
  snapshot: CandidateProfileContent,
): Promise<CvPreview> {
  const previewId = `preview_${crypto.randomUUID()}`;
  await client`
    INSERT INTO cv_previews (id, user_id, profile_revision, profile_snapshot)
    VALUES (${previewId}, ${userId}, ${profile.revision}, ${JSON.stringify(snapshot)}::jsonb)
  `;
  return { ...snapshot, previewId, profileRevision: profile.revision };
}

export async function loadCvPreview(userId: string, previewId?: string): Promise<CvPreview | null> {
  const rows = previewId
    ? await client<{
        id: string;
        profile_revision: number;
        profile_snapshot: CandidateProfileContent;
      }[]>`
        SELECT id, profile_revision, profile_snapshot
        FROM cv_previews WHERE id = ${previewId} AND user_id = ${userId}
      `
    : await client<{
        id: string;
        profile_revision: number;
        profile_snapshot: CandidateProfileContent;
      }[]>`
        SELECT id, profile_revision, profile_snapshot
        FROM cv_previews WHERE user_id = ${userId}
        ORDER BY created_at DESC LIMIT 1
      `;
  const preview = rows[0];
  return preview
    ? {
        ...candidateProfileContentSchema.parse(preview.profile_snapshot),
        previewId: preview.id,
        profileRevision: preview.profile_revision,
      }
    : null;
}

export async function saveCvDocument(
  userId: string,
  fileName: string,
  data: Buffer,
  snapshot: CandidateProfileContent,
): Promise<{ id: string; fileName: string }> {
  const id = `cv_${crypto.randomUUID()}`;
  await client`
    INSERT INTO cv_documents (id, user_id, file_name, data_base64, profile_snapshot)
    VALUES (
      ${id}, ${userId}, ${fileName}, ${data.toString("base64")},
      ${JSON.stringify(snapshot)}::jsonb
    )
  `;
  return { id, fileName };
}

export async function loadCvDocument(
  userId: string,
  documentId: string,
): Promise<{ fileName: string; data: Buffer } | null> {
  const rows = await client<{ file_name: string; data_base64: string }[]>`
    SELECT file_name, data_base64 FROM cv_documents
    WHERE id = ${documentId} AND user_id = ${userId}
  `;
  return rows[0]
    ? { fileName: rows[0].file_name, data: Buffer.from(rows[0].data_base64, "base64") }
    : null;
}

// The exact file a candidate submitted with a specific application - distinct
// from cv_documents (their library of AI-generated CVs), so a company always
// sees what was actually submitted, not whatever the candidate's newest CV is.
export async function saveApplicationCv(
  userId: string,
  jobId: string,
  fileName: string,
  mimeType: string,
  data: Buffer,
  source: "uploaded" | "generated",
): Promise<void> {
  await client`
    INSERT INTO application_cv (user_id, job_id, file_name, mime_type, data_base64, source)
    VALUES (${userId}, ${jobId}, ${fileName}, ${mimeType}, ${data.toString("base64")}, ${source})
    ON CONFLICT (user_id, job_id) DO UPDATE SET
      file_name = EXCLUDED.file_name, mime_type = EXCLUDED.mime_type,
      data_base64 = EXCLUDED.data_base64, source = EXCLUDED.source
  `;
}

export async function loadApplicationCvSummary(
  userId: string,
  jobId: string,
): Promise<{ fileName: string; source: "uploaded" | "generated" } | null> {
  const rows = await client<{ file_name: string; source: "uploaded" | "generated" }[]>`
    SELECT file_name, source FROM application_cv
    WHERE user_id = ${userId} AND job_id = ${jobId}
  `;
  return rows[0] ? { fileName: rows[0].file_name, source: rows[0].source } : null;
}

export async function loadApplicationCvForDownload(
  userId: string,
  jobId: string,
): Promise<{ fileName: string; mimeType: string; data: Buffer } | null> {
  const rows = await client<{ file_name: string; mime_type: string; data_base64: string }[]>`
    SELECT file_name, mime_type, data_base64 FROM application_cv
    WHERE user_id = ${userId} AND job_id = ${jobId}
  `;
  return rows[0]
    ? { fileName: rows[0].file_name, mimeType: rows[0].mime_type, data: Buffer.from(rows[0].data_base64, "base64") }
    : null;
}

export async function loadLatestCvDocument(
  userId: string,
): Promise<{ id: string; fileName: string } | null> {
  const rows = await client<{ id: string; file_name: string }[]>`
    SELECT id, file_name FROM cv_documents
    WHERE user_id = ${userId}
    ORDER BY created_at DESC LIMIT 1
  `;
  return rows[0] ? { id: rows[0].id, fileName: rows[0].file_name } : null;
}

function rowToApplication(row: {
  user_id: string;
  job_id: string;
  workflow_id: string;
  status: ApplicationStatus;
}): ApplicationRecord {
  return {
    userId: row.user_id,
    jobId: row.job_id,
    workflowId: row.workflow_id,
    status: row.status,
  };
}

export async function ensureApplication(
  userId: string,
  jobId: string,
  workflowId: string,
): Promise<ApplicationRecord> {
  await client`
    INSERT INTO applications (user_id, job_id, workflow_id, status)
    VALUES (${userId}, ${jobId}, ${workflowId}, 'pending')
    ON CONFLICT (user_id, job_id) DO NOTHING
  `;
  const rows = await client<{
    user_id: string;
    job_id: string;
    workflow_id: string;
    status: ApplicationStatus;
  }[]>`
    SELECT user_id, job_id, workflow_id, status
    FROM applications WHERE user_id = ${userId} AND job_id = ${jobId}
  `;
  return rowToApplication(rows[0]);
}

export async function resolveApplication(
  userId: string,
  jobId: string,
  workflowId: string,
  status: Extract<ApplicationStatus, "submitted" | "cancelled">,
): Promise<ApplicationRecord> {
  await client`
    UPDATE applications SET status = ${status}
    WHERE user_id = ${userId} AND job_id = ${jobId} AND workflow_id = ${workflowId}
  `;
  return ensureApplication(userId, jobId, workflowId);
}

// A company accepting one of its applicants. Only a submitted application can
// be accepted, so a pending or cancelled one is left untouched and reported
// back as null.
export async function acceptApplication(userId: string, jobId: string): Promise<ApplicationRecord | null> {
  const rows = await client<{
    user_id: string;
    job_id: string;
    workflow_id: string;
    status: ApplicationStatus;
  }[]>`
    UPDATE applications SET status = 'accepted'
    WHERE user_id = ${userId} AND job_id = ${jobId} AND status = 'submitted'
    RETURNING user_id, job_id, workflow_id, status
  `;
  return rows[0] ? rowToApplication(rows[0]) : null;
}

export async function ownsApplicationWorkflow(userId: string, workflowId: string): Promise<boolean> {
  const rows = await client<{ found: number }[]>`
    SELECT 1 AS found FROM applications
    WHERE user_id = ${userId} AND workflow_id = ${workflowId}
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function listApplicationsForJob(jobId: string): Promise<ApplicationRecord[]> {
  const rows = await client<{
    user_id: string;
    job_id: string;
    workflow_id: string;
    status: ApplicationStatus;
  }[]>`
    SELECT user_id, job_id, workflow_id, status
    FROM applications WHERE job_id = ${jobId}
  `;
  return rows.map(rowToApplication);
}

// Applicant totals for a company's job list. Counts every application row,
// including pending and cancelled ones, so the number on a job card matches the
// list on that job's applicants page.
export async function countApplicantsByJob(jobIds: string[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const jobId of jobIds) counts[jobId] = 0;
  if (jobIds.length === 0) return counts;
  const rows = await client<{ job_id: string; total: string }[]>`
    SELECT job_id, COUNT(*) AS total
    FROM applications WHERE job_id IN ${client(jobIds)}
    GROUP BY job_id
  `;
  for (const row of rows) counts[row.job_id] = Number(row.total);
  return counts;
}

export async function applicationExists(userId: string, jobId: string): Promise<boolean> {
  const rows = await client<{ found: number }[]>`
    SELECT 1 AS found FROM applications
    WHERE user_id = ${userId} AND job_id = ${jobId}
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function loadUserEmail(userId: string): Promise<string | null> {
  const rows = await client<{ email: string }[]>`
    SELECT email FROM "user" WHERE id = ${userId}
  `;
  return rows[0]?.email ?? null;
}
