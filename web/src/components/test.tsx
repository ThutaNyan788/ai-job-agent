import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Briefcase,
  Building2,
  DollarSign,
  Heart,
  Loader2,
  MapPin,
  Search,
  Sparkles,
  SlidersHorizontal,
  Bot,
  X,
  Send,
  MessageSquare,
} from "lucide-react";
import type { JobPost } from "@shared/events";
import heroImage from "@/assets/hero.png";
import Logo from "@/assets/logo.png";
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
  
  // AI Assistant Pop-up state
  const [isAiOpen, setIsAiOpen] = useState(false);
    const [isAiPopupOpen, setIsAiPopupOpen] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [chatLog, setChatLog] = useState<Array<{ sender: "ai" | "user"; text: string }>>([
    { sender: "ai", text: "Hi there! I'm your AI career assistant. Ask me anything about job matching, salary expectations, or interview tips!" }
  ]);

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

  function handleAiSubmit(e: FormEvent) {
    e.preventDefault();
    if (!aiMessage.trim()) return;
    const userText = aiMessage;
    setChatLog((prev) => [...prev, { sender: "user", text: userText }]);
    setAiMessage("");

    setTimeout(() => {
      let reply = "That's a great question! Based on your active filters, I recommend checking out roles that match your core tech stack.";
      if (userText.toLowerCase().includes("salary")) {
        reply = "Salaries for these listed positions typically scale based on experience levels (Junior, Mid, and Senior ranges). Let me know if you want to optimize your CV for higher brackets!";
      } else if (userText.toLowerCase().includes("interview")) {
        reply = "I can help you practice technical questions or system design queries. You can head over to the AI Interview Assistant section anytime!";
      }
      setChatLog((prev) => [...prev, { sender: "ai", text: reply }]);
    }, 600);
  }

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 antialiased selection:bg-pink-100 selection:text-pink-700 relative">
      <MarketplaceHeader email={email} role={role} />

      {/* Hero Search Section */}
<section className="relative overflow-hidden bg-pink-400/20 px-4 py-12 text-white sm:px-6 lg:px-8">
  {/* Animated background */}
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    {/* Pink glow */}
    <div className="absolute -left-32 -top-24 h-72 w-72 rounded-full bg-pink-500/25 blur-3xl animate-pulse" />

    {/* Purple glow */}
    <div
      className="absolute right-[-100px] top-[-120px] h-96 w-96 rounded-full bg-fuchsia-500/15 blur-3xl"
      style={{
        animation: "float 8s ease-in-out infinite",
      }}
    />

    {/* Blue glow */}
    <div
      className="absolute left-[35%] bottom-[-180px] h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl"
      style={{
        animation: "floatReverse 10s ease-in-out infinite",
      }}
    />

    {/* Small floating lights */}
    <div
      className="absolute left-[15%] top-[30%] size-2 rounded-full bg-pink-400/60"
      style={{
        animation: "float 5s ease-in-out infinite",
      }}
    />

    <div
      className="absolute right-[25%] top-[20%] size-1.5 rounded-full bg-fuchsia-300/60"
      style={{
        animation: "floatReverse 6s ease-in-out infinite",
      }}
    />

    <div
      className="absolute right-[10%] bottom-[25%] size-2 rounded-full bg-pink-300/50"
      style={{
        animation: "float 7s ease-in-out infinite",
      }}
    />

    {/* Grid */}
    <div
      className="absolute inset-0 opacity-[0.035]"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }}
    />
  </div>

  {/* Main content */}
  <div className="relative z-10 mx-auto max-w-7xl pb-16">
    <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
      <div>
      

        <h1 className="flex items-center gap-3 text-slate-900 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
          Find Your Dream Job
          <Sparkles className="size-6 shrink-0 animate-pulse fill-pink-400 text-pink-400 sm:size-7" />
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          Discover handpicked career opportunities matched to your
          expertise, experience, and goals.
        </p>
      </div>

      {/* AI Card */}
      <div className="hidden items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 shadow-xl backdrop-blur-xl lg:flex">
        <div className="grid size-11 place-items-center rounded-xl bg-white">
          <img
            src={Logo}
            alt="AI"
            className="size-9 object-contain"
          />
        </div>

        <div>
          <p className="text-xs font-bold text-white">
            AI Assistant Ready
          </p>

          <p className="mt-0.5 text-[11px] text-slate-500">
            Find jobs faster with AI
          </p>
        </div>
      </div>
    </div>

    {/* Reliable Search Box Design */}
    <form
      onSubmit={submit}
      className="relative overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/90 p-2.5 shadow-2xl shadow-black/50 backdrop-blur-2xl ring-1 ring-white/10"
    >
      {/* Top Gradient Border Accent */}
      <div className="absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500" />

      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-0">
        {/* Keyword */}
        <div className="relative flex w-full flex-1 items-center px-4 py-3 rounded-xl bg-slate-950/50 md:bg-transparent md:border-r md:border-slate-800">
          <Search className="mr-3 size-5 shrink-0 text-pink-400" />

          <div className="min-w-0 flex-1">
            <label className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              What are you looking for?
            </label>

            <input
              aria-label="Search jobs"
              className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-500"
              placeholder="Job title, skill or keyword"
              value={filters.q}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  q: e.target.value,
                })
              }
            />
          </div>
        </div>

        {/* Location */}
        <div className="relative flex w-full flex-1 items-center px-4 py-3 rounded-xl bg-slate-950/50 md:bg-transparent">
          <MapPin className="mr-3 size-5 shrink-0 text-fuchsia-400" />

          <div className="min-w-0 flex-1">
            <label className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Where?
            </label>

            <input
              aria-label="Location"
              className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-500"
              placeholder="City, country, or remote"
              value={filters.location}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  location: e.target.value,
                })
              }
            />
          </div>
        </div>

        {/* Button */}
        <button
          type="submit"
          disabled={loading}
          className="h-12 w-full shrink-0 rounded-xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-rose-500 px-8 text-sm font-bold text-white shadow-lg shadow-pink-500/25 transition duration-200 hover:-translate-y-0.5 hover:shadow-pink-500/40 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto ml-0 md:ml-2"
        >
          <span className="flex items-center justify-center gap-2">
            {loading && (
              <Loader2 className="size-4 animate-spin" />
            )}
            Search Jobs
            {!loading && <ArrowRight className="size-4" />}
          </span>
        </button>
      </div>
    </form>
  </div>

  {/* ================= DYNAMIC WAVE ANIMATION ================= */}
  <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0]">
    <svg
      className="relative block h-[70px] w-full"
      viewBox="0 24 150 28"
      preserveAspectRatio="none"
    >
      <defs>
        <path
          id="gentle-wave"
          d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z"
        />
      </defs>
      <g className="animate-wave">
        <use href="#gentle-wave" x="48" y="0" className="fill-white/10" />
        <use href="#gentle-wave" x="48" y="3" className="fill-white/30" />
        <use href="#gentle-wave" x="48" y="5" className="fill-white" />
      </g>
    </svg>
  </div>

  {/* Global CSS for wave movement */}
  <style>{`
    @keyframes waveMove {
      0% { transform: translate3d(-90px, 0, 0); }
      100% { transform: translate3d(85px, 0, 0); }
    }
    .animate-wave > g, .animate-wave {
      animation: waveMove 7s cubic-bezier(0.36, 0.45, 0.63, 0.53) infinite;
    }
    .animate-wave use:nth-child(1) {
      animation-delay: -2s;
      animation-duration: 7s;
    }
    .animate-wave use:nth-child(2) {
      animation-delay: -4s;
      animation-duration: 10s;
    }
    .animate-wave use:nth-child(3) {
      animation-delay: -6s;
      animation-duration: 13s;
    }
  `}</style>
