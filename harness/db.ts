import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { bigserial, jsonb, pgTable, primaryKey, real, text } from "drizzle-orm/pg-core";
import type { AgentEvent, ApplicationStatus, JobPost } from "@shared/events";

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

export const jobPosts = pgTable("job_posts", {
  id: text("id").primaryKey(),
  data: jsonb("data").$type<JobPost>().notNull(),
});

export type CandidateProfile = {
  position: string | null;
  programmingLanguages: string[];
  projectCount: number | null;
  projectDetails: string | null;
  skills: string[];
  experienceYears: number | null;
  countryRegion: string | null;
  jobType: "remote" | "onsite" | "hybrid" | null;
};

export const candidateProfiles = pgTable("candidate_profiles", {
  userId: text("user_id").primaryKey(),
  position: text("position"),
  programmingLanguages: jsonb("programming_languages").$type<string[]>().notNull(),
  projectCount: real("project_count"),
  projectDetails: text("project_details"),
  skills: jsonb("skills").$type<string[]>().notNull(),
  experienceYears: real("experience_years"),
  countryRegion: text("country_region"),
  jobType: text("job_type").$type<CandidateProfile["jobType"]>(),
});

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
    position: string | null;
    programming_languages: string[];
    project_count: number | null;
    project_details: string | null;
    skills: string[];
    experience_years: number | null;
    country_region: string | null;
    job_type: CandidateProfile["jobType"];
  }[]>`
    SELECT position, programming_languages, project_count, project_details,
      skills, experience_years, country_region, job_type
    FROM candidate_profiles WHERE user_id = ${userId}
  `;
  const profile = rows[0];
  return profile
    ? {
        position: profile.position,
        programmingLanguages: profile.programming_languages,
        projectCount: profile.project_count,
        projectDetails: profile.project_details,
        skills: profile.skills,
        experienceYears: profile.experience_years,
        countryRegion: profile.country_region,
        jobType: profile.job_type,
      }
    : {
        position: null,
        programmingLanguages: [],
        projectCount: null,
        projectDetails: null,
        skills: [],
        experienceYears: null,
        countryRegion: null,
        jobType: null,
      };
}

export async function saveCandidateProfile(
  userId: string,
  update: Partial<CandidateProfile>,
): Promise<CandidateProfile> {
  const current = await loadCandidateProfile(userId);
  const profile: CandidateProfile = {
    position:
      update.position === undefined
        ? current.position
        : update.position === null
          ? null
          : update.position.trim(),
    programmingLanguages:
      update.programmingLanguages === undefined
        ? current.programmingLanguages
        : normalizeLabels(update.programmingLanguages),
    projectCount: update.projectCount === undefined ? current.projectCount : update.projectCount,
    projectDetails:
      update.projectDetails === undefined
        ? current.projectDetails
        : update.projectDetails === null
          ? null
          : update.projectDetails.trim(),
    skills: update.skills === undefined ? current.skills : normalizeLabels(update.skills),
    experienceYears:
      update.experienceYears === undefined ? current.experienceYears : update.experienceYears,
    countryRegion:
      update.countryRegion === undefined
        ? current.countryRegion
        : update.countryRegion === null
          ? null
          : update.countryRegion.trim(),
    jobType: update.jobType === undefined ? current.jobType : update.jobType,
  };
  await client`
    INSERT INTO candidate_profiles (
      user_id, position, programming_languages, project_count, project_details,
      skills, experience_years, country_region, job_type
    )
    VALUES (
      ${userId}, ${profile.position}, ${JSON.stringify(profile.programmingLanguages)}::jsonb,
      ${profile.projectCount}, ${profile.projectDetails}, ${JSON.stringify(profile.skills)}::jsonb,
      ${profile.experienceYears}, ${profile.countryRegion}, ${profile.jobType}
    )
    ON CONFLICT (user_id) DO UPDATE SET
      position = EXCLUDED.position,
      programming_languages = EXCLUDED.programming_languages,
      project_count = EXCLUDED.project_count,
      project_details = EXCLUDED.project_details,
      skills = EXCLUDED.skills,
      experience_years = EXCLUDED.experience_years,
      country_region = EXCLUDED.country_region,
      job_type = EXCLUDED.job_type
  `;
  return profile;
}

export async function clearCandidateProfile(userId: string): Promise<void> {
  await client`DELETE FROM candidate_profiles WHERE user_id = ${userId}`;
  await client`DELETE FROM applications WHERE user_id = ${userId}`;
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

export async function ownsApplicationWorkflow(userId: string, workflowId: string): Promise<boolean> {
  const rows = await client<{ found: number }[]>`
    SELECT 1 AS found FROM applications
    WHERE user_id = ${userId} AND workflow_id = ${workflowId}
    LIMIT 1
  `;
  return rows.length > 0;
}
