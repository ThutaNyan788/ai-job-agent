import { z } from "zod";

const optionalText = z.string().trim().min(1).nullable();

export const profileLinkSchema = z.object({
  label: z.string().trim().min(1).max(80),
  // CVs commonly contain hostnames or handles without a protocol
  // (for example, "linkedin.com/in/name"). Keep extraction permissive and
  // preserve the candidate's original text.
  url: z.string().trim().min(1).max(500),
});

export const workExperienceSchema = z.object({
  company: z.string().trim().min(1).max(160),
  title: z.string().trim().min(1).max(160),
  location: optionalText,
  startDate: optionalText,
  endDate: optionalText,
  current: z.boolean(),
  highlights: z.array(z.string().trim().min(1).max(500)).max(20),
});

export const educationSchema = z.object({
  institution: z.string().trim().min(1).max(160),
  qualification: z.string().trim().min(1).max(160),
  field: optionalText,
  startDate: optionalText,
  endDate: optionalText,
});

export const projectSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(2_000),
  technologies: z.array(z.string().trim().min(1).max(100)).max(30),
  url: z.string().trim().min(1).max(500).nullable(),
});

export const candidateProfileContentSchema = z.object({
  fullName: optionalText,
  // Preserve the source text during CV extraction; validation can be surfaced
  // to the user without rejecting the entire document.
  email: z.string().trim().min(1).max(320).nullable(),
  phone: optionalText,
  location: optionalText,
  links: z.array(profileLinkSchema).max(20),
  targetRole: optionalText,
  summary: z.string().trim().min(1).max(2_000).nullable(),
  skills: z.array(z.string().trim().min(1).max(100)).max(100),
  programmingLanguages: z.array(z.string().trim().min(1).max(100)).max(100),
  workExperience: z.array(workExperienceSchema).max(30),
  education: z.array(educationSchema).max(20),
  projects: z.array(projectSchema).max(30),
  certifications: z.array(z.string().trim().min(1).max(200)).max(30),
  spokenLanguages: z.array(z.string().trim().min(1).max(100)).max(30),
  experienceYears: z.number().min(0).max(80).nullable(),
  countryRegion: optionalText,
  jobType: z.enum(["remote", "onsite", "hybrid"]).nullable(),
});

export const candidateProfilePatchSchema = candidateProfileContentSchema.partial().extend({
  source: z.enum(["chat", "upload"]).optional(),
  status: z.enum(["draft", "confirmed"]).optional(),
  replace: z.boolean().optional(),
});

export type CandidateProfileContent = z.infer<typeof candidateProfileContentSchema>;
export type CandidateProfilePatch = z.infer<typeof candidateProfilePatchSchema>;

export type CandidateProfile = CandidateProfileContent & {
  source: "chat" | "upload";
  status: "draft" | "confirmed";
  revision: number;
};

export type CvPreview = CandidateProfileContent & {
  previewId: string;
  profileRevision: number;
};

export const EMPTY_CANDIDATE_PROFILE: CandidateProfile = {
  fullName: null,
  email: null,
  phone: null,
  location: null,
  links: [],
  targetRole: null,
  summary: null,
  skills: [],
  programmingLanguages: [],
  workExperience: [],
  education: [],
  projects: [],
  certifications: [],
  spokenLanguages: [],
  experienceYears: null,
  countryRegion: null,
  jobType: null,
  source: "chat",
  status: "draft",
  revision: 0,
};

export function cvMissingFields(profile: CandidateProfileContent): string[] {
  const missing: string[] = [];
  if (!profile.fullName) missing.push("full name");
  if (!profile.email && !profile.phone) missing.push("email or phone");
  if (!profile.targetRole) missing.push("target role");
  if (profile.skills.length === 0 && profile.programmingLanguages.length === 0) {
    missing.push("skills");
  }
  if (
    profile.workExperience.length === 0 &&
    profile.projects.length === 0 &&
    profile.education.length === 0
  ) {
    missing.push("at least one work experience, project, or education entry");
  }
  return missing;
}