</section>

      {/* Main Content Layout */}
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        
        {/* Header toolbar above results */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-extrabold text-slate-900">Recommended jobs</h2>
            <span className="rounded-full bg-pink-50 border border-pink-100 px-3 py-0.5 text-xs font-bold text-pink-600">
              {loading ? "..." : jobs.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm">
              <SlidersHorizontal className="size-3.5 text-pink-500" />
              <span>Most recent</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Sidebar Filters */}
          <aside className="lg:col-span-3 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-6 sticky top-24">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Job Type</h3>
              {(filters.q || filters.location || filters.experience || filters.workType) && (
                <button
                  type="button"
                  onClick={() => { setFilters(emptyFilters); void loadJobs(emptyFilters); }}
                  className="text-xs font-semibold text-pink-600 hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Work Type Options */}
            <div className="space-y-2.5 text-xs font-medium text-slate-700">
              {[
                { label: "Full time", value: "full_time" },
                { label: "Part time", value: "part_time" },
                { label: "Internship", value: "internship" },
                { label: "Contract", value: "contract" },
                { label: "Remote", value: "remote" },
              ].map((item) => (
                <label key={item.value} className="flex items-center gap-2.5 cursor-pointer hover:text-pink-600">
                  <input
                    type="checkbox"
                    checked={filters.workType === item.value}
                    onChange={(e) => {
                      const val = e.target.checked ? item.value : "";
                      const updated = { ...filters, workType: val };
                      setFilters(updated);
                      void loadJobs(updated);
                    }}
                    className="size-4 rounded border-slate-300 text-pink-600 focus:ring-pink-500 accent-pink-500"
                  />
                  {item.label}
                </label>
              ))}
            </div>

            {/* Salary Range Filter Section */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm mb-3">Salary Range</h3>
              <div className="space-y-2">
                <input type="range" min="10" max="300" className="w-full accent-pink-500 cursor-pointer" />
                <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                  <span>$50k</span>
                  <span>$120k</span>
                </div>
              </div>
            </div>

            {/* Experience Level Filter Section */}
            <div className="pt-4 border-t border-slate-100 space-y-2.5">
              <h3 className="font-bold text-slate-900 text-sm mb-3">Experience Level</h3>
              {[
                { label: "Entry level", value: "junior" },
                { label: "Intermediate", value: "mid" },
                { label: "Expert / Senior", value: "senior" },
              ].map((item) => (
                <label key={item.value} className="flex items-center gap-2.5 cursor-pointer hover:text-pink-600 text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={filters.experience === item.value}
                    onChange={(e) => {
                      const val = e.target.checked ? item.value : "";
                      const updated = { ...filters, experience: val };
                      setFilters(updated);
                      void loadJobs(updated);
                    }}
                    className="size-4 rounded border-slate-300 text-pink-600 focus:ring-pink-500 accent-pink-500"
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </aside>

          {/* Right Main 3-Column Grid */}
          <div className="lg:col-span-9">
            {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700 mb-6">{error}</div>}

            {!loading && !error && jobs.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center shadow-sm">
                <Search className="mx-auto size-8 text-slate-300" />
                <h3 className="mt-3 font-bold text-slate-800">No matching listings found</h3>
                <p className="mt-1 text-xs text-slate-500">Try adjusting your sidebar criteria or search keywords.</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          </div>

        </div>
      </main>

      {/* Floating AI Assistant Pop-up Widget (Slate & Sky Blue Theme) */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isAiPopupOpen ? (
          <button 
            onClick={() => setIsAiPopupOpen(true)}
            className="group relative flex items-center gap-3 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 p-4 text-white shadow-xl shadow-pink-500/30 transition hover:scale-105"
            aria-label="Open AI Assistant"
          >
          
            <span className="hidden font-bold pr-2 sm:inline">Ask AI Assistant</span>
            <img src={heroImage} alt="" className="absolute -top-10 right-0 h-14 w-14 object-contain drop-shadow-md transition-transform group-hover:-translate-y-1" />
          </button>
        ) : (
          <div className="w-80 sm:w-96 rounded-3xl border border-pink-100 bg-white shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between bg-gradient-to-r from-pink-500 to-rose-500 px-5 py-4 text-white">
              <div className="flex items-center gap-2">
                <Bot className="size-5" />
                <h3 className="font-bold">AI Career Assistant</h3>
              </div>
              <button onClick={() => setIsAiPopupOpen(false)} className="rounded-full p-1 hover:bg-white/20 transition">
                <X className="size-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="grid size-8 shrink-0 place-items-center rounded-full bg-pink-100 text-pink-600 font-bold">AI</div>
                <div className="rounded-2xl bg-pink-50/70 p-3.5 text-xs leading-relaxed text-slate-700">
                  Hi there! I can help match your resume with open positions or answer any questions about roles. What are you looking for today?
                </div>
              </div>
              <a 
                href="/ai-assistant" 
                onClick={handleInternalLink} 
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 py-3 text-xs font-bold text-white shadow-md hover:opacity-95 transition"
              >
                Open Full Assistant <ArrowRight className="size-3.5" />
              </a>
            </div>
          </div>
        )}
      </div>


    </div>
  );
}

function JobCard({ job }: { job: JobPost }) {
  const [saved, setSaved] = useState(false);

  return (
    <article className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:border-pink-300 hover:shadow-md">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-pink-50 border border-pink-100 text-base font-extrabold text-pink-600">
              {job.company.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm group-hover:text-pink-600 transition-colors line-clamp-1">
                {job.title}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">{job.company.name} • 12 Applicants</p>
            </div>
          </div>
          <button 
            type="button" 
            aria-label={saved ? "Remove saved job" : "Save job"} 
            onClick={() => setSaved((value) => !value)} 
            className={`grid size-8 shrink-0 place-items-center rounded-xl border transition ${
              saved ? "border-pink-200 bg-pink-50 text-pink-500" : "border-slate-200 text-slate-400 hover:bg-slate-50"
            }`}
          >
            <Heart className={`size-4 ${saved ? "fill-current" : ""}`} />
          </button>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <span className="rounded-lg bg-pink-50 border border-pink-100 px-2 py-0.5 text-[10px] font-bold text-pink-600">
            {titleCase(job.experienceLevel)}
          </span>
          <span className="rounded-lg bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
            {workTypeLabel(job.location.workType)}
          </span>
          <span className="rounded-lg bg-amber-50 border border-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-600">
            {job.location.city}
          </span>
        </div>

        <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
          {job.description}
        </p>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1">
          <DollarSign className="size-3.5 text-emerald-500 shrink-0" /> {formatSalary(job, true)}
        </div>

        <a 
          href={`/jobs/${job.id}`} 
          onClick={handleInternalLink} 
          className="inline-flex h-8 items-center gap-1 rounded-xl bg-slate-900 px-3 text-xs font-bold text-white transition hover:bg-pink-600"
        >
          View <ArrowRight className="size-3" />
        </a>
      </div>
    </article>
  );
}

export function titleCase(value: string) {
  return value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function workTypeLabel(value: JobPost["location"]["workType"]) {
  return value === "onsite" ? "On-site" : titleCase(value);
}

export function formatSalary(job: JobPost, compact = false) {
  const formatter = new Intl.NumberFormat("en", { notation: compact ? "compact" : "standard", maximumFractionDigits: 0 });
  return `${job.salary.currency} ${formatter.format(job.salary.min)}`;
}