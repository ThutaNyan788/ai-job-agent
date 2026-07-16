import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { pgTable, bigserial, jsonb, real, text } from "drizzle-orm/pg-core";
import type { AgentEvent } from "@shared/events";
import type { ApplicationStatus } from "@shared/events";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set — copy .dev.vars.example to .dev.vars.");
}

// postgres.js connection (Neon requires SSL, carried in the URL). We keep the
// pool small — this is the durable event log, not a high-traffic app DB.
const client = postgres(connectionString, { max: 5 });
export const db = drizzle(client);

// The DURABLE event log. In Lesson 1 the event stream lived in a memory array
// that vanished on restart. Now every event is a row here, so the inspector can
// replay the whole timeline — including work that happened before a crash.
export const eventLog = pgTable("event_log", {
  seq: bigserial("seq", { mode: "number" }).primaryKey(), // global order
  data: jsonb("data").$type<AgentEvent>().notNull(),
});

export type CandidateProfile = {
  skills: string[];
  experienceYears: number | null;
};

export const candidateProfiles = pgTable("candidate_profiles", {
  sessionId: text("session_id").primaryKey(),
  skills: jsonb("skills").$type<string[]>().notNull(),
  experienceYears: real("experience_years"),
});

export type ApplicationRecord = {
  sessionId: string;
  jobId: string;
  workflowId: string;
  status: ApplicationStatus;
};

export const applications = pgTable("applications", {
  sessionId: text("session_id").notNull(),
  jobId: text("job_id").notNull(),
  workflowId: text("workflow_id").notNull(),
  status: text("status").$type<ApplicationStatus>().notNull(),
});

// Create the table on boot. Keeps the workshop migration-free; in a real app
// you'd use Drizzle migrations instead.
export async function ensureSchema(): Promise<void> {
  await client`
    CREATE TABLE IF NOT EXISTS event_log (
      seq  bigserial PRIMARY KEY,
      data jsonb NOT NULL
    )
  `;
  await client`
    CREATE TABLE IF NOT EXISTS applications (
      session_id text NOT NULL,
      job_id text NOT NULL,
      workflow_id text NOT NULL,
      status text NOT NULL CHECK (status IN ('pending', 'submitted', 'cancelled')),
      PRIMARY KEY (session_id, job_id)
    )
  `;
  await client`
    CREATE TABLE IF NOT EXISTS candidate_profiles (
      session_id text PRIMARY KEY,
      skills jsonb NOT NULL DEFAULT '[]'::jsonb,
      experience_years real
    )
  `;
}

// Wipe the durable log (the "Clear" button in the inspector). Wired up in the
// memory lesson.
export async function clearEventLog(): Promise<void> {
  await client`TRUNCATE event_log`;
}

function normalizeSkills(skills: string[]): string[] {
  return [...new Set(skills.map((skill) => skill.trim().toLowerCase()).filter(Boolean))];
}

export async function loadCandidateProfile(sessionId: string): Promise<CandidateProfile> {
  const rows = await client<{ skills: string[]; experience_years: number | null }[]>`
    SELECT skills, experience_years FROM candidate_profiles WHERE session_id = ${sessionId}
  `;
  const profile = rows[0];
  return profile
    ? { skills: profile.skills, experienceYears: profile.experience_years }
    : { skills: [], experienceYears: null };
}

export async function saveCandidateProfile(
  sessionId: string,
  update: Partial<CandidateProfile>,
): Promise<CandidateProfile> {
  const current = await loadCandidateProfile(sessionId);
  const profile: CandidateProfile = {
    skills: update.skills === undefined ? current.skills : normalizeSkills(update.skills),
    experienceYears:
      update.experienceYears === undefined ? current.experienceYears : update.experienceYears,
  };
  await client`
    INSERT INTO candidate_profiles (session_id, skills, experience_years)
    VALUES (${sessionId}, ${JSON.stringify(profile.skills)}::jsonb, ${profile.experienceYears})
    ON CONFLICT (session_id) DO UPDATE SET
      skills = EXCLUDED.skills,
      experience_years = EXCLUDED.experience_years
  `;
  return profile;
}

export async function clearCandidateProfile(sessionId: string): Promise<void> {
  await client`DELETE FROM candidate_profiles WHERE session_id = ${sessionId}`;
  await client`DELETE FROM applications WHERE session_id = ${sessionId}`;
}

function rowToApplication(row: {
  session_id: string;
  job_id: string;
  workflow_id: string;
  status: ApplicationStatus;
}): ApplicationRecord {
  return {
    sessionId: row.session_id,
    jobId: row.job_id,
    workflowId: row.workflow_id,
    status: row.status,
  };
}

export async function ensureApplication(
  sessionId: string,
  jobId: string,
  workflowId: string,
): Promise<ApplicationRecord> {
  await client`
    INSERT INTO applications (session_id, job_id, workflow_id, status)
    VALUES (${sessionId}, ${jobId}, ${workflowId}, 'pending')
    ON CONFLICT (session_id, job_id) DO NOTHING
  `;
  const rows = await client<{
    session_id: string;
    job_id: string;
    workflow_id: string;
    status: ApplicationStatus;
  }[]>`
    SELECT session_id, job_id, workflow_id, status
    FROM applications WHERE session_id = ${sessionId} AND job_id = ${jobId}
  `;
  return rowToApplication(rows[0]);
}

export async function resolveApplication(
  sessionId: string,
  jobId: string,
  workflowId: string,
  status: Extract<ApplicationStatus, "submitted" | "cancelled">,
): Promise<ApplicationRecord> {
  await client`
    UPDATE applications SET status = ${status}
    WHERE session_id = ${sessionId} AND job_id = ${jobId} AND workflow_id = ${workflowId}
  `;
  return ensureApplication(sessionId, jobId, workflowId);
}
