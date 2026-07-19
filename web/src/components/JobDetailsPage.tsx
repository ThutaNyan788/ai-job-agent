import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Globe,
  Heart,
  Loader2,
  MapPin,
  Share2,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import type { ApplicationStatusEvent, JobPost } from "@shared/events";
import { apiFetch, uploadCv } from "@/api";
import { handleInternalLink } from "@/navigation";
import { formatSalary, titleCase, workTypeLabel } from "./JobListPage";

function ApplyNowModal({
  job,
  deciding,
  onClose,
  onConfirmApplication,
}: {
  job: JobPost;
  deciding: boolean;
  onClose: () => void;
  onConfirmApplication: () => Promise<void>;
}) {
  const [cvOption, setCvOption] = useState<"have" | "dont-have" | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deciding) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [deciding, onClose]);

  async function processFile(selectedFile: File) {
    setUploadError(null);
    setUploaded(false);
    if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setFile(null);
      setUploadError("Please upload a PDF file.");
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setFile(null);
      setUploadError("The PDF must be 5 MB or smaller.");
      return;
    }

    setFile(selectedFile);
    setUploading(true);
    try {
      await uploadCv(selectedFile);
      setUploaded(true);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "The CV could not be uploaded.");
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) void processFile(selectedFile);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const selectedFile = event.dataTransfer.files[0];
    if (selectedFile) void processFile(selectedFile);
  }

  function clearFile() {
    setFile(null);
    setUploaded(false);
    setUploadError(null);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto p-4">
      <button
        type="button"
        aria-label="Close application modal"
        className="fixed inset-0 cursor-default bg-slate-950/45 backdrop-blur-sm"
        disabled={deciding}
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="apply-modal-title"
        className="relative z-10 my-8 w-full max-w-xl overflow-hidden rounded-2xl border border-slate-100 bg-white text-left shadow-2xl"
      >
        <div className="pointer-events-none absolute -left-16 -top-16 size-44 rounded-full bg-pink-400/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 -right-16 size-44 rounded-full bg-pink-500/10 blur-2xl" />
        <button
          type="button"
          onClick={onClose}
          disabled={deciding}
          aria-label="Close"
          className="absolute right-4 top-4 z-20 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
        >
          <X className="size-5" />
        </button>

        <header className="border-b border-slate-100 bg-gradient-to-r from-white to-pink-50/40 p-6 sm:p-8">
          <span className="mb-1 inline-block text-xs font-bold uppercase tracking-wider text-pink-600">Portal application</span>
          <h2 id="apply-modal-title" className="pr-8 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Apply for <span className="bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">{job.title}</span>
          </h2>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">at {job.company.name}</p>
        </header>

        <div className="space-y-6 p-6 sm:p-8">
          <div className="space-y-3">
            <p className="block text-sm font-semibold text-slate-700 sm:text-base">Do you already have a CV?</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setCvOption("have");
                  clearFile();
                }}
                className={`flex items-start rounded-xl border-2 p-4 text-left transition-all ${
                  cvOption === "have" ? "border-pink-500 bg-pink-50/40" : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <span className={`mr-3 rounded-lg p-2 ${cvOption === "have" ? "bg-pink-500 text-white" : "bg-slate-100 text-slate-500"}`}>
                  <FileText className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-800">I have a CV</span>
                  <span className="mt-0.5 block text-[11px] text-slate-400">Upload a PDF document</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCvOption("dont-have");
                  clearFile();
                }}
                className={`flex items-start rounded-xl border-2 p-4 text-left transition-all ${
                  cvOption === "dont-have" ? "border-pink-500 bg-pink-50/40" : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <span className={`mr-3 rounded-lg p-2 ${cvOption === "dont-have" ? "bg-pink-500 text-white" : "bg-slate-100 text-slate-500"}`}>
                  <Sparkles className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-800">I don&apos;t have a CV</span>
                  <span className="mt-0.5 block text-[11px] text-slate-400">Build one using the AI assistant</span>
                </span>
              </button>
            </div>
          </div>

          {cvOption === "have" && (
            <div className="space-y-4 border-t border-slate-100 pt-5">
              {!file && (
                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all ${
                    isDragging ? "border-pink-500 bg-pink-50/40" : "border-slate-200 hover:border-pink-300"
                  }`}
                >
                  <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" onChange={handleFileChange} className="sr-only" />
                  <UploadCloud className="mx-auto mb-2 size-6 text-pink-500" />
                  <p className="text-xs font-medium text-slate-600 sm:text-sm">
                    Drop your document here or <span className="font-semibold text-pink-600 underline">browse</span>
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">PDF only, up to 5 MB</p>
                </div>
              )}

              {file && (
                <div className="flex items-center justify-between rounded-xl border border-pink-100 bg-pink-50/30 p-3.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="rounded-lg bg-pink-100 p-2 text-pink-600"><FileText className="size-5" /></span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-800 sm:text-sm">{file.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {formatFileSize(file.size)}{uploading ? " · Uploading…" : uploaded ? " · Ready" : ""}
                      </p>
                    </div>
                  </div>
                  {uploading ? (
                    <Loader2 className="size-4 shrink-0 animate-spin text-pink-500" />
                  ) : (
                    <button type="button" onClick={clearFile} aria-label="Remove CV" className="rounded-full p-1 text-slate-400 hover:bg-white hover:text-slate-600">
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              )}

              {uploadError && <p role="alert" className="text-xs font-medium text-rose-600">{uploadError}</p>}

              <button
                type="button"
                onClick={() => void onConfirmApplication()}
                disabled={!uploaded || uploading || deciding}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deciding ? <><Loader2 className="size-4 animate-spin" /> Processing application…</> : <>Send to HR <ChevronRight className="size-4" /></>}
              </button>
            </div>
          )}

          {cvOption === "dont-have" && (
            <div className="space-y-4 border-t border-slate-100 pt-6 text-center">
              <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-gradient-to-tr from-pink-100 to-rose-100 shadow-inner">
                <Sparkles className="size-6 text-pink-600" />
              </span>
              <div className="mx-auto max-w-sm space-y-1">
                <h3 className="text-sm font-bold text-slate-800 sm:text-base">No worries!</h3>
                <p className="text-xs leading-relaxed text-slate-400">Build an optimized resume with the AI assistant, then return here to apply.</p>
              </div>
              <a
                href="/ai-assistant"
                onClick={handleInternalLink}
                className="inline-flex rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-6 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-95 sm:text-sm"
              >
                Create CV with AI
              </a>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export function JobDetailsPage({
  jobId,
  application,
  connected,
  onRequestApplication,
  onDecideApplication,
}: {
  jobId: string;
  application: ApplicationStatusEvent | null;
  connected: boolean;
  onRequestApplication: (jobId: string) => void;
  onDecideApplication: (workflowId: string, approved: boolean, jobTitle: string) => Promise<void>;
}) {
  const [job, setJob] = useState<JobPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    void apiFetch<{ job: JobPost }>(`/api/jobs/${encodeURIComponent(jobId)}`)
      .then((data) => setJob(data.job))
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Unable to load job"))
      .finally(() => setLoading(false));
  }, [jobId]);

  async function decide(approved: boolean) {
    if (!application || !job) return;
    setDeciding(true);
    try {
      await onDecideApplication(application.workflowId, approved, job.title);
      setIsModalOpen(false);
    } finally {
      setDeciding(false);
    }
  }

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-slate-50 text-sm font-medium text-slate-500"><span className="inline-flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Loading job...</span></div>;
  }
  if (!job || error) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 px-4 text-center">
        <div><h1 className="text-2xl font-bold text-slate-950">Job not found</h1><p className="mt-2 text-slate-500">{error ?? "This position is no longer available."}</p><a href="/jobs" onClick={handleInternalLink} className="mt-6 inline-flex items-center gap-2 font-bold text-pink-600"><ArrowLeft className="size-4" /> Back to jobs</a></div>
      </div>
    );
  }

  const location = `${job.location.city}, ${job.location.country}`;
  return (
    <div className="min-h-screen bg-slate-50 pb-36 text-slate-800 antialiased selection:bg-pink-100 selection:text-pink-700">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="/jobs" onClick={handleInternalLink} className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-slate-400 transition hover:text-slate-900"><ArrowLeft className="mr-2 size-4" /> Back to careers</a>
          <span className="inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700"><span className="mr-2 size-1.5 rounded-full bg-emerald-500" /> Accepting applications</span>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-white py-14 sm:py-16">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-4 sm:px-6 md:flex-row md:items-center lg:px-8">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-lg border border-pink-100 bg-pink-50 px-3 py-1 text-xs font-bold tracking-wide text-pink-600"><Sparkles className="size-3.5 fill-pink-500" /> Featured position</div>
            <h1 className="text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">{job.title}</h1>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-semibold text-slate-500">
              <span className="flex items-center gap-1.5 text-slate-900"><Building2 className="size-4 text-slate-400" /> {job.company.name}</span>
              <span className="flex items-center gap-1.5"><MapPin className="size-4 text-slate-400" /> {location}</span>
              <span className="flex items-center gap-1.5"><Clock className="size-4 text-slate-400" /> {relativeDate(job.postedAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 self-start rounded-2xl border border-slate-100 bg-slate-50 p-4 md:self-auto">
            <div className="grid size-12 place-items-center rounded-xl bg-pink-500 text-xl font-black text-white shadow-sm">{job.company.name.charAt(0)}</div>
            <div><h2 className="font-bold leading-tight text-slate-950">{job.company.name}</h2><p className="mt-0.5 text-xs font-medium text-slate-400">Technology &amp; engineering</p></div>
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Est. base salary" value={`${job.salary.currency} ${job.salary.min.toLocaleString()}`} note="Starting range" noteClass="text-pink-600" />
          <Metric label="Max range" value={`${job.salary.currency} ${job.salary.max.toLocaleString()}`} note="Maximum cap" noteClass="text-emerald-600" />
          <Metric label="Work model" value={workTypeLabel(job.location.workType)} note={location} />
          <Metric label="Experience" value={`${job.yearsOfExperience.min}-${job.yearsOfExperience.max} years`} note={titleCase(job.experienceLevel)} />
        </div>
      </section>

      <main className="mx-auto mt-12 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <ContentCard title="Position mission"><p className="text-base font-light leading-8 text-slate-700 sm:text-lg">{job.description}</p></ContentCard>
            <ContentCard title="Role responsibilities">
              <div className="grid gap-4">{job.responsibilities.map((item, index) => <div key={item} className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4"><span className="grid size-8 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white font-mono text-sm font-black text-pink-600 shadow-sm">{String(index + 1).padStart(2, "0")}</span><p className="mt-1.5 text-sm font-semibold leading-6 text-slate-600">{item}</p></div>)}</div>
            </ContentCard>
            <ContentCard title="Target requirements">
              <div className="space-y-4">
                {[...job.requirements, `Core technologies: ${job.requiredSkills.map((skill) => `${skill.name} (${skill.level})`).join(", ")}`, `Preferred: ${job.niceToHave.join(", ")}`].map((item) => <div key={item} className="flex gap-4"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" /><p className="text-sm font-medium leading-6 text-slate-600 sm:text-base">{item}</p></div>)}
              </div>
            </ContentCard>
          </div>

          <aside className="space-y-6 lg:col-span-4">
            <ContentCard title="The employer" compact>
              <p className="text-sm font-medium leading-6 text-slate-500">{job.company.name} is hiring a {job.title} to help deliver high-quality {job.experienceLevel}-level work with its growing team.</p>
              <div className="my-5 grid grid-cols-2 gap-3 text-xs"><Info label="Employment" value={titleCase(job.employmentType)} /><Info label="Team" value="Growing team" /></div>
              <a href={job.company.website} target="_blank" rel="noreferrer" className="inline-flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-100"><span>Explore website</span><Globe className="size-4 text-slate-400" /></a>
            </ContentCard>
            <ContentCard title="Benefits" compact>
              <div className="grid gap-2.5">{job.benefits.map((benefit) => <div key={benefit} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs font-semibold text-slate-600"><Award className="size-4 shrink-0 text-pink-500" /> {benefit}</div>)}</div>
            </ContentCard>
          </aside>
        </div>
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 mx-auto max-w-4xl px-4 sm:px-6">
        <div className="pointer-events-auto flex items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-2xl backdrop-blur-md">
          <div className="hidden sm:block"><h2 className="text-sm font-black leading-tight text-slate-950">{job.title}</h2><span className="text-xs font-bold text-pink-600">{formatSalary(job)}</span></div>
          <div className="flex w-full items-center gap-3 sm:w-auto">
            <button type="button" onClick={() => setSaved((value) => !value)} aria-label={saved ? "Remove saved job" : "Save job"} className={`grid size-11 shrink-0 place-items-center rounded-xl border transition ${saved ? "border-pink-200 bg-pink-50 text-pink-500" : "border-slate-200 text-slate-400 hover:bg-slate-50"}`}><Heart className={`size-4 ${saved ? "fill-current" : ""}`} /></button>
            <button type="button" onClick={() => void shareJob(job)} aria-label="Share job" className="grid size-11 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-900"><Share2 className="size-4" /></button>
            <ApplicationButtons application={application} connected={connected} deciding={deciding} onStart={() => onRequestApplication(job.id)} onConfirm={() => setIsModalOpen(true)} onDecide={decide} />
          </div>
        </div>
      </div>

      {isModalOpen && application?.status === "pending" && (
        <ApplyNowModal
          job={job}
          deciding={deciding}
          onClose={() => setIsModalOpen(false)}
          onConfirmApplication={() => decide(true)}
        />
      )}
    </div>
  );
}

function Metric({ label, value, note, noteClass = "text-slate-500" }: { label: string; value: string; note: string; noteClass?: string }) {
  return <div className="flex h-32 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span><div><div className="text-2xl font-black tracking-tight text-slate-950">{value}</div><span className={`mt-1 block truncate text-[11px] font-bold ${noteClass}`}>{note}</span></div></div>;
}

function ContentCard({ title, children, compact = false }: { title: string; children: React.ReactNode; compact?: boolean }) {
  return <section className={`space-y-5 rounded-3xl border border-slate-200 bg-white shadow-sm ${compact ? "p-6" : "p-6 sm:p-8"}`}><div className="flex items-center gap-2"><span className="h-5 w-1 rounded-full bg-pink-500" /><h2 className="text-xs font-black uppercase tracking-wider text-slate-400">{title}</h2></div>{children}</section>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="space-y-1 rounded-xl border border-slate-100 bg-slate-50 p-3"><span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span><span className="font-black text-slate-900">{value}</span></div>;
}

function ApplicationButtons({ application, connected, deciding, onStart, onConfirm, onDecide }: { application: ApplicationStatusEvent | null; connected: boolean; deciding: boolean; onStart: () => void; onConfirm: () => void; onDecide: (approved: boolean) => Promise<void> }) {
  if (application?.status === "submitted") return <button type="button" disabled className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-xs font-black uppercase tracking-wider text-white sm:flex-initial"><CheckCircle2 className="size-4" /> Applied</button>;
  if (application?.status === "cancelled") return <button type="button" disabled className="flex h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 px-6 text-xs font-black uppercase tracking-wider text-slate-400 sm:flex-initial">Application cancelled</button>;
  if (application?.status === "pending") {
    return <>
      <button type="button" disabled={deciding} onClick={() => void onDecide(false)} className="h-11 rounded-xl border border-slate-200 px-4 text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50 disabled:opacity-60">Cancel</button>
      <button type="button" disabled={deciding} onClick={onConfirm} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-5 text-xs font-black uppercase tracking-wider text-white shadow-md disabled:opacity-60 sm:flex-initial">Confirm apply</button>
    </>;
  }
  return <button type="button" disabled={!connected} onClick={onStart} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-6 text-xs font-black uppercase tracking-wider text-white shadow-md transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-initial">Apply now <ArrowRight className="size-4" /></button>;
}

function relativeDate(value: string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
  if (days === 0) return "Posted today";
  return `Posted ${days} day${days === 1 ? "" : "s"} ago`;
}

async function shareJob(job: JobPost) {
  const data = { title: job.title, text: `${job.title} at ${job.company.name}`, url: location.href };
  if (navigator.share) await navigator.share(data).catch(() => undefined);
  else await navigator.clipboard.writeText(location.href);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
