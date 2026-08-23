import { useEffect, useState } from "react";
import { EventType, type AgentEvent, type ClientMessage, type JobMatch } from "@shared/events";
import {
  ChatContainerContent,
  ChatContainerRoot,
} from "@/components/ui/chat-container";
import { Markdown } from "@/components/ui/markdown";
import { Tool, type ToolPart } from "@/components/ui/tool";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtItem,
  ChainOfThoughtStep,
  ChainOfThoughtTrigger,
} from "@/components/ui/chain-of-thought";
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input";
import { Button } from "@/components/ui/button";
import {
  ArrowUp,
  Circle,
  CircleCheck,
  CircleX,
  Eraser,
  Loader2,
  Network,
  Paperclip,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadCv } from "@/api";
import { AUTH_BASE_URL } from "@/auth-client";

// The left pane is a PROJECTION of the harness event stream. It never talks to
// the model — it renders whatever events have arrived so far.
type SubagentState = "pending" | "started" | "completed" | "failed";
type Subagent = {
  stepId: string;
  agent: string;
  objective: string;
  state: SubagentState;
  findings: string;
};

type Turn =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; text: string }
  | { id: string; role: "tool"; part: ToolPart }
  | { id: string; role: "handoff"; from: string; to: string; reason: string }
  | { id: string; role: "supervision"; subagents: Subagent[] }
  | { id: string; role: "jobMatches"; jobs: JobMatch[] }
  | { id: string; role: "cvExtracted"; profile: Record<string, unknown>; warnings: string[]; missingFields: string[] }
  | { id: string; role: "cvPreview"; preview: Record<string, unknown> | null; missingFields: string[] }
  | { id: string; role: "cvGenerated"; fileName: string; downloadUrl: string }
  | { id: string; role: "approval"; state: "pending" | "approved" | "rejected" }
  | { id: string; role: "log"; level: string; text: string };

