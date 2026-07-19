import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Award,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Mail,
  MapPin,
  Phone,
  Search,
  Send,
  Sparkles,
  Star,
  Users,
  Video,
  X,
} from "lucide-react";
import { handleInternalLink } from "@/navigation";
import { MarketplaceHeader } from "./MarketplaceHeader";
import { apiFetch } from "../api";

const SELECTED_JOB_TITLE_KEY = "nexora:selected-company-job-title";

type Candidate = {
  id: string;
  name: string;
  initials: string;
  accent: string;
  position: string;
  email: string;
  phone: string;
  location: string;
  experience: number;
  skills: string[];
  interviewDate: string;
  interviewType: "Online" | "Onsite";
  interviewer: string;
  duration: string;
  rating: number;
  scores: {
    technical: number;
    communication: number;
    problemSolving: number;
    confidence: number;
    overall: number;
  };
  summary: string;
};

const CANDIDATES: Candidate[] = [
  {
    id: "candidate-1",
    name: "Sarah Jenkins",
    initials: "SJ",
    accent: "from-pink-500 to-rose-400",
    position: "Senior Frontend Engineer",
    email: "sarah.j@alpha-tech.dev",
    phone: "+1 (555) 234-5678",
    location: "San Francisco, CA",
    experience: 6,
    skills: ["React", "TypeScript", "Tailwind CSS", "Next.js", "Framer Motion"],
    interviewDate: "Jul 15, 2026",
    interviewType: "Online",
    interviewer: "Alex Rivera",
    duration: "60 min",
    rating: 5,
    scores: { technical: 94, communication: 88, problemSolving: 92, confidence: 90, overall: 91 },
    summary: "Excellent React knowledge and a clear approach to browser performance, accessibility, and component architecture.",
  },
  {
    id: "candidate-2",
    name: "David Chen",
    initials: "DC",
    accent: "from-violet-500 to-indigo-400",
    position: "Full Stack Developer",
    email: "d.chen@cloudscale.io",
    phone: "+1 (555) 876-5432",
    location: "Austin, TX · Remote",
    experience: 4,
    skills: ["Node.js", "Python", "PostgreSQL", "Docker", "AWS"],
    interviewDate: "Jul 19, 2026",
    interviewType: "Online",
    interviewer: "Elena Rostova",
    duration: "45 min",
    rating: 4,
    scores: { technical: 82, communication: 85, problemSolving: 78, confidence: 80, overall: 81 },
    summary: "Strong system-design intuition and database knowledge, with a thoughtful and collaborative communication style.",
  },
  {
    id: "candidate-3",
    name: "Amara Okafor",
    initials: "AO",
    accent: "from-cyan-500 to-blue-500",
    position: "Lead AI Engineer",
    email: "amara.okafor@neuralmind.ai",
    phone: "+1 (555) 345-6789",
    location: "New York, NY",
    experience: 8,
    skills: ["PyTorch", "Transformers", "LLMs", "MLOps", "Python"],
    interviewDate: "Jul 16, 2026",
    interviewType: "Onsite",
    interviewer: "Dr. Aris Thorne",
    duration: "90 min",
    rating: 5,
    scores: { technical: 98, communication: 90, problemSolving: 96, confidence: 95, overall: 95 },
    summary: "Outstanding depth in model delivery and distributed inference, paired with precise technical explanations.",
  },
  {
    id: "candidate-4",
    name: "Marcus Vance",
    initials: "MV",
    accent: "from-amber-500 to-orange-400",
    position: "UI/UX Product Designer",
    email: "marcus.v@designcraft.co",
    phone: "+1 (555) 456-7890",
    location: "Los Angeles, CA",
    experience: 3,
    skills: ["Figma", "Design Systems", "Prototyping", "User Research"],
    interviewDate: "Jul 14, 2026",
    interviewType: "Online",
    interviewer: "Chloe Vance",
    duration: "45 min",
    rating: 3,
    scores: { technical: 68, communication: 75, problemSolving: 65, confidence: 70, overall: 70 },
    summary: "A polished visual portfolio with opportunities to strengthen cross-platform constraints and system-level reasoning.",
  },
];

export function rememberSelectedCompanyJob(title: string) {
  sessionStorage.setItem(SELECTED_JOB_TITLE_KEY, title);
}

