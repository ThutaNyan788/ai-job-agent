import { Component, useState, type ErrorInfo, type ReactNode } from "react";
import { BriefcaseBusiness, ListTodo, LogOut, Moon, Sun } from "lucide-react";
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
import { ApplicantsPage } from "./components/ApplicantsPage";
import { InterviewsPage } from "./components/InterviewsPage";
import { InterviewRoomPage } from "./components/InterviewRoomPage";
import { authClient } from "./auth-client";
import { navigate, usePathname } from "./navigation";
import { MarketplaceHeader } from "./components/MarketplaceHeader";

export function App() {
  const { data: session, isPending } = authClient.useSession();
  const pathname = usePathname();

  if (isPending) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white text-sm text-slate-500">
        Loading PhayShin...
      </main>
    );
  }
  if (!session) {
    if (pathname === "/login") return <LoginPage />;
    if (pathname === "/register") return <RegisterPage />;
    return <LandingPage />;
  }

  const role = (session.user as typeof session.user & { role?: "user" | "company" }).role ?? "user";
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

function AuthenticatedApp({
  userId,
  email,
  role,
  pathname,
}: {
  userId: string;
  email: string;
  role: "user" | "company";
  pathname: string;
}) {
  const { events, connected, error, send } = useHarnessSocket();
  const { theme, toggle } = useTheme();
  const [selectedJob, setSelectedJob] = useState<JobMatch | null>(null);
  const [activeTab, setActiveTab] = useState<"tasks" | "details">("tasks");

  const selectedApplication = selectedJob
    ? latestApplication(events, userId, selectedJob.id)
    : null;

  const handleJobSelect = (job: JobMatch | null) => {
    setSelectedJob(job);
    if (job) {
      setActiveTab("details");
    }
  };

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
  // A job post's applicants are the same list, opened with that post preselected
  // in the filter - so the link from a job card still works and can be cleared.
  const applicantsMatch = pathname.match(/^\/company\/jobs\/([^/]+)\/applicants$/);
  if (applicantsMatch) {
<<<<<<< HEAD
    return role === "company" ? (
      <JobApplicantsPage jobId={decodeURIComponent(applicantsMatch[1])} email={email} events={events} />
    ) : (
      <JobListPage email={email} role={role} />
    );
=======
    return role === "company"
      ? <ApplicantsPage jobId={decodeURIComponent(applicantsMatch[1])} email={email} events={events} />
      : <JobListPage email={email} role={role} />;
  }
  if (pathname === "/company/applicants") {
    return role === "company"
      ? <ApplicantsPage email={email} events={events} />
      : <JobListPage email={email} role={role} />;
>>>>>>> 0958137d8848e9517d136422466d3eb37232b636
  }
  if (pathname === "/company/jobs/new") {
    return role === "company" ? <JobPostingForm email={email} /> : <JobListPage email={email} role={role} />;
  }
  if (pathname === "/company/jobs") {
    return role === "company" ? <CompanyJobsPage email={email} /> : <JobListPage email={email} role={role} />;
  }
  if (pathname === "/interviews") {
    return role === "user" ? (
      <InterviewsPage email={email} events={events} userId={userId} />
    ) : (
      <CompanyJobsPage email={email} />
    );
  }
  if (pathname === "/" || pathname === "/jobs") {
    return role === "company" && pathname === "/" ? <CompanyJobsPage email={email} /> : <JobListPage email={email} role={role} />;
  }
  if (role === "company") {
    return <CompanyJobsPage email={email} />;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50/50">
        <MarketplaceHeader email={email} role={role} />

        {/* Mobile Navigation Tabs (Shown on small screens) */}
        <div className="flex border-b border-slate-200/80 bg-white px-3 py-2 md:hidden">
          <div className="grid w-full grid-cols-2 gap-1 rounded-2xl bg-slate-100/80 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("tasks")}
              className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition-all ${
                activeTab === "tasks"
                  ? "bg-white text-pink-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <ListTodo className="size-3.5" />
              <span>Tasks & AI</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("details")}
              className={`relative flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition-all ${
                activeTab === "details"
                  ? "bg-white text-pink-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <BriefcaseBusiness className="size-3.5" />
              <span>Job Details</span>
              {selectedJob && (
                <span className="absolute top-2 right-3 size-2 rounded-full bg-pink-600 animate-pulse" />
              )}
            </button>
          </div>
        </div>

        {/* Main Section */}
        <main className="relative flex-1 min-h-0 md:grid md:grid-cols-2">
          {/* Tasks Pane */}
          <div
            className={`h-full min-h-0 flex-col ${
              activeTab === "tasks" ? "flex" : "hidden md:flex"
            }`}
          >
            <TaskPane
              events={events}
              connected={connected}
              error={error}
              send={send}
              onJobSelect={handleJobSelect}
            />
          </div>

          {/* Job Details Pane */}
          <div
            className={`h-full min-h-0 flex-col ${
              activeTab === "details" ? "flex" : "hidden md:flex"
            }`}
          >
            {/* do not delete */}
            {/* <InspectorPane events={events} /> */}
            <JobDetailsPane
              job={selectedJob}
              application={selectedApplication}
              onRequestApplication={requestApplication}
              onDecideApplication={decideApplication}
            />
          </div>
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