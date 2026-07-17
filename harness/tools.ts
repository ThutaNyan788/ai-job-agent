import { tool } from "ai";
import { z } from "zod";
import { loadCandidateProfile, saveCandidateProfile, type CandidateProfile } from "./db";
import { searchJobs } from "./jobs";

export { JOB_POSTS, searchJobs } from "./jobs";

export const tools = {
  saveCandidateProfile: tool({
    description: "Save only candidate fields explicitly provided in the latest message. The interview fields are position, programming languages, project count, one project description, years of experience, country or region, and job type.",
    inputSchema: z.object({
      position: z.string().min(1).optional(),
      programmingLanguages: z.array(z.string().min(1)).min(1).optional(),
      projectCount: z.number().int().min(0).max(1000).optional(),
      projectDetails: z.string().min(1).optional(),
      skills: z.array(z.string().min(1)).min(1).optional(),
      experienceYears: z.number().min(0).max(60).optional(),
      countryRegion: z.string().min(1).optional(),
      jobType: z.enum(["remote", "onsite", "hybrid"]).optional(),
    }).refine((value) => Object.values(value).some((field) => field !== undefined), {
      message: "Provide at least one profile field.",
    }),
  }),
  searchJobs: tool({
    description: "Search the local fictional job catalog using the candidate's confirmed programming languages and years of experience. Call this only after all interview fields are known.",
    inputSchema: z.object({
      programmingLanguages: z.array(z.string().min(1)).min(1),
      experienceYears: z.number().min(0).max(60),
    }),
  }),
};

export type ToolExecutionContext = { userId: string };

export async function runTool(name: string, args: Record<string, unknown>, context: ToolExecutionContext): Promise<Record<string, unknown>> {
  switch (name) {
    case "saveCandidateProfile": {
      const profile = await saveCandidateProfile(context.userId, {
        position: typeof args.position === "string" ? args.position : undefined,
        programmingLanguages: Array.isArray(args.programmingLanguages)
          ? args.programmingLanguages.map(String)
          : undefined,
        projectCount: typeof args.projectCount === "number" ? args.projectCount : undefined,
        projectDetails: typeof args.projectDetails === "string" ? args.projectDetails : undefined,
        skills: Array.isArray(args.skills) && args.skills.length > 0 ? args.skills.map(String) : undefined,
        experienceYears: typeof args.experienceYears === "number" ? args.experienceYears : undefined,
        countryRegion: typeof args.countryRegion === "string" ? args.countryRegion : undefined,
        jobType: args.jobType === "remote" || args.jobType === "onsite" || args.jobType === "hybrid"
          ? args.jobType
          : undefined,
      });
      return { profile };
    }
    case "searchJobs": {
      const skills = Array.isArray(args.programmingLanguages)
        ? args.programmingLanguages.map(String)
        : Array.isArray(args.skills)
          ? args.skills.map(String)
          : [];
      const experienceYears = Number(args.experienceYears);
      // The agent normally calls saveCandidateProfile first. Keep the profile
      // consistent even when a model turn skips that bookkeeping call.
      await saveCandidateProfile(context.userId, { skills, experienceYears });
      return {
        matches: await searchJobs(skills, experienceYears),
      };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export async function getCandidateProfile(userId: string): Promise<CandidateProfile> {
  return loadCandidateProfile(userId);
}
