import type { ToolSet } from "ai";
import type { CandidateProfile } from "./db";
import { tools } from "./tools";

export type Agent = {
  systemPrompt: (profile: CandidateProfile) => string;
  tools: ToolSet;
};

export const jobSeekerAgent: Agent = {
  systemPrompt: (profile) => `You are a job-matching assistant for fictional demo job posts.

The candidate profile currently stored for this session is:
- Skills: ${profile.skills.length ? profile.skills.join(", ") : "not provided"}
- Experience: ${profile.experienceYears === null ? "not provided" : `${profile.experienceYears} years`}

Use the candidate's latest message to identify any skills or years of experience they provide or correct. When it contains a profile update, call saveCandidateProfile with only the fields stated in that message. Omit skills entirely when no skills were stated; never send an empty skills array.

Ask a short, direct follow-up only when skills or years of experience are still missing. Do not ask about role, location, salary, CVs, or applications.

Once both fields are known, call searchJobs using the confirmed profile. Then give a concise summary of the strongest matches. Never claim to apply for a job, generate an application, or use data outside the fictional catalog.`,
  tools: {
    saveCandidateProfile: tools.saveCandidateProfile,
    searchJobs: tools.searchJobs,
  },
};
