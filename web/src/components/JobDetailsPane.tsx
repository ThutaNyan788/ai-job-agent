import { useState } from "react";
import {
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Clock3,
  ExternalLink,
  MapPin,
  Send,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import type { ApplicationStatusEvent, JobMatch } from "@shared/events";
import { Button } from "@/components/ui/button";
import { ApplyCvModal } from "./ApplyCvModal";

export function JobDetailsPane({
  job,
  application,
  onRequestApplication,
  onDecideApplication,
}: {
  job: JobMatch | null;
  application: ApplicationStatusEvent | null;
  onRequestApplication: (job: JobMatch, cvUploadId: string) => void;
  onDecideApplication: (workflowId: string, approved: boolean) => void;
}) {
  return (
    <aside className="relative flex h-full min-h-0 flex-col overflow-hidden bg-slate-900/5 p-3 sm:p-4">
      {/* Background SVG Shapes & Mesh Layer */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {/* Soft Pink & Sky Blue Radial Ambient Glows */}
        <div className="absolute -top-20 -right-20 size-80 rounded-full bg-pink-600/15 blur-3xl" />
        <div className="absolute bottom-10 -left-20 size-72 rounded-full bg-sky-400/15 blur-3xl" />

        {/* Abstract Wave & Geometric Decorative Shapes */}
        <svg
          className="absolute top-0 right-0 w-full h-64 opacity-20 text-pink-600 fill-current"
          viewBox="0 0 500 200"
          preserveAspectRatio="none"
        >
          <path d="M0,80 C180,180 320,-20 500,100 L500,0 L0,0 Z" />
        </svg>

        {/* Low-Opacity Pink Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(236,72,153,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(236,72,153,0.08)_1px,transparent_1px)] bg-[size:24px_24px]" />

        {/* Delicate Diagonal Pink Lines */}
        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(236,72,153,0.03)_0,rgba(236,72,153,0.03)_1px,transparent_0,transparent_40px)]" />
      </div>

      {/* Floating Glassmorphic Header */}
      <div className="relative z-10 flex items-center justify-between rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-xl mb-3">
        <div className="flex items-center gap-2">
          <BriefcaseBusiness className="size-4 text-pink-600" />
          <h2 className="text-xs font-black tracking-wider uppercase text-slate-800">Job Overview</h2>
        </div>
      </div>

      {/* Main Glass Content Container */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/90 bg-white/75 shadow-sm backdrop-blur-md">
        {!job ? (
          <div className="my-auto flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
            <div className="mb-3 flex size-14 items-center justify-center rounded-3xl bg-pink-50 border border-pink-200/80 text-pink-600 shadow-2xs">
              <Sparkles className="size-6" />
            </div>
            <h3 className="text-sm font-black text-slate-800">No Job Selected</h3>
            <p className="mt-1 max-w-xs text-xs font-medium text-slate-500 leading-relaxed">
              Select a matched job position from the chat stream to view full responsibilities and submit an application.
            </p>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
            {/* Job Banner Header */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-4.5 shadow-2xs space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-base font-black text-slate-900 tracking-tight leading-snug">{job.title}</h1>
                  <p className="mt-0.5 text-xs font-bold text-slate-500 flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-pink-600" />
                    <span>{job.company.name}</span>
                  </p>
                </div>
                <span className="shrink-0 rounded-2xl bg-pink-600 px-3 py-1 text-xs font-black text-white shadow-xs">
                  {job.score}% match
                </span>
              </div>

              {/* Meta Specs Grid */}
              <div className="grid grid-cols-1 gap-2 pt-2 border-t border-slate-100 text-xs font-semibold text-slate-700">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2 border border-slate-100">
                  <span className="flex items-center gap-2 text-slate-500">
                    <Building2 className="size-3.5 text-pink-600" /> Company Web
                  </span>
                  <a
                    className="inline-flex items-center gap-1 font-bold text-pink-600 hover:underline"
                    href={job.company.website}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>Visit site</span>
                    <ExternalLink className="size-3" />
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2 border border-slate-100">
                    <MapPin className="size-3.5 text-pink-600 shrink-0" />
                    <span className="truncate">{job.location.workType}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2 border border-slate-100">
                    <Clock3 className="size-3.5 text-pink-600 shrink-0" />
                    <span className="truncate">{job.yearsOfExperience.min}+ yrs exp</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Match Reason Highlight */}
            <div className="rounded-3xl border border-pink-200/80 bg-pink-50/60 p-4 shadow-2xs space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-pink-950">
                <CheckCircle2 className="size-4 text-pink-600 shrink-0" />
                <span>Why it matches your profile</span>
              </div>
              <p className="text-xs font-medium text-slate-700 leading-relaxed pl-6">{job.reason}</p>
            </div>

            {/* About Role Section */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">About the role</h3>
              <p className="text-xs font-medium text-slate-600 leading-relaxed">{job.description}</p>
            </div>

            {/* Skill Lists */}
            <div className="space-y-4">
              <SkillSection
                title="Required Skills"
                skills={job.requiredSkills.map((s) => s.name)}
                matchedSkills={job.matchedSkills}
              />
              <SkillSection
                title="Nice to Have"
                skills={job.niceToHave}
                matchedSkills={job.matchedSkills}
              />
            </div>

            {/* Application Action Button/Card */}
            <ApplicationAction
              job={job}
              application={application}
              onRequestApplication={onRequestApplication}
              onDecideApplication={onDecideApplication}
            />
          </div>
        )}
      </div>
    </aside>
  );
}

function ApplicationAction({
  job,
  application,
  onRequestApplication,
  onDecideApplication,
}: {
  job: JobMatch;
  application: ApplicationStatusEvent | null;
  onRequestApplication: (job: JobMatch, cvUploadId: string) => void;
  onDecideApplication: (workflowId: string, approved: boolean) => void;
}) {
  const [showApplyModal, setShowApplyModal] = useState(false);

  if (!application) {
    return (
      <>
        <Button
          className="mt-4 w-full h-11 gap-2 rounded-2xl bg-pink-600 hover:bg-pink-700 text-white font-bold shadow-md shadow-pink-600/25 active:scale-98 transition-all"
          onClick={() => setShowApplyModal(true)}
        >
          <Send className="size-4" /> Apply for Position
        </Button>
        {showApplyModal && (
          <ApplyCvModal
            jobTitle={job.title}
            onClose={() => setShowApplyModal(false)}
            onApply={(cvUploadId) => onRequestApplication(job, cvUploadId)}
          />
        )}
      </>
    );
  }

  if (application.status === "pending") {
    return (
      <section className="mt-4 rounded-3xl border border-amber-200 bg-amber-50/90 p-4 shadow-2xs space-y-2 animate-in fade-in duration-200">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
          <ShieldAlert className="size-4 text-amber-600 shrink-0" />
          <span>Submit mock application?</span>
        </div>
        <p className="text-xs text-amber-800 font-medium leading-relaxed">
          This application is simulated for demo purposes and will record your CV match.
        </p>
        <div className="pt-2 flex gap-2">
          <Button
            size="sm"
            className="rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold px-4 shadow-2xs"
            onClick={() => onDecideApplication(application.workflowId, true)}
          >
            Confirm
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl border-amber-300 text-amber-900 hover:bg-amber-100 font-bold px-4"
            onClick={() => onDecideApplication(application.workflowId, false)}
          >
            Cancel
          </Button>
        </div>
      </section>
    );
  }

  const cancelled = application.status === "cancelled";
  const label =
    application.status === "accepted"
      ? "Application Accepted"
      : cancelled
      ? "Application Cancelled"
      : "Application Submitted";

  return (
    <Button
      className="mt-4 w-full h-11 gap-2 rounded-2xl font-bold disabled:opacity-100 border"
      disabled
      variant={cancelled ? "outline" : "default"}
    >
      <CheckCircle2 className={`size-4 ${cancelled ? "text-slate-400" : "text-emerald-500"}`} />
      <span>{label}</span>
    </Button>
  );
}

function SkillSection({
  title,
  skills,
  matchedSkills,
}: {
  title: string;
  skills: string[];
  matchedSkills: string[];
}) {
  const matches = new Set(matchedSkills);
  if (skills.length === 0) return null;

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-2">
      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">{title}</h3>
      <div className="flex flex-wrap gap-1.5">
        {skills.map((skill) => {
          const isMatched = matches.has(skill);
          return (
            <span
              key={skill}
              className={
                isMatched
                  ? "rounded-xl bg-pink-50 border border-pink-200/80 px-2.5 py-1 text-xs font-bold text-pink-600 shadow-2xs"
                  : "rounded-xl bg-slate-100 border border-slate-200/60 px-2.5 py-1 text-xs font-medium text-slate-600"
              }
            >
              {skill}
            </span>
          );
        })}
      </div>
    </section>
  );
}