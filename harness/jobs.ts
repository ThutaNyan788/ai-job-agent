import { eq } from "drizzle-orm";
import type { JobMatch, JobPost } from "@shared/events";

export { JOB_POSTS } from "./job-seed";

function normalizeSkill(skill: string): string {
  return skill.trim().toLowerCase();
}

export function rankJobs(posts: JobPost[], skills: string[], experienceYears: number): JobMatch[] {
  const candidateSkills = [...new Set(skills.map(normalizeSkill).filter(Boolean))];
  return posts.flatMap((job) => {
    const required = job.requiredSkills.map((skill) => normalizeSkill(skill.name));
    const preferred = job.niceToHave.map(normalizeSkill);
    const matchedSkills = required.filter((skill) => candidateSkills.includes(skill));
    if (matchedSkills.length === 0) return [];

    const matchedPreferred = preferred.filter((skill) => candidateSkills.includes(skill));
    const skillScore =
      (matchedSkills.length / required.length) * 60 +
      (matchedPreferred.length / Math.max(preferred.length, 1)) * 10;
    const experienceGap = Math.max(0, job.yearsOfExperience.min - experienceYears);
    const score = Math.round(skillScore + Math.max(0, 30 - experienceGap * 10));
    const experienceReason =
      experienceGap === 0
        ? "meets the experience requirement"
        : `is ${experienceGap} year${experienceGap === 1 ? "" : "s"} below the experience requirement`;

    return [{
      ...job,
      score,
      matchedSkills: [...matchedSkills, ...matchedPreferred],
      reason: `Matches ${matchedSkills.join(", ")} and ${experienceReason}.`,
    }];
  }).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}

export async function findJob(jobId: string): Promise<JobPost | undefined> {
  const { db, jobPosts } = await import("./db");
  const rows = await db.select().from(jobPosts).where(eq(jobPosts.id, jobId)).limit(1);
  return rows[0]?.data;
}

export async function listJobs(): Promise<JobPost[]> {
  const { db, jobPosts } = await import("./db");
  const rows = await db.select({ data: jobPosts.data }).from(jobPosts);
  return rows
    .map((row) => row.data)
    .filter((job) => job.status === "active")
    .sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt));
}

export async function searchJobs(skills: string[], experienceYears: number): Promise<JobMatch[]> {
  const { db, jobPosts } = await import("./db");
  const rows = await db.select({ data: jobPosts.data }).from(jobPosts);
  return rankJobs(rows.map((row) => row.data).filter((job) => job.status === "active"), skills, experienceYears);
}
