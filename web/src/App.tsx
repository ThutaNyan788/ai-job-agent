import { useState } from "react";
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
import { AuthScreen } from "./components/AuthScreen";
import { authClient } from "./auth-client";

export function App() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading account...</main>;
  }
  if (!session) return <AuthScreen />;

  return <AuthenticatedApp userId={session.user.id} email={session.user.email} />;
}

function AuthenticatedApp({ userId, email }: { userId: string; email: string }) {
  const { events, connected, error, send } = useHarnessSocket();
  const { theme, toggle } = useTheme();
  const [selectedJob, setSelectedJob] = useState<JobMatch | null>(null);
  const selectedApplication = selectedJob
    ? latestApplication(events, userId, selectedJob.id)
    : null;

  function requestApplication(job: JobMatch) {
    send({ type: "request_application", jobId: job.id });
  }

  async function decideApplication(workflowId: string, approved: boolean) {
    await fetch(`http://${location.hostname}:8787/api/approve/${workflowId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ approved }),
    });
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b px-4 py-2">
          <span className="text-sm font-semibold tracking-tight">
            Job<span className="text-muted-foreground"> Match Harness</span>
          </span>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex items-center gap-1.5 text-xs",
                connected ? "text-emerald-600" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  connected ? "bg-emerald-500" : "bg-muted-foreground/50",
                )}
              />
              {connected ? "connected" : "disconnected"}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={toggle}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <span className="hidden max-w-48 truncate text-xs text-muted-foreground sm:block" title={email}>
              {email}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => void authClient.signOut()}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </header>
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
