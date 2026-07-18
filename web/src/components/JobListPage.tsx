import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Briefcase,
  Clock,
  DollarSign,
  Heart,
  Loader2,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react";
import type { JobPost } from "@shared/events";
import heroImage from "@/assets/hero.png";
import { apiFetch } from "@/api";
import { handleInternalLink } from "@/navigation";
import { MarketplaceHeader } from "./MarketplaceHeader";

type Filters = {
  q: string;
  location: string;
  experience: string;
  workType: string;
};

const emptyFilters: Filters = { q: "", location: "", experience: "", workType: "" };

export function JobListPage({ email, role = "user" }: { email: string; role?: "user" | "company" }) {
  const [filters, setFilters] = useState(emptyFilters);
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadJobs(nextFilters: Filters) {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(nextFilters)) {
      if (value.trim()) params.set(key, value.trim());
    }
    try {
      const data = await apiFetch<{ jobs: JobPost[] }>(`/api/jobs?${params}`);
      setJobs(data.jobs);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load jobs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadJobs(emptyFilters);
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    void loadJobs(filters);
  }

  return (
    <div className="min-h-screen bg-white text-slate-800 antialiased selection:bg-pink-100 selection:text-pink-700">
      <MarketplaceHeader email={email} role={role} />
      <section className="relative overflow-hidden px-4 pb-14 pt-16 text-center sm:px-6 sm:pb-20 sm:pt-24">
        <div className="absolute left-1/2 top-20 -z-10 size-[32rem] -translate-x-1/2 rounded-full bg-pink-100/60 blur-3xl" />
        <div className="mx-auto max-w-4xl">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-pink-100 bg-pink-50 px-3 py-1.5 text-xs font-bold text-pink-600 shadow-sm">
            <Sparkles className="size-3.5 fill-pink-500" /> Next-gen AI job marketplace
          </div>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            Find your <span className="bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">dream job with AI</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-500 sm:text-xl">
            Discover opportunities from the live catalog and use AI to find the right career match.
          </p>
          <a href="/ai-assistant" onClick={handleInternalLink} className="group relative mt-8 inline-flex items-center rounded-2xl border border-pink-100 bg-white py-3.5 pl-7 pr-20 font-bold text-slate-800 shadow-md shadow-pink-100 transition hover:-translate-y-0.5 hover:shadow-lg">
            Ask AI assistant
            <img src={heroImage} alt="" className="absolute -right-5 -top-6 h-20 w-20 object-contain drop-shadow-xl transition-transform group-hover:-rotate-3 group-hover:scale-110" />
          </a>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <form onSubmit={submit} className="grid grid-cols-1 items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-xl shadow-slate-200/60 sm:grid-cols-2 sm:p-6 lg:grid-cols-5">
          <FilterField icon={Search}>
            <input aria-label="Search jobs" className={filterClass} placeholder="Search title, skills..." value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} />
          </FilterField>
          <FilterField icon={MapPin}>
            <input aria-label="Location" className={filterClass} placeholder="City or country" value={filters.location} onChange={(event) => setFilters({ ...filters, location: event.target.value })} />
          </FilterField>
          <FilterField icon={Briefcase}>
            <select aria-label="Experience level" className={filterClass} value={filters.experience} onChange={(event) => setFilters({ ...filters, experience: event.target.value })}>
              <option value="">Experience level</option>
              <option value="junior">Junior</option>
              <option value="mid">Mid</option>
              <option value="senior">Senior</option>
              <option value="lead">Lead</option>
            </select>
          </FilterField>
          <FilterField icon={Clock}>
            <select aria-label="Work type" className={filterClass} value={filters.workType} onChange={(event) => setFilters({ ...filters, workType: event.target.value })}>
              <option value="">Work type</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site</option>
            </select>
          </FilterField>
          <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 text-sm font-bold text-white shadow-sm hover:opacity-95 disabled:opacity-60" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />} Search jobs
          </button>
        </form>

        <div className="mb-6 mt-10 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-pink-600">Open positions</p>
            <h2 className="mt-1 text-2xl font-extrabold text-slate-950">{loading ? "Finding roles..." : `${jobs.length} jobs found`}</h2>
          </div>
          {(filters.q || filters.location || filters.experience || filters.workType) && (
            <button type="button" className="text-sm font-semibold text-slate-500 hover:text-pink-600" onClick={() => { setFilters(emptyFilters); void loadJobs(emptyFilters); }}>
              Clear filters
            </button>
          )}
        </div>

        {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">{error}</div>}
        {!loading && !error && jobs.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-200 py-20 text-center">
            <Search className="mx-auto size-8 text-slate-300" />
            <h3 className="mt-4 font-bold text-slate-900">No matching jobs</h3>
            <p className="mt-1 text-sm text-slate-500">Try a broader title, skill, or location.</p>
          </div>
        )}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => <JobCard key={job.id} job={job} />)}
        </div>
      </main>
    </div>
  );
}

