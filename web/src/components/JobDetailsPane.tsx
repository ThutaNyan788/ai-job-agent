import { BriefcaseBusiness, CheckCircle2, Clock3, MapPin, Send } from "lucide-react";
import type { ApplicationStatusEvent, JobMatch } from "@shared/events";
import { Button } from "@/components/ui/button";

export function JobDetailsPane({
  job,
  application,
  onRequestApplication,
  onDecideApplication,
}: {
  job: JobMatch | null;
  application: ApplicationStatusEvent | null;
  onRequestApplication: (job: JobMatch) => void;
  onDecideApplication: (workflowId: string, approved: boolean) => void;
}) {

  if (!job) {
    return (
      <aside className="flex min-h-0 flex-col">
        <header className="border-b px-4 py-3">
          <h2 className="text-sm font-medium">Job details</h2>
        </header>
        <div className="text-muted-foreground flex flex-1 items-center justify-center px-6 text-center text-sm">
          Select a job match to view the full listing.
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex min-h-0 flex-col">
      <header className="border-b px-4 py-3">
        <h2 className="text-sm font-medium">Job details</h2>
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">{job.title}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{job.company.name}</p>
          </div>
          <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            {job.score}% match
          </span>
        </div>

        <dl className="mt-6 grid gap-3 text-sm">
          <div className="flex items-center gap-2">
            <BriefcaseBusiness className="text-muted-foreground size-4" />
            <dt className="sr-only">Company</dt>
            <dd>
              <a className="text-primary underline-offset-4 hover:underline" href={job.company.website} target="_blank" rel="noreferrer">
                {job.company.name}
              </a>
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="text-muted-foreground size-4" />
            <dt className="sr-only">Work style</dt>
            <dd>{job.location.workType}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Clock3 className="text-muted-foreground size-4" />
            <dt className="sr-only">Experience</dt>
            <dd>{job.yearsOfExperience.min}+ years of experience</dd>
          </div>
        </dl>

        <section className="mt-7">
          <h3 className="text-sm font-medium">About the role</h3>
          <p className="text-muted-foreground mt-2 text-sm leading-6">{job.description}</p>
        </section>

        <section className="mt-7">
          <h3 className="text-sm font-medium">Why it matches</h3>
          <div className="mt-2 flex items-start gap-2 text-sm">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <p className="text-muted-foreground leading-6">{job.reason}</p>
          </div>
        </section>

        <SkillSection
          title="Required skills"
          skills={job.requiredSkills.map((skill) => skill.name)}
          matchedSkills={job.matchedSkills}
        />
        <SkillSection title="Nice to have" skills={job.niceToHave} matchedSkills={job.matchedSkills} />

        <ApplicationAction
          job={job}
          application={application}
          onRequestApplication={onRequestApplication}
          onDecideApplication={onDecideApplication}
        />
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
  onRequestApplication: (job: JobMatch) => void;
  onDecideApplication: (workflowId: string, approved: boolean) => void;
}) {
  if (!application) {
    return (
      <Button className="mt-8 w-full gap-2" onClick={() => onRequestApplication(job)}>
        <Send className="size-4" /> Review application
      </Button>
    );
  }

  if (application.status === "pending") {
    return (
      <section className="mt-8 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
        <p className="text-sm font-medium">Submit mock application?</p>
        <p className="text-muted-foreground mt-1 text-xs">
          This application is fictional and will be recorded only in this demo.
        </p>
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={() => onDecideApplication(application.workflowId, true)}>
            Approve
          </Button>
          <Button size="sm" variant="outline" onClick={() => onDecideApplication(application.workflowId, false)}>
            Cancel
          </Button>
        </div>
      </section>
    );
  }

  const submitted = application.status === "submitted";
  return (
    <Button className="mt-8 w-full gap-2" disabled variant={submitted ? "default" : "outline"}>
      <CheckCircle2 className="size-4" />
      {submitted ? "Application submitted" : "Application cancelled"}
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
  return (
    <section className="mt-7">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {skills.map((skill) => (
          <span
            key={skill}
            className={
              matches.has(skill)
                ? "rounded bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400"
                : "bg-muted rounded px-2 py-1 text-xs"
            }
          >
            {skill}
          </span>
        ))}
      </div>
    </section>
  );
}
