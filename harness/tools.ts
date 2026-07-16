import { tool } from "ai";
import { z } from "zod";
import { loadCandidateProfile, saveCandidateProfile, type CandidateProfile } from "./db";
import { searchJobs } from "./jobs";

export { JOB_POSTS, searchJobs } from "./jobs";

export const tools = {
  saveCandidateProfile: tool({
    description: "Save skills and/or years of experience extracted from the candidate's latest message. Only include fields the candidate actually provided or corrected.",
    inputSchema: z.object({
      skills: z.array(z.string().min(1)).min(1).optional(),
      experienceYears: z.number().min(0).max(60).optional(),
    }).refine((value) => value.skills !== undefined || value.experienceYears !== undefined, {
      message: "Provide at least one profile field.",
    }),
  }),
  searchJobs: tool({
    description: "Search the local fictional job catalog using the candidate's confirmed skills and years of experience. Call this only after both are known.",
    inputSchema: z.object({
      skills: z.array(z.string().min(1)).min(1),
      experienceYears: z.number().min(0).max(60),
    }),
  }),
};

export type ToolExecutionContext = { sessionId: string };

export async function runTool(name: string, args: Record<string, unknown>, context: ToolExecutionContext): Promise<Record<string, unknown>> {
  switch (name) {
    case "saveCandidateProfile": {
      const profile = await saveCandidateProfile(context.sessionId, {
        skills: Array.isArray(args.skills) && args.skills.length > 0 ? args.skills.map(String) : undefined,
        experienceYears: typeof args.experienceYears === "number" ? args.experienceYears : undefined,
      });
      return { profile };
    }
    case "searchJobs": {
      const skills = Array.isArray(args.skills) ? args.skills.map(String) : [];
      const experienceYears = Number(args.experienceYears);
      // The agent normally calls saveCandidateProfile first. Keep the profile
      // consistent even when a model turn skips that bookkeeping call.
      await saveCandidateProfile(context.sessionId, { skills, experienceYears });
      return {
        matches: searchJobs(skills, experienceYears),
      };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export async function getCandidateProfile(sessionId: string): Promise<CandidateProfile> {
  return loadCandidateProfile(sessionId);
}