export function InterviewerList({ email }: { email: string }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"score" | "name" | "experience">("score");
  const [page, setPage] = useState(1);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [date, setDate] = useState("2026-07-22");
  const [time, setTime] = useState("14:00");
  const [platform, setPlatform] = useState("Zego Cloud");
  const [jobTitle] = useState(() => sessionStorage.getItem(SELECTED_JOB_TITLE_KEY) ?? "Selected role");
  const pageSize = 2;

  const candidates = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = CANDIDATES.filter((candidate) =>
      !query ||
      candidate.name.toLowerCase().includes(query) ||
      candidate.position.toLowerCase().includes(query) ||
      candidate.skills.some((skill) => skill.toLowerCase().includes(query)),
    );
    return result.sort((left, right) => {
      if (sortBy === "name") return left.name.localeCompare(right.name);
      if (sortBy === "experience") return right.experience - left.experience;
      return right.scores.overall - left.scores.overall;
    });
  }, [search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(candidates.length / pageSize));
  const visibleCandidates = candidates.slice((page - 1) * pageSize, page * pageSize);
  const averageScore = Math.round(CANDIDATES.reduce((total, candidate) => total + candidate.scores.overall, 0) / CANDIDATES.length);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  }

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  async function sendInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCandidate) return;
    setSending(true);
    try {
      const form = new FormData(event.currentTarget);
      await apiFetch<{ recipient: string }>("/api/interviews/schedule", {
        method: "POST",
        body: JSON.stringify({ candidateName: selectedCandidate.name, jobTitle, date, time, platform, subject: String(form.get("subject") ?? ""), message: String(form.get("message") ?? "") }),
      });
      setSelectedCandidate(null);
      notify("Interview invitation sent to thutanyan788@gmail.com");
    } catch (error) {
      notify(error instanceof Error ? error.message : "The invitation could not be sent.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <MarketplaceHeader email={email} role="company" />

      {toast && (
        <div role="status" className="fixed right-5 top-20 z-[60] flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-xl">
          <CheckCircle2 className="size-4 text-emerald-400" /> {toast}
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8">
        <a href="/company/jobs" onClick={handleInternalLink} className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-pink-600">
          <ArrowLeft className="size-4" /> Back to job posts
        </a>

        <div className="mt-6 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-pink-600">Candidate workspace</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Interview results</h1>
            <p className="mt-2 text-sm text-slate-500">Reviewing candidates for <span className="font-bold text-slate-700">{jobTitle}</span></p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[430px]">
            <SummaryMetric label="Candidates" value={String(CANDIDATES.length)} icon={<Users className="size-4" />} />
            <SummaryMetric label="Average score" value={`${averageScore}%`} icon={<Sparkles className="size-4" />} />
            <SummaryMetric label="Top candidate" value="95%" icon={<Award className="size-4" />} />
          </div>
        </div>

        <section className="mt-8 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Search candidates</span>
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => updateSearch(event.target.value)}
              placeholder="Search by candidate, role, or skill"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-pink-400 focus:bg-white focus:ring-4 focus:ring-pink-100"
            />
          </label>
          <label>
            <span className="sr-only">Sort candidates</span>
            <select
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value as typeof sortBy);
                setPage(1);
              }}
              className="h-11 min-w-48 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-pink-400"
            >
              <option value="score">Highest AI score</option>
              <option value="experience">Most experience</option>
              <option value="name">Candidate name</option>
            </select>
          </label>
        </section>

        <div className="mt-6 space-y-5">
          {visibleCandidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              onDownload={() => notify(`${candidate.name}'s demo résumé is ready`)}
              onSchedule={() => setSelectedCandidate(candidate)}
            />
          ))}
        </div>

        {visibleCandidates.length === 0 && (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
            <Users className="mx-auto size-10 text-slate-300" />
            <h2 className="mt-4 text-lg font-bold text-slate-950">No matching candidates</h2>
            <p className="mt-1 text-sm text-slate-500">Try another name, role, or skill.</p>
          </div>
        )}

        {candidates.length > pageSize && (
          <div className="mt-7 flex items-center justify-between border-t border-slate-200 pt-5">
            <p className="text-sm text-slate-500">Page <span className="font-bold text-slate-800">{page}</span> of {totalPages}</p>
            <div className="flex gap-2">
              <button type="button" aria-label="Previous page" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                <ChevronLeft className="size-4" />
              </button>
              <button type="button" aria-label="Next page" disabled={page === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {selectedCandidate && (
        <ScheduleModal
          candidate={selectedCandidate}
          jobTitle={jobTitle}
          date={date}
          time={time}
          platform={platform}
          sending={sending}
          onDateChange={setDate}
          onTimeChange={setTime}
          onPlatformChange={setPlatform}
          onClose={() => !sending && setSelectedCandidate(null)}
          onSubmit={sendInvitation}
        />
      )}
    </div>
  );
}

function SummaryMetric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-1.5 text-pink-600">{icon}<span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span></div>
      <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function CandidateCard({ candidate, onDownload, onSchedule }: { candidate: Candidate; onDownload: () => void; onSchedule: () => void }) {
  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="grid lg:grid-cols-12">
        <div className="border-b border-slate-100 p-6 lg:col-span-5 lg:border-b-0 lg:border-r lg:p-7">
          <div className="flex items-start gap-4">
            <div className={`grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${candidate.accent} text-lg font-black text-white shadow-md`}>{candidate.initials}</div>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-black text-slate-950">{candidate.name}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-pink-600"><BriefcaseBusiness className="size-3.5" /> {candidate.position}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-500"><MapPin className="size-3.5" /> {candidate.location}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-2 text-sm text-slate-600">
            <span className="flex items-center gap-2.5"><Mail className="size-4 text-slate-400" /> {candidate.email}</span>
            <span className="flex items-center gap-2.5"><Phone className="size-4 text-slate-400" /> {candidate.phone}</span>
            <span className="flex items-center gap-2.5"><Award className="size-4 text-slate-400" /> {candidate.experience} years relevant experience</span>
          </div>

          <div className="mt-5 flex flex-wrap gap-1.5">
            {candidate.skills.map((skill) => <span key={skill} className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">{skill}</span>)}
          </div>

          <button type="button" onClick={onDownload} className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600 hover:bg-slate-50">
            <Download className="size-3.5" /> Résumé PDF
          </button>
        </div>

        <div className="p-6 lg:col-span-7 lg:p-7">
          <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1.5"><CalendarDays className="size-3.5" /> {candidate.interviewDate}</span>
            <span className="flex items-center gap-1.5"><Clock3 className="size-3.5" /> {candidate.duration} · {candidate.interviewType}</span>
            <span>Interviewer: {candidate.interviewer}</span>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_170px]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">AI assessment breakdown</p>
              <div className="mt-3 grid gap-3">
                <ScoreBar label="Technical" score={candidate.scores.technical} />
                <ScoreBar label="Communication" score={candidate.scores.communication} />
                <ScoreBar label="Problem solving" score={candidate.scores.problemSolving} />
                <ScoreBar label="Confidence" score={candidate.scores.confidence} />
              </div>
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-pink-100 bg-pink-50/60 p-4">
              <div className="grid size-24 place-items-center rounded-full border-8 border-white bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-100">
                <div className="text-center"><span className="text-2xl font-black">{candidate.scores.overall}</span><span className="block text-[9px] font-bold uppercase tracking-wider">overall</span></div>
              </div>
              <div className="mt-3 flex gap-0.5">
                {Array.from({ length: 5 }, (_, index) => <Star key={index} className={`size-3.5 ${index < candidate.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />)}
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-pink-600"><Sparkles className="size-3.5" /> AI summary</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{candidate.summary}</p>
          </div>

          <div className="mt-5 flex justify-end">
            <button type="button" onClick={onSchedule} className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 text-xs font-black text-white shadow-md shadow-pink-100 hover:from-pink-600 hover:to-rose-600">
              <Mail className="size-3.5" /> Schedule next round
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-bold text-slate-600"><span>{label}</span><span>{score}%</span></div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-400" style={{ width: `${score}%` }} /></div>
    </div>
  );
}

function ScheduleModal({
  candidate,
  jobTitle,
  date,
  time,
  platform,
  sending,
  onDateChange,
  onTimeChange,
  onPlatformChange,
  onClose,
  onSubmit,
}: {
  candidate: Candidate;
  jobTitle: string;
  date: string;
  time: string;
  platform: string;
  sending: boolean;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onPlatformChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form onSubmit={onSubmit} className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-pink-100 text-pink-600"><Video className="size-5" /></span>
            <div><h2 className="font-black text-slate-950">Schedule next round</h2><p className="text-xs text-slate-500">{candidate.name} · {jobTitle}</p></div>
          </div>
          <button type="button" disabled={sending} onClick={onClose} aria-label="Close modal" className="grid size-9 place-items-center rounded-xl text-slate-400 hover:bg-white hover:text-slate-700"><X className="size-5" /></button>
        </header>

        <div className="space-y-6 p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <ModalField label="Interview date"><input required type="date" value={date} onChange={(event) => onDateChange(event.target.value)} className={modalInputClass} /></ModalField>
            <ModalField label="Time"><input required type="time" value={time} onChange={(event) => onTimeChange(event.target.value)} className={modalInputClass} /></ModalField>
            <ModalField label="Platform"><select value={platform} onChange={(event) => onPlatformChange(event.target.value)} className={modalInputClass}><option>Zego Cloud</option><option>Google Meet</option><option>Zoom</option><option>Microsoft Teams</option><option>Onsite</option></select></ModalField>
          </div>

          <ModalField label="Subject">
            <input name="subject" required defaultValue={`Interview invitation: ${jobTitle}`} className={modalInputClass} />
          </ModalField>
          <ModalField label="Message">
            <textarea
              rows={7}
              name="message"
              required
              defaultValue={`Hi ${candidate.name},\n\nThank you for completing your AI assessment. We would like to invite you to the next interview round for our ${jobTitle} position.\n\nDate: ${date}\nTime: ${time}\nPlatform: ${platform}\n\nBest regards,\nNEXORA Recruitment Team`}
              className={`${modalInputClass} h-auto resize-none py-3 leading-6`}
            />
          </ModalField>
        </div>

        <footer className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button type="button" disabled={sending} onClick={onClose} className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={sending} className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-5 text-sm font-black text-white disabled:opacity-60">
            <Send className="size-4" /> {sending ? "Sending..." : "Confirm and send"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">{label}</span>{children}</label>;
}

const modalInputClass = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100";