function toTranscript(events: AgentEvent[]): { turns: Turn[]; running: boolean } {
  const turns: Turn[] = [];
  let assistant: Extract<Turn, { role: "assistant" }> | null = null;
  let supervision: Extract<Turn, { role: "supervision" }> | null = null;
  const toolsById = new Map<string, Extract<Turn, { role: "tool" }>>();
  const approvalsById = new Map<string, Extract<Turn, { role: "approval" }>>();
  let open = 0;

  const sub = (stepId: string) => supervision?.subagents.find((s) => s.stepId === stepId);

  for (const ev of events) {
    switch (ev.type) {
      case EventType.WorkflowStarted:
        open++;
        assistant = null;
        turns.push({ id: ev.id, role: "user", text: ev.input });
        break;
      case EventType.WorkflowCompleted:
      case EventType.WorkflowFailed:
        open = Math.max(0, open - 1);
        assistant = null;
        break;
      case EventType.ModelDelta:
        if (!assistant) {
          assistant = { id: ev.id, role: "assistant", text: "" };
          turns.push(assistant);
        }
        assistant.text += ev.text;
        break;
      case EventType.ModelCompleted:
        if (assistant) assistant.text = ev.text;
        else turns.push({ id: ev.id, role: "assistant", text: ev.text });
        assistant = null;
        break;
      case EventType.ToolRequested: {
        const turn: Extract<Turn, { role: "tool" }> = {
          id: ev.id,
          role: "tool",
          part: {
            type: ev.name,
            state: "input-available",
            input: ev.args as Record<string, unknown>,
            toolCallId: ev.toolCallId,
          },
        };
        toolsById.set(ev.toolCallId, turn);
        turns.push(turn);
        assistant = null;
        break;
      }
      case EventType.ToolCompleted: {
        const turn = toolsById.get(ev.toolCallId);
        if (turn) {
          turn.part = {
            ...turn.part,
            state: "output-available",
            output: ev.result as Record<string, unknown>,
          };
        }
        break;
      }
      case EventType.ToolFailed: {
        const turn = toolsById.get(ev.toolCallId);
        if (turn) turn.part = { ...turn.part, state: "output-error", errorText: ev.error };
        break;
      }
      case EventType.JobMatches:
        assistant = null;
        turns.push({ id: ev.id, role: "jobMatches", jobs: ev.jobs });
        break;
      case EventType.CvExtracted:
        assistant = null;
        turns.push({
          id: ev.id,
          role: "cvExtracted",
          profile: (
            ev.profile && typeof ev.profile === "object" ? ev.profile : {}
          ) as Record<string, unknown>,
          warnings: ev.warnings,
          missingFields: ev.missingFields,
        });
        break;
      case EventType.CvPreviewReady:
        assistant = null;
        turns.push({
          id: ev.id,
          role: "cvPreview",
          preview: ev.preview as Record<string, unknown> | null,
          missingFields: ev.missingFields,
        });
        break;
      case EventType.CvGenerated:
        assistant = null;
        turns.push({
          id: ev.id,
          role: "cvGenerated",
          fileName: ev.fileName,
          downloadUrl: ev.downloadUrl,
        });
        break;
      case EventType.AgentHandoff:
        assistant = null;
        turns.push({ id: ev.id, role: "handoff", from: ev.from, to: ev.to, reason: ev.reason });
        break;
      case EventType.PlanCreated:
        assistant = null;
        supervision = {
          id: ev.id,
          role: "supervision",
          subagents: ev.steps.map((s) => ({
            stepId: s.id,
            agent: s.agent,
            objective: s.objective,
            state: "pending",
            findings: "",
          })),
        };
        turns.push(supervision);
        break;
      case EventType.SubagentStarted: {
        const s = sub(ev.stepId);
        if (s) s.state = "started";
        break;
      }
      case EventType.SubagentCompleted: {
        const s = sub(ev.stepId);
        if (s) {
          s.state = "completed";
          s.findings = ev.findings;
        }
        break;
      }
      case EventType.SubagentFailed: {
        const s = sub(ev.stepId);
        if (s) {
          s.state = "failed";
          s.findings = ev.error;
        }
        break;
      }
      case EventType.ApprovalRequested: {
        assistant = null;
        const turn: Extract<Turn, { role: "approval" }> = {
          id: ev.id,
          role: "approval",
          state: "pending",
        };
        approvalsById.set(ev.toolCallId, turn);
        turns.push(turn);
        break;
      }
      case EventType.ApprovalResolved: {
        const turn = approvalsById.get(ev.toolCallId);
        if (turn) turn.state = ev.approved ? "approved" : "rejected";
        break;
      }
      case EventType.Log:
        turns.push({ id: ev.id, role: "log", level: ev.level, text: ev.message });
        break;
    }
  }

  return { turns, running: open > 0 };
}

