import { useEffect, useState } from "react";
import { BriefcaseBusiness, CalendarDays, CirclePlus, Loader2, MapPin, Users } from "lucide-react";
import type { JobPost } from "@shared/events";
import { apiFetch } from "@/api";
import { handleInternalLink } from "@/navigation";
import { MarketplaceHeader } from "./MarketplaceHeader";
import { formatSalary, titleCase, workTypeLabel } from "./JobListPage";

export function CompanyJobsPage({ email }: { email: string }) {
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [applicantCounts, setApplicantCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ jobs: JobPost[]; applicantCounts: Record<string, number> }>("/api/company/jobs")
      .then((data) => {
        setJobs(data.jobs);
        setApplicantCounts(data.applicantCounts);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load job posts"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <MarketplaceHeader email={email} role="company" />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-pink-600">Company workspace</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">Your job posts</h1>
            <p className="mt-2 text-slate-500">Create roles and keep track of everything your company has published.</p>
          </div>
          <a href="/company/jobs/new" onClick={handleInternalLink} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-5 text-sm font-bold text-white shadow-lg shadow-pink-100">
            <CirclePlus className="size-4" /> Create job
          </a>
        </div>

        {loading && <div className="mt-16 flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" /> Loading your job posts...</div>}
        {error && <div role="alert" className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">{error}</div>}
        {!loading && !error && jobs.length === 0 && (
          <div className="mt-10 rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-20 text-center">
            <BriefcaseBusiness className="mx-auto size-10 text-pink-300" />
            <h2 className="mt-4 text-lg font-bold text-slate-950">No job posts yet</h2>
            <p className="mt-1 text-sm text-slate-500">Create your first role to start attracting candidates.</p>
          </div>
        )}
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {jobs.map((job) => (
            <article key={job.id} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-pink-600">{job.company.name}</p>
                  <h2 className="mt-1 text-xl font-extrabold text-slate-950">{job.title}</h2>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <StatusBadge status={job.status} />
                  <ApplicantCountBadge count={applicantCounts[job.id] ?? 0} />
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">{job.description}</p>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-500">
                <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" /> {job.location.city}, {job.location.country} · {workTypeLabel(job.location.workType)}</span>
                <span>{formatSalary(job)}</span>
                <span>{titleCase(job.employmentType)}</span>
                <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" /> {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(job.postedAt))}</span>
              </div>
              <a
                href={`/company/jobs/${encodeURIComponent(job.id)}/applicants`}
                onClick={handleInternalLink}
                className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-pink-600 hover:underline"
              >
                <Users className="size-4" /> View applicants
              </a>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}

// How many people have applied to this role, so a company can compare its posts
// at a glance without opening each applicants page.
function ApplicantCountBadge({ count }: { count: number }) {
  const classes = count === 0
    ? "border-slate-200 bg-slate-50 text-slate-500"
    : "border-pink-200 bg-pink-50 text-pink-700";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${classes}`}>
      <Users className="size-3.5" /> {count} applicant{count === 1 ? "" : "s"}
    </span>
  );
}

function StatusBadge({ status }: { status: JobPost["status"] }) {
  const classes = status === "active"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : status === "draft"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-slate-200 bg-slate-100 text-slate-600";
  return <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${classes}`}>{titleCase(status)}</span>;
}
