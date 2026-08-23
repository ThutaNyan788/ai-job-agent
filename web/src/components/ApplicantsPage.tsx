import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Award,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  Download,
  Loader2,
  Mail,
  Search,
  Send,
  Users,
  Video,
  X,
} from "lucide-react";
import { EventType, type AgentEvent, type ApplicationStatus, type InterviewInviteStatus, type JobPost } from "@shared/events";
import type { CandidateProfile } from "@shared/candidate";
import { apiFetch } from "@/api";
import { AUTH_BASE_URL } from "@/auth-client";
import { MarketplaceHeader } from "./MarketplaceHeader";

type Applicant = {
  userId: string;
  jobId: string;
  jobTitle: string;
  workflowId: string;
  status: ApplicationStatus;
  appliedAt: string;
  email: string | null;
  profile: CandidateProfile;
  cv: { fileName: string; source: "uploaded" | "generated" } | null;
};

type InviteState = { status: InterviewInviteStatus; error?: string };

// One applicant can appear under several of the company's job posts, so every
// per-applicant lookup on this page is keyed by the job as well as the user.
function applicantKey(applicant: { userId: string; jobId: string }) {
  return `${applicant.jobId}:${applicant.userId}`;
}

// The invitation email is sent by a background workflow, which reports progress
// on the event stream. Fold that stream down to the latest state per applicant.
function inviteStates(events: AgentEvent[]): Record<string, InviteState> {
  const states: Record<string, InviteState> = {};
  for (const event of events) {
    if (event.type === EventType.InterviewInvite) {
      states[`${event.jobId}:${event.applicantUserId}`] = { status: event.status, error: event.error };
    }
  }
  return states;
}

function formatAppliedAt(value: string): string {
  const applied = new Date(value);
  if (Number.isNaN(applied.getTime())) return "";
  const days = Math.floor((Date.now() - applied.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return applied.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function ApplicantsPage({
  email,
  events,
  jobId,
}: {
  email: string;
  events: AgentEvent[];
  jobId?: string;
}) {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobFilter, setJobFilter] = useState(jobId ?? "all");
  const [showAllStatuses, setShowAllStatuses] = useState(false);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState<Applicant | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const invites = inviteStates(events);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch<{ applicants: Applicant[]; jobs: JobPost[] }>("/api/company/applicants")
      .then((data) => {
        setApplicants(data.applicants);
        setJobs(data.jobs);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load applicants"))
      .finally(() => setLoading(false));
  }, []);

  // A deep link from a job card preselects that post; the filter stays editable
  // so clearing it reveals everyone who applied to any of the company's jobs.
  useEffect(() => {
    setJobFilter(jobId ?? "all");
  }, [jobId]);

  const counts = useMemo(() => {
    const byJob: Record<string, number> = {};
    for (const job of jobs) byJob[job.id] = 0;
    for (const applicant of applicants) byJob[applicant.jobId] = (byJob[applicant.jobId] ?? 0) + 1;
    return byJob;
  }, [applicants, jobs]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return applicants.filter((applicant) => {
      if (jobFilter !== "all" && applicant.jobId !== jobFilter) return false;
      if (!showAllStatuses && applicant.status !== "submitted" && applicant.status !== "accepted") return false;
      if (!term) return true;
      const haystack = [applicant.profile.fullName, applicant.email, applicant.jobTitle, applicant.profile.targetRole];
      return haystack.some((field) => field?.toLowerCase().includes(term));
    });
  }, [applicants, jobFilter, showAllStatuses, search]);

  const hidden = applicants.length - visible.length;

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3500);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <MarketplaceHeader email={email} role="company" />

      {toast && (
        <div role="status" className="fixed right-5 top-20 z-[60] flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-xl">
          <CheckCircle2 className="size-4 text-emerald-400" /> {toast}
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-9 sm:px-6 lg:px-8">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-pink-600">Applicants</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Everyone who applied</h1>
          <p className="mt-1 text-sm text-slate-500">
            {loading
              ? "Loading applications..."
              : `${applicants.length} application${applicants.length === 1 ? "" : "s"} across ${jobs.length} job post${jobs.length === 1 ? "" : "s"}`}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <label className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email or role"
              aria-label="Search applicants"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
            />
          </label>

          <select
            value={jobFilter}
            onChange={(event) => setJobFilter(event.target.value)}
            aria-label="Filter by job post"
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
          >
            <option value="all">All job posts ({applicants.length})</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>{job.title} ({counts[job.id] ?? 0})</option>
            ))}
          </select>

          <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            <input
              type="checkbox"
              checked={showAllStatuses}
              onChange={(event) => setShowAllStatuses(event.target.checked)}
              className="size-4 accent-pink-600"
            />
            Show pending &amp; cancelled
          </label>
        </div>

        {loading && <div className="mt-16 flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" /> Loading applicants...</div>}
        {error && <div role="alert" className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">{error}</div>}

        {!loading && !error && visible.length === 0 && (
          <div className="mt-10 rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-20 text-center">
            <Users className="mx-auto size-10 text-pink-300" />
            <h2 className="mt-4 text-lg font-bold text-slate-950">
              {applicants.length === 0 ? "No applicants yet" : "No applicants match these filters"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {applicants.length === 0
                ? "Once candidates apply to your job posts, they'll all show up here."
                : `${hidden} application${hidden === 1 ? " is" : "s are"} hidden by the current filters.`}
            </p>
          </div>
        )}

        {!loading && !error && visible.length > 0 && (
          <ul className="mt-6 space-y-3">
            {visible.map((applicant) => {
              const key = applicantKey(applicant);
              return (
                <ApplicantRow
                  key={key}
                  applicant={applicant}
                  expanded={expanded === key}
                  invite={invites[key]}
                  onToggle={() => setExpanded((current) => (current === key ? null : key))}
                  onSchedule={() => setScheduling(applicant)}
                  onAccepted={() => {
                    setApplicants((current) => current.map((entry) => (
                      applicantKey(entry) === key ? { ...entry, status: "accepted" } : entry
                    )));
                    notify(`${applicant.profile.fullName ?? applicant.email ?? "The candidate"} can now join the AI interview.`);
                  }}
                />
              );
            })}
          </ul>
        )}
      </main>

      {scheduling && (
        <ScheduleModal
          applicant={scheduling}
          onClose={() => setScheduling(null)}
          onQueued={() => {
            setScheduling(null);
            notify(`Sending the invitation to ${scheduling.email ?? "the candidate"} in the background...`);
          }}
        />
      )}
    </div>
  );
}

