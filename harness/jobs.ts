import { and, desc, eq } from "drizzle-orm";
import type { JobMatch, JobPost, JobPostInput } from "@shared/events";
import type { CandidateProfile } from "@shared/candidate";

export { JOB_POSTS } from "./job-seed";

function normalizeSkill(skill: string): string {
  return skill.trim().toLowerCase();
}

function roleTokens(value: string): string[] {
  const ignored = new Set(["and", "the", "a", "an", "developer", "engineer"]);
  return value
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((token) => token.length > 1 && !ignored.has(token));
}

export function rankJobs(posts: JobPost[], profile: CandidateProfile): JobMatch[] {
  const candidateSkills = [
    ...new Set(
      [...profile.skills, ...profile.programmingLanguages].map(normalizeSkill).filter(Boolean),
    ),
  ];
  return posts.flatMap((job) => {
    const required = job.requiredSkills.map((skill) => normalizeSkill(skill.name));
    const preferred = job.niceToHave.map(normalizeSkill);
    const matchedSkills = required.filter((skill) => candidateSkills.includes(skill));
    const matchedPreferred = preferred.filter((skill) => candidateSkills.includes(skill));
    const targetTokens = roleTokens(profile.targetRole ?? "");
    const jobTokens = roleTokens(job.title);
    const roleMatches = targetTokens.filter((token) => jobTokens.includes(token));
    const roleQuality =
      profile.targetRole && job.title.toLowerCase().includes(profile.targetRole.toLowerCase())
        ? 1
        : targetTokens.length > 0
          ? roleMatches.length / targetTokens.length
          : 0;
    if (matchedSkills.length === 0 && roleQuality === 0) return [];

    const factors: { key: keyof JobMatch["scoreBreakdown"]; weight: number; quality: number }[] = [];
    if (candidateSkills.length > 0) {
      const requiredQuality = matchedSkills.length / Math.max(required.length, 1);
      const preferredQuality = matchedPreferred.length / Math.max(preferred.length, 1);
      factors.push({ key: "skills", weight: 55, quality: requiredQuality * 0.8 + preferredQuality * 0.2 });
    }
    if (profile.targetRole) factors.push({ key: "targetRole", weight: 20, quality: roleQuality });
    const experienceGap =
      profile.experienceYears === null
        ? null
        : Math.max(0, job.yearsOfExperience.min - profile.experienceYears);
    if (profile.experienceYears !== null) {
      factors.push({
        key: "experience",
        weight: 15,
        quality: Math.max(0, 1 - (experienceGap ?? 0) / 3),
      });
    }
    if (profile.jobType) {
      factors.push({
        key: "workType",
        weight: 5,
        quality: profile.jobType === job.location.workType ? 1 : 0,
      });
    }
    if (profile.countryRegion) {
      const preference = profile.countryRegion.toLowerCase();
      factors.push({
        key: "countryRegion",
        weight: 5,
        quality:
          job.location.country.toLowerCase().includes(preference) ||
          job.location.city.toLowerCase().includes(preference)
            ? 1
            : 0,
      });
    }
    const availableWeight = factors.reduce((total, factor) => total + factor.weight, 0);
    const score = Math.round(
      factors.reduce((total, factor) => total + factor.weight * factor.quality, 0) /
        Math.max(availableWeight, 1) *
        100,
    );
    const scoreBreakdown = Object.fromEntries(
      factors.map((factor) => [
        factor.key,
        Math.round((factor.weight * factor.quality) / Math.max(availableWeight, 1) * 100),
      ]),
    ) as JobMatch["scoreBreakdown"];
    const gaps: string[] = [];
    if (experienceGap && experienceGap > 0) {
      gaps.push(`${experienceGap} year${experienceGap === 1 ? "" : "s"} below the minimum experience`);
    }
    const missingRequired = required.filter((skill) => !candidateSkills.includes(skill));
    if (missingRequired.length > 0) gaps.push(`Missing required skills: ${missingRequired.join(", ")}`);
    if (profile.jobType && profile.jobType !== job.location.workType) {
      gaps.push(`Prefers ${profile.jobType}; role is ${job.location.workType}`);
    }
    const profileStrengths = [
      matchedSkills.length > 0 ? `Required skills: ${matchedSkills.join(", ")}` : null,
      matchedPreferred.length > 0 ? `Preferred skills: ${matchedPreferred.join(", ")}` : null,
      roleQuality > 0 ? `Target role aligns with ${job.title}` : null,
      experienceGap === 0 ? "Meets the experience requirement" : null,
    ].filter((value): value is string => Boolean(value));

    return [{
      ...job,
      score,
      matchedSkills: [...matchedSkills, ...matchedPreferred],
      reason:
        profileStrengths.length > 0
          ? `${profileStrengths.join(". ")}.`
          : "Limited profile alignment; review the listed gaps.",
      scoreBreakdown,
      profileStrengths,
      gaps,
    }];
  }).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}

export async function findJob(jobId: string): Promise<JobPost | undefined> {
  const { db, jobPosts } = await import("./db");
  const rows = await db.select().from(jobPosts).where(eq(jobPosts.id, jobId)).limit(1);
  return rows[0]?.data;
}

export async function findJobForOwner(jobId: string, ownerUserId: string): Promise<JobPost | undefined> {
  const { db, jobPosts } = await import("./db");
  const rows = await db
    .select({ data: jobPosts.data })
    .from(jobPosts)
    .where(and(eq(jobPosts.id, jobId), eq(jobPosts.ownerUserId, ownerUserId)))
    .limit(1);
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

export async function listJobsForCompany(ownerUserId: string): Promise<JobPost[]> {
  const { db, jobPosts } = await import("./db");
  const rows = await db
    .select({ data: jobPosts.data })
    .from(jobPosts)
    .where(eq(jobPosts.ownerUserId, ownerUserId))
    .orderBy(desc(jobPosts.id));
  return rows
    .map((row) => row.data)
    .sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt));
}

export async function createCompanyJob(ownerUserId: string, input: JobPostInput): Promise<JobPost> {
  const { db, jobPosts } = await import("./db");
  const job: JobPost = {
    ...input,
    id: `job_${crypto.randomUUID()}`,
    postedAt: new Date().toISOString(),
  };
  await db.insert(jobPosts).values({ id: job.id, ownerUserId, data: job });
  return job;
}

export async function searchJobs(profile: CandidateProfile): Promise<JobMatch[]> {
  const { db, jobPosts } = await import("./db");
  const rows = await db.select({ data: jobPosts.data }).from(jobPosts);
  return rankJobs(rows.map((row) => row.data).filter((job) => job.status === "active"), profile);
}