export function TaskPane({
  events,
  connected,
  error,
  send,
  onJobSelect,
}: {
  events: AgentEvent[];
  connected: boolean;
  error: string | null;
  send: (message: ClientMessage) => boolean;
  onJobSelect: (job: JobMatch) => void;
}) {
  const [input, setInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const { turns, running } = toTranscript(events);

  // The server echoes the message back as WorkflowStarted, but that event is
  // written to Postgres before it is broadcast. Rather than stare at nothing
  // for that round trip, show the message locally until the real one lands.
  const echoed = pending !== null
    && events.some((event) => event.type === EventType.WorkflowStarted && event.input === pending);
  useEffect(() => {
    if (echoed) setPending(null);
  }, [echoed]);
  const awaitingEcho = pending !== null && !echoed;

  async function submit() {
    const text = input.trim();
    if (!text && !selectedFile) return;
    let attachment: { id: string; kind: "cv_pdf"; name: string } | undefined;
    if (selectedFile) {
      setUploading(true);
      setUploadError(null);
      try {
        const upload = await uploadCv(selectedFile);
        attachment = { id: upload.id, kind: "cv_pdf", name: upload.fileName };
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : "Unable to upload the PDF.");
        setUploading(false);
        return;
      }
      setUploading(false);
    }
    const submitted = text || "Please review my uploaded CV and recommend suitable jobs.";
    const sent = send({
      type: "submit_task",
      input: submitted,
      attachments: attachment ? [attachment] : undefined,
    });
    if (sent) {
      setPending(submitted);
      setInput("");
      setSelectedFile(null);
    }
  }

  async function clearMemory() {
    // The route is wired up in the memory lesson; degrade gracefully before then.
    await fetch(`http://${location.hostname}:8787/api/clear`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
    location.reload(); // simplest reset: reconnect and replay the now-empty log
  }

  return (
    <section className="flex h-full min-h-0 flex-col border-r">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <h2 className="text-sm font-medium">Job assistant</h2>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground h-7 gap-1.5 text-xs"
          onClick={clearMemory}
        >
          <Eraser className="size-3.5" /> Clear
        </Button>
      </div>

      <ChatContainerRoot className="min-h-0 flex-1">
        <ChatContainerContent className="space-y-5 px-4 py-5">
          {turns.length === 0 && (
            <p className="text-muted-foreground text-sm">
              Ask me to generate a CV from your skills, or attach a PDF CV to find matching jobs.
            </p>
          )}
          {turns.map((turn) => (
            <TurnView key={turn.id} turn={turn} onJobSelect={onJobSelect} />
          ))}
          {awaitingEcho && pending && (
            <TurnView turn={{ id: "pending", role: "user", text: pending }} onJobSelect={onJobSelect} />
          )}
          {(running || awaitingEcho) && <ThinkingIndicator />}
        </ChatContainerContent>
      </ChatContainerRoot>

      <div className="border-t p-3">
        <PromptInput value={input} onValueChange={setInput} onSubmit={() => void submit()} isLoading={running || uploading || awaitingEcho}>
          <PromptInputTextarea
            className="dark:bg-transparent"
            placeholder="For example: Generate a CV based on my React and TypeScript skills."
          />
          <PromptInputActions className="flex items-center justify-between pt-2">
            <div className="flex min-w-0 items-center gap-2">
              <label className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1 text-xs">
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="sr-only"
                  disabled={running || uploading}
                  onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                />
                <Paperclip className="size-3.5" aria-hidden="true" /> Attach PDF
              </label>
              {selectedFile && (
                <span className="text-muted-foreground max-w-36 truncate text-xs" title={selectedFile.name}>
                  {selectedFile.name}
                </span>
              )}
              {uploadError && <span className="text-destructive max-w-48 truncate text-xs">{uploadError}</span>}
              {(!connected || error) && (
                <span className="text-destructive truncate text-xs">
                  {error ?? "Harness server disconnected."}
                </span>
              )}
            </div>
            <PromptInputAction tooltip="Run">
              <Button
                size="icon"
                className="size-8 rounded-full"
                onClick={() => void submit()}
                disabled={(!input.trim() && !selectedFile) || !connected || uploading}
              >
                <ArrowUp className="size-4" />
              </Button>
            </PromptInputAction>
          </PromptInputActions>
        </PromptInput>
      </div>
    </section>
  );
}

const PROSE = "prose prose-sm dark:prose-invert max-w-none";

// Shown while the model is working: a pulsing sparkle, a shimmering label and
// three dots that rise in sequence. Purely a projection of `running` — no state.
function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-2.5 px-1">
      <span className="relative flex size-6 items-center justify-center">
        <span className="bg-primary/30 absolute inset-0 rounded-full animate-[thinking-halo_1.8s_ease-out_infinite]" />
        <span className="bg-primary/10 text-primary relative flex size-6 items-center justify-center rounded-full">
          <Sparkles className="size-3.5 animate-pulse" />
        </span>
      </span>
      <span className="thinking-shimmer text-sm font-medium">TalentAI is thinking</span>
      <span className="flex items-end gap-1 pb-0.5">
        <span className="bg-primary/70 size-1 rounded-full animate-[thinking-dot_1.4s_ease-in-out_infinite]" />
        <span className="bg-primary/70 size-1 rounded-full animate-[thinking-dot_1.4s_ease-in-out_0.2s_infinite]" />
        <span className="bg-primary/70 size-1 rounded-full animate-[thinking-dot_1.4s_ease-in-out_0.4s_infinite]" />
      </span>
    </div>
  );
}