function InviteBadge({ invite }: { invite: InviteState }) {
  if (invite.status === "sending") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">
        <Loader2 className="size-3 animate-spin" /> Sending invitation...
      </span>
    );
  }
  if (invite.status === "sent") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
        <CheckCircle2 className="size-3" /> Invitation sent
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
      <AlertTriangle className="size-3" /> Invitation failed
    </span>
  );
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const classes = status === "accepted"
    ? "border-emerald-300 bg-emerald-100 text-emerald-800"
    : status === "submitted"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "pending"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-slate-100 text-slate-600";
  const label = status === "accepted"
    ? "Accepted"
    : status === "submitted"
      ? "Applied"
      : status === "pending"
        ? "Pending confirmation"
        : "Cancelled";
  return <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${classes}`}>{label}</span>;
}

function ApplicantRow({
  applicant,
  expanded,
  invite,
  onToggle,
  onSchedule,
  onAccepted,
}: {
  applicant: Applicant;
  expanded: boolean;
  invite?: InviteState;
  onToggle: () => void;
  onSchedule: () => void;
  onAccepted: () => void;
}) {
  const { profile } = applicant;
  const name = profile.fullName ?? applicant.email ?? "Unnamed candidate";
  const initials = name.trim().slice(0, 2).toUpperCase();
  const skills = [...profile.skills, ...profile.programmingLanguages];
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  // Accepting is what makes "Join AI Interview" appear on the candidate's side.
  async function accept() {
    setAccepting(true);
    setAcceptError(null);
    try {
      await apiFetch(`/api/company/jobs/${encodeURIComponent(applicant.jobId)}/applicants/${encodeURIComponent(applicant.userId)}/accept`, {
        method: "POST",
      });
      onAccepted();
    } catch (error) {
      setAcceptError(error instanceof Error ? error.message : "The application could not be accepted.");
    } finally {
      setAccepting(false);
    }
  }

  return (
    <li className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex min-w-[240px] flex-1 items-center gap-3 text-left"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-400 text-sm font-black text-white shadow-sm">{initials}</span>
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="truncate font-black text-slate-950">{name}</span>
              <ChevronDown className={`size-4 shrink-0 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 font-bold text-pink-600"><Briefcase className="size-3" /> {applicant.jobTitle}</span>
              {applicant.email && <span className="inline-flex items-center gap-1"><Mail className="size-3" /> {applicant.email}</span>}
            </span>
          </span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">{formatAppliedAt(applicant.appliedAt)}</span>
          <StatusBadge status={applicant.status} />
          {applicant.cv ? (
            <a
              href={`${AUTH_BASE_URL}/api/company/jobs/${encodeURIComponent(applicant.jobId)}/applicants/${encodeURIComponent(applicant.userId)}/cv`}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              <Download className="size-3.5" /> CV
            </a>
          ) : (
            <span className="inline-flex h-9 items-center rounded-xl border border-dashed border-slate-200 px-3 text-xs font-bold text-slate-400">No CV</span>
          )}
          {applicant.status === "submitted" && (
            <button
              type="button"
              onClick={() => void accept()}
              disabled={accepting}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 text-xs font-black text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {accepting ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />} Accept
            </button>
          )}
          <button
            type="button"
            onClick={onSchedule}
            disabled={invite?.status === "sending"}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-3 text-xs font-black text-white shadow-sm shadow-pink-100 hover:from-pink-600 hover:to-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Video className="size-3.5" /> Interview
          </button>
        </div>
      </div>

      {(acceptError || invite) && (
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-4 py-3">
          {acceptError && <p className="text-xs font-semibold text-red-600">{acceptError}</p>}
          {invite && <InviteBadge invite={invite} />}
          {invite?.status === "failed" && invite.error && <p className="text-xs font-medium text-red-600">{invite.error}</p>}
        </div>
      )}

      {expanded && (
        <div className="grid gap-6 border-t border-slate-100 bg-slate-50/60 p-5 lg:grid-cols-2">
          <div>
            {profile.targetRole && (
              <p className="flex items-center gap-1.5 text-sm font-bold text-slate-700"><Briefcase className="size-3.5 text-slate-400" /> Looking for {profile.targetRole}</p>
            )}
            {profile.experienceYears != null && (
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><Award className="size-4 text-slate-400" /> {profile.experienceYears} years of experience</p>
            )}
            {skills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {skills.slice(0, 16).map((skill) => (
                  <span key={skill} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">{skill}</span>
                ))}
              </div>
            )}
            {applicant.status === "accepted" && (
              <p className="mt-4 text-xs font-medium text-emerald-700">
                Accepted - this candidate can now join the AI interview from their Interviews page.
              </p>
            )}
          </div>

          <div>
            {profile.summary && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Summary</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{profile.summary}</p>
              </div>
            )}
            {profile.workExperience.length > 0 && (
              <div className="mt-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Experience</p>
                <div className="mt-2 space-y-3">
                  {profile.workExperience.slice(0, 3).map((entry) => (
                    <div key={`${entry.company}-${entry.title}`} className="text-sm">
                      <p className="font-bold text-slate-800">{entry.title} · {entry.company}</p>
                      <p className="text-xs text-slate-500">{entry.startDate ?? "?"} - {entry.current ? "Present" : entry.endDate ?? "?"}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {profile.workExperience.length === 0 && !profile.summary && (
              <p className="text-sm text-slate-400">This candidate hasn't filled in their profile summary or experience yet.</p>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function ScheduleModal({
  applicant,
  onClose,
  onQueued,
}: {
  applicant: Applicant;
  onClose: () => void;
  onQueued: () => void;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("14:00");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = applicant.profile.fullName ?? applicant.email ?? "there";
  const jobTitle = applicant.jobTitle;

  // The request only queues the email - it returns as soon as the background
  // workflow starts, so this never waits on SMTP.
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError(null);
    try {
      const form = new FormData(event.currentTarget);
      await apiFetch(`/api/company/jobs/${encodeURIComponent(applicant.jobId)}/applicants/${encodeURIComponent(applicant.userId)}/schedule-interview`, {
        method: "POST",
        body: JSON.stringify({ date, time, subject: String(form.get("subject") ?? ""), message: String(form.get("message") ?? "") }),
      });
      onQueued();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "The invitation could not be scheduled.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && !sending && onClose()}>
      <form onSubmit={submit} className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-pink-100 text-pink-600"><Video className="size-5" /></span>
            <div><h2 className="font-black text-slate-950">Schedule interview</h2><p className="text-xs text-slate-500">{name} · {jobTitle}</p></div>
          </div>
          <button type="button" disabled={sending} onClick={onClose} aria-label="Close modal" className="grid size-9 place-items-center rounded-xl text-slate-400 hover:bg-white hover:text-slate-700"><X className="size-5" /></button>
        </header>

        <div className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Interview date"><input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} /></Field>
            <Field label="Time"><input required type="time" value={time} onChange={(event) => setTime(event.target.value)} className={inputClass} /></Field>
          </div>
          <Field label="Subject">
            <input name="subject" required defaultValue={`Interview invitation: ${jobTitle}`} className={inputClass} />
          </Field>
          <Field label="Message">
            <textarea
              rows={6}
              name="message"
              required
              defaultValue={`Hi ${name},\n\nWe'd like to invite you to interview for the ${jobTitle} role.\n\nDate: ${date || "TBD"}\nTime: ${time}\n\nWe'll send a video call link along with this invitation.\n\nBest regards`}
              className={`${inputClass} h-auto resize-none py-3 leading-6`}
            />
          </Field>
          <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs font-medium text-sky-800">
            The invitation is delivered by a background job. This closes right away and the
            applicant's row shows the progress - delivery can take up to a minute.
          </p>
          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
        </div>

        <footer className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button type="button" disabled={sending} onClick={onClose} className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={sending} className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-5 text-sm font-black text-white disabled:opacity-60">
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} {sending ? "Scheduling..." : "Confirm and send"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">{label}</span>{children}</label>;
}

const inputClass = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100";
