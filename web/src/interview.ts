// The AI interview runs in a separate app. This is the only place its location
// is defined, so it is the one line to change if that app moves.
const INTERVIEW_BASE_URL = "https://ai-interview-agent-frontend-alpha.vercel.app";

// The interview app keys off the role, e.g. "UX Writer" -> "ux_writer".
export function interviewRoleFromTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function interviewUrlForTitle(title: string): string {
  return `${INTERVIEW_BASE_URL}/interview/${interviewRoleFromTitle(title)}`;
}
