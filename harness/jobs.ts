import type { JobMatch, JobPost } from "@shared/events";

export const JOB_POSTS: JobPost[] = [
  { id: "job_001", title: "Frontend Engineer", company: "Northstar Labs", requiredSkills: ["javascript", "typescript", "react"], preferredSkills: ["testing", "css"], minimumExperienceYears: 2, workStyle: "Remote", description: "Build accessible customer-facing product experiences." },
  { id: "job_002", title: "Backend Engineer", company: "Aperture Systems", requiredSkills: ["typescript", "node.js", "postgresql"], preferredSkills: ["docker", "aws"], minimumExperienceYears: 3, workStyle: "Hybrid", description: "Design reliable APIs and data services for a growing platform." },
  { id: "job_003", title: "Full Stack Developer", company: "Cedar Health", requiredSkills: ["javascript", "react", "node.js"], preferredSkills: ["typescript", "postgresql"], minimumExperienceYears: 2, workStyle: "Remote", description: "Ship practical workflow tools for care teams." },
  { id: "job_004", title: "Data Analyst", company: "Signal Ridge", requiredSkills: ["sql", "python", "excel"], preferredSkills: ["tableau", "statistics"], minimumExperienceYears: 1, workStyle: "Hybrid", description: "Turn operational data into clear business decisions." },
  { id: "job_005", title: "Data Engineer", company: "Harbor Analytics", requiredSkills: ["python", "sql", "etl"], preferredSkills: ["airflow", "aws"], minimumExperienceYears: 3, workStyle: "Remote", description: "Build dependable pipelines and shared data products." },
  { id: "job_006", title: "QA Automation Engineer", company: "Brightline Commerce", requiredSkills: ["javascript", "testing", "playwright"], preferredSkills: ["typescript", "ci/cd"], minimumExperienceYears: 2, workStyle: "On-site", description: "Improve release confidence through thoughtful automation." },
  { id: "job_007", title: "Product Designer", company: "Mosaic Studio", requiredSkills: ["figma", "ux research", "prototyping"], preferredSkills: ["design systems", "accessibility"], minimumExperienceYears: 2, workStyle: "Remote", description: "Shape simple, research-backed interfaces for teams." },
  { id: "job_008", title: "DevOps Engineer", company: "Ironwood Cloud", requiredSkills: ["docker", "kubernetes", "ci/cd"], preferredSkills: ["aws", "terraform"], minimumExperienceYears: 4, workStyle: "Hybrid", description: "Operate secure delivery systems and cloud infrastructure." },
  { id: "job_009", title: "Mobile Developer", company: "Orbit Travel", requiredSkills: ["react native", "javascript", "mobile development"], preferredSkills: ["typescript", "testing"], minimumExperienceYears: 2, workStyle: "Remote", description: "Create polished travel-planning experiences on mobile." },
  { id: "job_010", title: "Junior Software Engineer", company: "Juniper Works", requiredSkills: ["javascript", "git", "problem solving"], preferredSkills: ["react", "node.js"], minimumExperienceYears: 0, workStyle: "On-site", description: "Learn in a supportive team while delivering product improvements." },
];

function normalizeSkill(skill: string): string {
  return skill.trim().toLowerCase();
}

export function searchJobs(skills: string[], experienceYears: number): JobMatch[] {
  const candidateSkills = [...new Set(skills.map(normalizeSkill).filter(Boolean))];
  return JOB_POSTS.flatMap((job) => {
    const required = job.requiredSkills.map(normalizeSkill);
    const preferred = job.preferredSkills.map(normalizeSkill);
    const matchedSkills = required.filter((skill) => candidateSkills.includes(skill));
    if (matchedSkills.length === 0) return [];

    const matchedPreferred = preferred.filter((skill) => candidateSkills.includes(skill));
    const skillScore = (matchedSkills.length / required.length) * 60 + (matchedPreferred.length / Math.max(preferred.length, 1)) * 10;
    const experienceGap = Math.max(0, job.minimumExperienceYears - experienceYears);
    const score = Math.round(skillScore + Math.max(0, 30 - experienceGap * 10));
    const experienceReason = experienceGap === 0
      ? "meets the experience requirement"
      : `is ${experienceGap} year${experienceGap === 1 ? "" : "s"} below the experience requirement`;

    return [{ ...job, score, matchedSkills: [...matchedSkills, ...matchedPreferred], reason: `Matches ${matchedSkills.join(", ")} and ${experienceReason}.` }];
  }).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}
