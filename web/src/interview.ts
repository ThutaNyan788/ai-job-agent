const INTERVIEW_BASE_URL = "http://ai-interview-agent-frontend-alpha.vercel.app/interview";

export function interviewRoleFromTitle(title: string): string {
  if (title.trim().toLowerCase() === "full stack developer") {
    return "fullstack_developer";
  }

  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function interviewUrlForTitle(title: string): string {
  return `${INTERVIEW_BASE_URL}/${interviewRoleFromTitle(title)}`;
}