function FilterField({ icon: Icon, children }: { icon: typeof Search; children: React.ReactNode }) {
  return (
    <label className="relative block">
      <Icon className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400" />
      {children}
    </label>
  );
}

function JobCard({ job }: { job: JobPost }) {
  const [saved, setSaved] = useState(false);
  return (
    <article className="flex min-h-[25rem] flex-col justify-between rounded-2xl border border-slate-100 bg-white p-6 shadow-md shadow-slate-200/50 transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-xl border border-pink-100 bg-gradient-to-br from-pink-50 to-rose-50 text-lg font-extrabold text-pink-600">{job.company.name.charAt(0)}</div>
          <div className="flex flex-wrap justify-end gap-1.5">
            <Badge className="border-emerald-100 bg-emerald-50 text-emerald-700">Active</Badge>
            <Badge>{titleCase(job.experienceLevel)}</Badge>
            <Badge>{workTypeLabel(job.location.workType)}</Badge>
          </div>
        </div>
        <h3 className="truncate text-lg font-bold tracking-tight text-slate-950">{job.title}</h3>
        <p className="mt-0.5 text-sm font-semibold text-slate-500">{job.company.name}</p>
        <div className="my-4 grid grid-cols-2 gap-2 text-xs font-medium text-slate-500">
          <span className="flex min-w-0 items-center gap-1.5"><MapPin className="size-3.5 shrink-0 text-slate-400" /><span className="truncate">{job.location.city}, {job.location.country}</span></span>
          <span className="flex min-w-0 items-center justify-end gap-1.5 font-bold text-slate-900"><DollarSign className="size-3.5 shrink-0 text-slate-400" /><span className="truncate">{formatSalary(job, true)}</span></span>
        </div>
        <p className="line-clamp-3 text-sm leading-6 text-slate-500">{job.description}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {job.requiredSkills.slice(0, 4).map((skill) => <Badge key={skill.name}>{skill.name}</Badge>)}
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <span className="text-xs font-medium text-slate-400">{formatDate(job.postedAt)}</span>
        <div className="flex items-center gap-2">
          <button type="button" aria-label={saved ? "Remove saved job" : "Save job"} onClick={() => setSaved((value) => !value)} className={`grid size-10 place-items-center rounded-xl border transition ${saved ? "border-pink-200 bg-pink-50 text-pink-500" : "border-slate-200 text-slate-400 hover:bg-slate-50"}`}>
            <Heart className={`size-4 ${saved ? "fill-current" : ""}`} />
          </button>
          <a href={`/jobs/${job.id}`} onClick={handleInternalLink} className="inline-flex h-10 items-center gap-1 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 text-sm font-bold text-white shadow-sm hover:opacity-95">
            View job <ArrowRight className="size-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
}

function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex rounded-full border border-slate-100 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 ${className}`}>{children}</span>;
}

export function titleCase(value: string) {
  return value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function workTypeLabel(value: JobPost["location"]["workType"]) {
  return value === "onsite" ? "On-site" : titleCase(value);
}

export function formatSalary(job: JobPost, compact = false) {
  const formatter = new Intl.NumberFormat("en", { notation: compact ? "compact" : "standard", maximumFractionDigits: 0 });
  return `${job.salary.currency} ${formatter.format(job.salary.min)} - ${formatter.format(job.salary.max)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
}

const filterClass = "h-11 w-full appearance-none rounded-xl border border-slate-100 bg-slate-50/70 py-2 pl-10 pr-3 text-sm font-medium text-slate-700 outline-none transition hover:bg-slate-50 focus:border-pink-300 focus:bg-white focus:ring-3 focus:ring-pink-100";