function ApprovalCard({ turn }: { turn: Extract<Turn, { role: "approval" }> }) {
  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
      <div className="mb-1.5 flex items-center gap-2 text-sm font-medium">
        <ShieldAlert className="size-4 text-amber-500" /> Application review requested
      </div>
      <p className="text-muted-foreground text-sm">
        {turn.state === "pending"
          ? "Review and decide from the selected job in the details pane."
          : turn.state === "approved"
            ? "Application approved."
            : "Application cancelled."}
      </p>
    </div>
  );
}

function subagentIcon(state: SubagentState) {
  switch (state) {
    case "pending":
      return <Circle className="text-muted-foreground/40 size-4" />;
    case "started":
      return <Loader2 className="size-4 animate-spin text-sky-500" />;
    case "completed":
      return <CircleCheck className="size-4 text-emerald-500" />;
    case "failed":
      return <CircleX className="text-destructive size-4" />;
  }
}

const SUBAGENT_LABEL: Record<SubagentState, string> = {
  pending: "queued",
  started: "investigating…",
  completed: "done",
  failed: "failed",
};

function TurnView({ turn, onJobSelect }: { turn: Turn; onJobSelect: (job: JobMatch) => void }) {
  switch (turn.role) {
    case "user":
      return (
        <div className="flex justify-end">
          <div className="bg-primary text-primary-foreground max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap">
            {turn.text}
          </div>
        </div>
      );
    case "assistant":
      return <Markdown className={PROSE}>{turn.text}</Markdown>;
    case "tool":
      return <Tool toolPart={turn.part} />;
    case "jobMatches":
      return <JobMatchCards jobs={turn.jobs} onJobSelect={onJobSelect} />;
    case "cvExtracted":
      return <CvExtractedCard turn={turn} />;
    case "cvPreview":
      return <CvPreviewCard turn={turn} />;
    case "cvGenerated":
      return (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
          <p className="font-medium">Your CV is ready.</p>
          <a
            className="text-primary mt-1 inline-block underline"
            href={`${AUTH_BASE_URL}${turn.downloadUrl}`}
            download={turn.fileName}
          >
            Download {turn.fileName}
          </a>
        </div>
      );
    case "supervision":
      return (
        <div className="space-y-2">
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
            <Network className="size-3.5" /> Supervisor · {turn.subagents.length} investigators
          </div>
          <ChainOfThought>
            {turn.subagents.map((s) => (
              <ChainOfThoughtStep key={s.stepId} defaultOpen>
                <ChainOfThoughtTrigger leftIcon={subagentIcon(s.state)}>
                  <span className="font-medium capitalize">{s.agent}</span>
                  <span className="text-muted-foreground"> · {SUBAGENT_LABEL[s.state]}</span>
                </ChainOfThoughtTrigger>
                <ChainOfThoughtContent>
                  <ChainOfThoughtItem className="italic">{s.objective}</ChainOfThoughtItem>
                  {s.state === "completed" && s.findings && (
                    <ChainOfThoughtItem className="text-foreground">
                      <Markdown className={PROSE}>{s.findings}</Markdown>
                    </ChainOfThoughtItem>
                  )}
                  {s.state === "failed" && (
                    <ChainOfThoughtItem className="text-destructive">{s.findings}</ChainOfThoughtItem>
                  )}
                </ChainOfThoughtContent>
              </ChainOfThoughtStep>
            ))}
          </ChainOfThought>
        </div>
      );
    case "approval":
      return <ApprovalCard turn={turn} />;
    case "handoff":
      return (
        <div className="text-muted-foreground flex items-center gap-2 py-1 text-xs">
          <div className="bg-border h-px flex-1" />
          <span className="shrink-0">
            ↪ handed off <span className="font-medium">{turn.from}</span> →{" "}
            <span className="text-foreground font-medium">{turn.to}</span>
          </span>
          <div className="bg-border h-px flex-1" />
        </div>
      );
    case "log":
      return (
        <p
          className={cn(
            "px-1 text-xs",
            turn.level === "error"
              ? "text-destructive"
              : turn.level === "warn"
                ? "text-amber-600"
                : "text-muted-foreground",
          )}
        >
          {turn.text}
        </p>
      );
  }
}

