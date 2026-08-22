import { useEffect, useState } from "react";
import { ArrowRight, Building2, Loader2, Sparkles, Video } from "lucide-react";
import { EventType, type AgentEvent, type JobPost } from "@shared/events";
import { apiFetch } from "@/api";
import { handleInternalLink } from "@/navigation";
import { interviewUrlForTitle } from "@/interview";
import { MarketplaceHeader } from "./MarketplaceHeader";

function acceptedJobIds(events: AgentEvent[], userId: string): string[] {
  const latest = new Map<string, string>();
  for (const event of events) {
    if (event.type === EventType.ApplicationStatus && event.userId === userId) {
      latest.set(event.jobId, event.status);
    }
  }
  return [...latest.entries()].filter(([, status]) => status === "accepted").map(([jobId]) => jobId);
}

export function InterviewsPage({ email, events, userId }: { email: string; events: AgentEvent[]; userId: string }) {
  const jobIds = acceptedJobIds(events, userId);
  const [jobs, setJobs] = useState<Record<string, JobPost>>({});
  const [loading, setLoading] = useState(true);
  const jobIdsKey = jobIds.join(",");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all(
      jobIds.map((jobId) =>
        apiFetch<{ job: JobPost }>(`/api/jobs/${encodeURIComponent(jobId)}`)
          .then((data) => [jobId, data.job] as const)
          .catch(() => null),
      ),
    ).then((results) => {
      if (cancelled) return;
      const next: Record<string, JobPost> = {};
      for (const result of results) if (result) next[result[0]] = result[1];
      setJobs(next);
    }).finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [jobIdsKey]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <MarketplaceHeader email={email} role="user" />
      <main className="mx-auto max-w-5xl px-4 py-9 sm:px-6 lg:px-8">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-pink-600">Your interviews</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Interviews</h1>
        <p className="mt-2 text-sm text-slate-500">Start an AI interview for any role you've been accepted for.</p>

        {loading && <div className="mt-16 flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" /> Loading...</div>}

        {!loading && jobIds.length === 0 && (
          <div className="mt-10 rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-20 text-center">
            <Video className="mx-auto size-10 text-pink-300" />
            <h2 className="mt-4 text-lg font-bold text-slate-950">No interviews yet</h2>
            <p className="mt-1 text-sm text-slate-500">Once an application is accepted, it'll show up here.</p>
          </div>
        )}

        <div className="mt-8 space-y-4">
          {jobIds.map((jobId) => {
            const job = jobs[jobId];
            if (!job) return null;
            return (
              <article key={jobId} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-950">{job.title}</h2>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-500"><Building2 className="size-3.5" /> {job.company.name}</p>
                  </div>
                  <a href={`/jobs/${encodeURIComponent(jobId)}`} onClick={handleInternalLink} className="text-xs font-bold text-slate-400 hover:text-pink-600">View posting</a>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <a
                    href={interviewUrlForTitle(job.title)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-pink-100 hover:from-pink-600 hover:to-rose-600"
                  >
                    <Sparkles className="size-4" /> Join AI Interview <ArrowRight className="size-3.5" />
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
