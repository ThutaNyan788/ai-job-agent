import { Component, useState, type ErrorInfo, type ReactNode } from "react";
import { LogOut, Moon, Sun } from "lucide-react";
import { EventType, type AgentEvent, type ApplicationStatusEvent, type JobMatch } from "@shared/events";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useHarnessSocket } from "./useHarnessSocket";
import { useTheme } from "./useTheme";
import { TaskPane } from "./components/TaskPane";
import { InspectorPane } from "./components/InspectorPane";
import { JobDetailsPane } from "./components/JobDetailsPane";
import { LandingPage } from "./components/LandingPage";
import { LoginPage } from "./components/LoginPage";
import { RegisterPage } from "./components/RegisterPage";
import { JobListPage } from "./components/JobListPage";
import { JobDetailsPage } from "./components/JobDetailsPage";
import { CompanyJobsPage } from "./components/CompanyJobsPage";
import { JobPostingForm } from "./components/JobPostingForm";
import { JobApplicantsPage } from "./components/JobApplicantsPage";
import { InterviewsPage } from "./components/InterviewsPage";
import { InterviewRoomPage } from "./components/InterviewRoomPage";
import { authClient } from "./auth-client";
import { navigate, usePathname } from "./navigation";
import { MarketplaceHeader } from "./components/MarketplaceHeader";

export function App() {
  const { data: session, isPending } = authClient.useSession();
  const pathname = usePathname();

  if (isPending) {
    return <main className="flex min-h-screen items-center justify-center bg-white text-sm text-slate-500">Loading TalentAI...</main>;
  }
  if (!session) {
    if (pathname === "/login") return <LoginPage />;
    if (pathname === "/register") return <RegisterPage />;
    return <LandingPage />;
  }

  const role = ((session.user as typeof session.user & { role?: "user" | "company" }).role ?? "user");
  return (
    <AssistantErrorBoundary>
      <AuthenticatedApp userId={session.user.id} email={session.user.email} role={role} pathname={pathname} />
    </AssistantErrorBoundary>
  );
}

class AssistantErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Assistant page failed to render", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-white p-6 text-slate-700">
          <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-lg font-semibold">The assistant could not load</h1>
            <p className="mt-2 text-sm text-slate-500">
              Please refresh the page. Your saved profile and job history are still safe.
            </p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Refresh assistant
            </Button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

function AuthenticatedApp({ userId, email, role, pathname }: { userId: string; email: string; role: "user" | "company"; pathname: string }) {
  const { events, connected, error, send } = useHarnessSocket();
  const { theme, toggle } = useTheme();
  const [selectedJob, setSelectedJob] = useState<JobMatch | null>(null);
  const selectedApplication = selectedJob
    ? latestApplication(events, userId, selectedJob.id)
    : null;

  function requestApplication(job: JobMatch, cvUploadId: string) {
    send({ type: "request_application", jobId: job.id, cvUploadId });
  }

  function requestApplicationById(jobId: string, cvUploadId: string) {
    send({ type: "request_application", jobId, cvUploadId });
  }

  async function decideApplication(workflowId: string, approved: boolean) {
    await fetch(`http://${location.hostname}:8787/api/approve/${workflowId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ approved }),
    });
  }

  const jobDetailsMatch = pathname.match(/^\/jobs\/([^/]+)$/);
  if (jobDetailsMatch) {
    const jobId = decodeURIComponent(jobDetailsMatch[1]);
    return (
      <JobDetailsPage
        jobId={jobId}
        application={latestApplication(events, userId, jobId)}
        connected={connected}
        onRequestApplication={requestApplicationById}
        onDecideApplication={decideApplication}
      />
    );
  }
  const interviewRoomMatch = pathname.match(/^\/interview-room\/([^/]+)$/);
  if (interviewRoomMatch) {
    return <InterviewRoomPage roomId={decodeURIComponent(interviewRoomMatch[1])} />;
  }
  const applicantsMatch = pathname.match(/^\/company\/jobs\/([^/]+)\/applicants$/);
  if (applicantsMatch) {
    return role === "company"
      ? <JobApplicantsPage jobId={decodeURIComponent(applicantsMatch[1])} email={email} events={events} />
      : <JobListPage email={email} role={role} />;
  }
  if (pathname === "/company/jobs/new") {
    return role === "company" ? <JobPostingForm email={email} /> : <JobListPage email={email} role={role} />;
  }
  if (pathname === "/company/jobs") {
    return role === "company" ? <CompanyJobsPage email={email} /> : <JobListPage email={email} role={role} />;
  }
  if (pathname === "/interviews") {
    return role === "user"
      ? <InterviewsPage email={email} events={events} userId={userId} />
      : <CompanyJobsPage email={email} />;
  }
  if (pathname === "/" || pathname === "/jobs") {
    return role === "company" && pathname === "/" ? <CompanyJobsPage email={email} /> : <JobListPage email={email} role={role} />;
  }
  if (role === "company") {
    return <CompanyJobsPage email={email} />;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full flex-col">
            <MarketplaceHeader email={email} role={role} />
        <main className="grid min-h-0 flex-1 grid-cols-2">
          <TaskPane
            events={events}
            connected={connected}
            error={error}
            send={send}
            onJobSelect={setSelectedJob}
          />
          {/* do not delete */}
          {/* <InspectorPane events={events} /> */}
          <JobDetailsPane
            job={selectedJob}
            application={selectedApplication}
            onRequestApplication={requestApplication}
            onDecideApplication={decideApplication}
          />
        </main>
      </div>
    </TooltipProvider>
  );
}

function latestApplication(
  events: AgentEvent[],
  userId: string,
  jobId: string,
): ApplicationStatusEvent | null {
  for (let index = events.length - 1; index >= 0; index--) {
    const event = events[index];
    if (
      event.type === EventType.ApplicationStatus &&
      event.userId === userId &&
      event.jobId === jobId
    ) {
      return event;
    }
  }
  return null;
}