function CvExtractedCard({ turn }: { turn: Extract<Turn, { role: "cvExtracted" }> }) {
  const profile = turn.profile;
  const fields = ([
    ["Name", profile.fullName],
    ["Target role", profile.targetRole],
    ["Email", profile.email],
    ["Phone", profile.phone],
    ["Skills", Array.isArray(profile.skills) ? profile.skills.join(", ") : null],
    ["Experience", profile.experienceYears == null ? null : `${profile.experienceYears} years`],
  ] as [string, unknown][]).filter(([, value]) => Boolean(value)) as [string, string | null | undefined][];
  return (
    <div className="rounded-lg border bg-card p-3 text-sm">
      <p className="font-medium">CV information extracted</p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        {fields.map(([label, value]) => <><dt key={`${label}-label`} className="text-muted-foreground">{label}</dt><dd key={`${label}-value`} className="min-w-0">{String(value)}</dd></>)}
      </dl>
      {turn.missingFields.length > 0 && (
        <p className="text-muted-foreground mt-2 text-xs">Missing: {turn.missingFields.join(", ")}.</p>
      )}
      {turn.warnings.map((warning) => <p key={warning} className="mt-2 text-xs text-amber-600">{warning}</p>)}
      <p className="text-muted-foreground mt-2 text-xs">Reply with corrections or “confirm” to continue.</p>
    </div>
  );
}

function CvPreviewCard({ turn }: { turn: Extract<Turn, { role: "cvPreview" }> }) {
  if (!turn.preview) {
    return <p className="text-muted-foreground text-sm">Before I create the CV, I still need: {turn.missingFields.join(", ")}.</p>;
  }
  const preview = turn.preview;
  return (
    <div className="rounded-lg border bg-card p-3 text-sm">
      <p className="font-medium">{String(preview.fullName ?? "Candidate")} - CV preview</p>
      <p className="text-muted-foreground mt-1 text-xs">{String(preview.targetRole ?? "")}</p>
      {preview.summary != null && <p className="mt-2 text-xs">{String(preview.summary)}</p>}
      {Array.isArray(preview.skills) && preview.skills.length > 0 && (
        <p className="mt-2 text-xs"><span className="font-medium">Skills:</span> {(preview.skills as string[]).join(", ")}</p>
      )}
      {Array.isArray(preview.workExperience) && preview.workExperience.length > 0 && (
        <p className="mt-1 text-xs"><span className="font-medium">Experience:</span> {preview.workExperience.length} role(s)</p>
      )}
      {Array.isArray(preview.projects) && preview.projects.length > 0 && (
        <p className="mt-1 text-xs"><span className="font-medium">Projects:</span> {preview.projects.length}</p>
      )}
      <p className="text-muted-foreground mt-2 text-xs">Reply “approve” to generate the PDF, or tell me what to change.</p>
    </div>
  );
}

function JobMatchCards({
  jobs,
  onJobSelect,
}: {
  jobs: JobMatch[];
  onJobSelect: (job: JobMatch) => void;
}) {
  if (jobs.length === 0) {
    return <p className="text-muted-foreground text-sm">No matching jobs found in the demo catalog.</p>;
  }

  return (
    <div className="space-y-2">
      {jobs.map((job) => (
        <button
          key={job.id}
          type="button"
          className="hover:bg-muted/50 focus-visible:ring-ring w-full rounded-lg border bg-card p-3 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2"
          onClick={() => onJobSelect(job)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-medium">{job.title}</h3>
              <p className="text-muted-foreground text-xs">
                {job.company.name} · {job.location.workType} · {job.yearsOfExperience.min}+ years
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              {job.score}% match
            </span>
          </div>
          <p className="text-muted-foreground mt-2 text-xs">{job.description}</p>
          <p className="mt-2 text-xs">{job.reason}</p>
          {Array.isArray(job.gaps) && job.gaps.length > 0 && (
            <p className="text-muted-foreground mt-1 text-xs">Gaps: {job.gaps.join(" · ")}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1">
            {job.matchedSkills.map((skill) => (
              <span key={skill} className="rounded bg-muted px-1.5 py-0.5 text-xs">
                {skill}
              </span>
            ))}
          </div>
        </button>
      ))}
    </div>
  );
}
