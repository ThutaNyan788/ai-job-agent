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
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Circle,
  CircleCheck,
  CircleX,
  Download,
  Eraser,
  FileCheck2,
  FileText,
  Loader2,
  Network,
  Paperclip,
  ShieldAlert,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadCv } from "@/api";
import { AUTH_BASE_URL } from "@/auth-client";
import hero from "@/assets/hero.png";

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

  const echoed =
    pending !== null &&
    events.some((event) => event.type === EventType.WorkflowStarted && event.input === pending);
  useEffect(() => {
    if (echoed) setPending(null);
  }, [echoed]);
  const awaitingEcho = pending !== null && !echoed;

  async function submit(customInput?: string) {
    const text = (customInput ?? input).trim();
    if (!text && !selectedFile) return;
    let attachment: { id: string; kind: "cv_pdf"; name: string } | undefined;
    if (selectedFile) {
      setUploading(true);
      setUploadError(null);
      try {
        const upload = await uploadCv(selectedFile);
        attachment = { id: upload.id, kind: "cv_pdf", name: upload.fileName };
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Unable to upload the PDF.");
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
    await fetch(`http://${location.hostname}:8787/api/clear`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
    location.reload();
  }

  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden bg-slate-900/5 border-r border-slate-200/80 p-3 sm:p-4">
      {/* Dynamic Background SVG Shapes, Lines & Mesh Layer */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {/* Soft Pink & Sky Blue Radial Ambient Glows */}
        <div className="absolute -top-24 -left-20 size-96 rounded-full bg-pink-600/15 blur-3xl" />
        <div className="absolute top-1/2 -right-24 size-80 rounded-full bg-sky-400/15 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 size-96 rounded-full bg-pink-600/10 blur-3xl" />

        {/* Abstract Wave & Geometric Organic Path Shapes */}
        <svg
          className="absolute top-0 right-0 w-full h-80 opacity-25 text-pink-600 fill-current"
          viewBox="0 0 500 250"
          preserveAspectRatio="none"
        >
          <path d="M0,40 C150,160 350,-40 500,80 L500,0 L0,0 Z" />
        </svg>

        <svg
          className="absolute bottom-0 left-0 w-full h-64 opacity-20 text-sky-500 fill-current"
          viewBox="0 0 500 200"
          preserveAspectRatio="none"
        >
          <path d="M0,100 C200,20 300,180 500,60 L500,200 L0,200 Z" />
        </svg>

        {/* Floating Geometric Wireframe Glass Rings */}
        <div className="absolute top-12 left-8 size-24 rounded-full border-2 border-pink-500/20 bg-pink-500/5 backdrop-blur-xs transform -rotate-12 animate-pulse" />
        <div className="absolute bottom-28 right-10 size-32 rounded-3xl border border-sky-400/30 bg-sky-400/5 backdrop-blur-xs transform rotate-45" />

        {/* Low-Opacity Pink Grid Line Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(236,72,153,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(236,72,153,0.08)_1px,transparent_1px)] bg-[size:24px_24px]" />

        {/* Diagonal Subtle Pink Lines */}
        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(236,72,153,0.03)_0,rgba(236,72,153,0.03)_1px,transparent_0,transparent_50px)]" />

        {/* Decorative Delicate Pink Dashed Lines */}
        <svg className="absolute inset-0 h-full w-full opacity-20 stroke-pink-500 pointer-events-none">
          <line x1="0" y1="20%" x2="100%" y2="80%" strokeWidth="1" strokeDasharray="6 6" />
          <line x1="0" y1="70%" x2="100%" y2="30%" strokeWidth="1" strokeDasharray="4 4" />
        </svg>
      </div>

      {/* Floating Glassmorphic Header */}
      <div className="relative z-10 flex items-center justify-between rounded-2xl border border-white/80 bg-white/80 px-4 py-2.5 shadow-sm backdrop-blur-xl mb-3">
        <div className="flex items-center gap-2.5">
          <div>
            <h2 className="text-xs font-black tracking-wider uppercase text-slate-800">Career Assistant</h2>
            <p className="text-[10px] font-bold text-pink-600">AI Resume & Job Matcher</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-3 text-xs font-bold text-slate-600 hover:bg-pink-50 hover:text-pink-600 rounded-xl transition-colors"
          onClick={clearMemory}
        >
          <Eraser className="size-3.5" />
          <span>Reset</span>
        </Button>
      </div>

      {/* Floating Main Glass Container */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/90 bg-white/70 shadow-sm backdrop-blur-md">
        <ChatContainerRoot className="min-h-0 flex-1">
          <ChatContainerContent className="space-y-5 p-4 sm:p-5">
            {turns.length === 0 && (
              <div className="my-auto flex flex-col items-center justify-center text-center px-2 py-8 animate-in fade-in zoom-in-95 duration-400">
                <div className="relative mb-4 flex size-16 items-center justify-center rounded-3xl text-white ">
                  <img src={hero} alt="" />
                </div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">Career Intelligence Hub</h3>
                <p className="mt-1 max-w-xs text-xs text-slate-500 font-medium leading-relaxed">
                  Upload your PDF resume to parse profile data, create custom formatted CVs, or match tech positions.
                </p>

                <div className="mt-6 grid w-full max-w-xs gap-2">
                  {[
                    "Match my skills with active job listings",
                    "Generate a clean Developer CV",
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void submit(prompt)}
                      className="group flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/90 p-3 text-left text-xs font-semibold text-slate-700 shadow-2xs hover:border-pink-300 hover:bg-pink-50/60 hover:text-pink-600 transition-all active:scale-98"
                    >
                      <span>{prompt}</span>
                      <ChevronRight className="size-4 text-slate-400 group-hover:translate-x-1 group-hover:text-pink-600 transition-all shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
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

        {/* Input Floating Dock */}
        <div className="border-t border-slate-100/80 bg-white/90 p-3 backdrop-blur-lg">
          <PromptInput
            value={input}
            onValueChange={setInput}
            onSubmit={() => void submit()}
            isLoading={running || uploading || awaitingEcho}
            className="rounded-2xl border border-slate-200 bg-slate-50/50 shadow-inner focus-within:border-pink-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-pink-600/10 transition-all"
          >
            <PromptInputTextarea
              className="bg-transparent text-sm placeholder:text-slate-400 focus:outline-none min-h-[40px]"
              placeholder="Ask AI to match jobs or structure your CV..."
            />
            <PromptInputActions className="flex items-center justify-between pt-2 border-t border-slate-100 mt-1">
              <div className="flex min-w-0 items-center gap-2">
                <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs hover:border-pink-200 hover:bg-pink-50 hover:text-pink-600 transition-all">
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    className="sr-only"
                    disabled={running || uploading}
                    onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                  />
                  <Paperclip className="size-3.5 text-pink-600" aria-hidden="true" />
                  <span>Attach PDF</span>
                </label>

                {selectedFile && (
                  <span className="flex items-center gap-1 rounded-xl bg-pink-50 border border-pink-200/80 px-2.5 py-0.5 text-xs font-bold text-pink-600 max-w-36 truncate">
                    <FileText className="size-3.5 text-pink-600 shrink-0" />
                    <span className="truncate">{selectedFile.name}</span>
                  </span>
                )}

                {uploadError && <span className="text-red-500 max-w-44 truncate text-xs font-medium">{uploadError}</span>}
                {(!connected || error) && (
                  <span className="text-red-500 truncate text-xs font-medium">
                    {error ?? "Harness server disconnected."}
                  </span>
                )}
              </div>

              <PromptInputAction tooltip="Send prompt">
                <Button
                  size="icon"
                  className="size-8 rounded-xl bg-pink-600 hover:bg-pink-700 text-white shadow-md shadow-pink-600/30 active:scale-95 transition-all disabled:opacity-40"
                  onClick={() => void submit()}
                  disabled={(!input.trim() && !selectedFile) || !connected || uploading}
                >
                  <ArrowUp className="size-4" />
                </Button>
              </PromptInputAction>
            </PromptInputActions>
          </PromptInput>
        </div>
      </div>
    </section>
  );
}

const PROSE =
  "prose prose-sm max-w-none text-slate-700 prose-headings:text-slate-900 prose-headings:font-bold prose-a:text-pink-600 hover:prose-a:underline prose-strong:text-slate-900 prose-code:text-pink-600 prose-code:bg-pink-50 prose-code:px-1 prose-code:rounded";

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-3 px-2 py-1 animate-in fade-in duration-300">
      <div className="relative flex size-7 items-center justify-center shrink-0">
        <span className="absolute inset-0 rounded-full bg-pink-600/20 animate-ping" />
        <span className="relative flex size-7 items-center justify-center rounded-full bg-pink-600 text-white shadow-md shadow-pink-600/30">
          <img src={hero} alt="AI" className="size-5 rounded-full object-cover" />
        </span>
      </div>
      <div className="flex items-center gap-2 rounded-2xl bg-white border border-pink-100 px-3 py-1 shadow-2xs">
        <span className="text-xs font-bold text-pink-600 tracking-tight">AI Assistant thinking</span>
        <span className="flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-pink-600 animate-[bounce_1.4s_infinite_0ms]" />
          <span className="size-1.5 rounded-full bg-pink-600 animate-[bounce_1.4s_infinite_200ms]" />
          <span className="size-1.5 rounded-full bg-pink-600 animate-[bounce_1.4s_infinite_400ms]" />
        </span>
      </div>
    </div>
  );
}

function ApprovalCard({ turn }: { turn: Extract<Turn, { role: "approval" }> }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 shadow-2xs animate-in fade-in duration-200">
      <div className="mb-1 flex items-center gap-2 text-xs font-bold text-amber-900">
        <ShieldAlert className="size-4 text-amber-600" /> Application Approval Requested
      </div>
      <p className="text-xs text-amber-800 leading-relaxed">
        {turn.state === "pending"
          ? "Please review and decide on the selected application in the details panel."
          : turn.state === "approved"
          ? "Application approved successfully."
          : "Application process cancelled."}
      </p>
    </div>
  );
}

function subagentIcon(state: SubagentState) {
  switch (state) {
    case "pending":
      return <Circle className="text-slate-300 size-3.5" />;
    case "started":
      return <Loader2 className="size-3.5 animate-spin text-pink-600" />;
    case "completed":
      return <CircleCheck className="size-3.5 text-emerald-600" />;
    case "failed":
      return <CircleX className="size-3.5 text-red-500" />;
  }
}

const SUBAGENT_LABEL: Record<SubagentState, string> = {
  pending: "queued",
  started: "analyzing…",
  completed: "done",
  failed: "failed",
};

function TurnView({ turn, onJobSelect }: { turn: Turn; onJobSelect: (job: JobMatch) => void }) {
  switch (turn.role) {
    case "user":
      return (
        <div className="flex justify-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="max-w-[85%] rounded-3xl rounded-tr-xs bg-pink-600 px-4 py-2.5 text-xs text-white shadow-md shadow-pink-600/20 whitespace-pre-wrap font-semibold leading-relaxed">
            {turn.text}
          </div>
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white shadow-2xs">
            <User className="size-3.5" />
          </div>
        </div>
      );
    case "assistant":
      return (
        <div className="flex gap-2.5 animate-in fade-in duration-200">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-pink-600 text-white shadow-md shadow-pink-600/20">
            <img src={hero} alt="AI" className="size-5 rounded-full object-cover" />
          </div>
          <div className="min-w-0 flex-1 rounded-3xl border border-slate-100 bg-white p-4 shadow-2xs">
            <Markdown className={PROSE}>{turn.text}</Markdown>
          </div>
        </div>
      );
    case "tool":
      return (
        <div className="animate-in fade-in duration-200">
          <Tool toolPart={turn.part} />
        </div>
      );
    case "jobMatches":
      return <JobMatchCards jobs={turn.jobs} onJobSelect={onJobSelect} />;
    case "cvExtracted":
      return <CvExtractedCard turn={turn} />;
    case "cvPreview":
      return <CvPreviewCard turn={turn} />;
    case "cvGenerated":
      return (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs shadow-2xs animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 font-bold text-emerald-950 text-sm">
            <CheckCircle2 className="size-4.5 text-emerald-600 shrink-0" />
            <span>Your CV is generated & ready!</span>
          </div>
          <a
            className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-pink-600 px-4 py-2 font-bold text-white shadow-md shadow-pink-600/25 hover:bg-pink-700 transition-all active:scale-95"
            href={`${AUTH_BASE_URL}${turn.downloadUrl}`}
            download={turn.fileName}
          >
            <Download className="size-4" />
            Download {turn.fileName}
          </a>
        </div>
      );
    case "supervision":
      return (
        <div className="space-y-2 rounded-3xl border border-slate-200/70 bg-slate-50/80 p-3.5 animate-in fade-in duration-200">
          <div className="text-slate-600 flex items-center gap-1.5 text-xs font-bold">
            <Network className="size-3.5 text-pink-600" /> Supervisor · {turn.subagents.length} subagents
          </div>
          <ChainOfThought>
            {turn.subagents.map((s) => (
              <ChainOfThoughtStep key={s.stepId} defaultOpen>
                <ChainOfThoughtTrigger leftIcon={subagentIcon(s.state)}>
                  <span className="font-bold capitalize text-slate-800">{s.agent}</span>
                  <span className="text-slate-400"> · {SUBAGENT_LABEL[s.state]}</span>
                </ChainOfThoughtTrigger>
                <ChainOfThoughtContent>
                  <ChainOfThoughtItem className="italic text-slate-500">{s.objective}</ChainOfThoughtItem>
                  {s.state === "completed" && s.findings && (
                    <ChainOfThoughtItem className="text-slate-800">
                      <Markdown className={PROSE}>{s.findings}</Markdown>
                    </ChainOfThoughtItem>
                  )}
                  {s.state === "failed" && (
                    <ChainOfThoughtItem className="text-red-500 font-bold">{s.findings}</ChainOfThoughtItem>
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
        <div className="text-slate-400 flex items-center gap-2 py-1 text-xs">
          <div className="bg-slate-200 h-px flex-1" />
          <span className="shrink-0 font-bold">
            ↪ handed off <span className="text-pink-600">{turn.from}</span> →{" "}
            <span className="text-slate-800">{turn.to}</span>
          </span>
          <div className="bg-slate-200 h-px flex-1" />
        </div>
      );
    case "log":
      return (
        <p
          className={cn(
            "px-1 text-xs font-mono",
            turn.level === "error"
              ? "text-red-500"
              : turn.level === "warn"
              ? "text-amber-600"
              : "text-slate-400"
          )}
        >
          {turn.text}
        </p>
      );
  }
}

function CvExtractedCard({ turn }: { turn: Extract<Turn, { role: "cvExtracted" }> }) {
  const profile = turn.profile;
  const fields = (
    [
      ["Name", profile.fullName],
      ["Target role", profile.targetRole],
      ["Email", profile.email],
      ["Phone", profile.phone],
      ["Skills", Array.isArray(profile.skills) ? profile.skills.join(", ") : null],
      ["Experience", profile.experienceYears == null ? null : `${profile.experienceYears} years`],
    ] as [string, unknown][]
  ).filter(([, value]) => Boolean(value)) as [string, string][];

  return (
    <div className="rounded-3xl border border-pink-100 bg-pink-50/50 p-4 text-xs shadow-2xs animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center gap-2 font-bold text-pink-950 mb-2.5">
        <FileCheck2 className="size-4 text-pink-600 shrink-0" />
        <span>CV Profile Extracted</span>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-xs bg-white p-3 rounded-2xl border border-pink-100/80">
        {fields.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-slate-400 font-semibold">{label}:</dt>
            <dd className="min-w-0 font-bold text-slate-800">{String(value)}</dd>
          </div>
        ))}
      </dl>
      {turn.missingFields.length > 0 && (
        <p className="text-amber-800 mt-2 text-xs font-semibold">Missing fields: {turn.missingFields.join(", ")}.</p>
      )}
      {turn.warnings.map((warning) => (
        <p key={warning} className="mt-1 text-xs text-amber-600 font-medium">
          {warning}
        </p>
      ))}
      <p className="text-pink-600 mt-2.5 text-[11px] font-bold">
        Reply with updates or type <span className="underline">“confirm”</span> to proceed.
      </p>
    </div>
  );
}

function CvPreviewCard({ turn }: { turn: Extract<Turn, { role: "cvPreview" }> }) {
  if (!turn.preview) {
    return <p className="text-slate-500 text-xs italic">Missing information: {turn.missingFields.join(", ")}.</p>;
  }
  const preview = turn.preview;

  return (
    <div className="rounded-3xl border border-pink-200/80 bg-white p-4 text-xs shadow-2xs animate-in fade-in duration-200 space-y-2.5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <span className="font-black text-slate-900 text-sm">{String(preview.fullName ?? "Candidate")}</span>
        <span className="rounded-xl bg-pink-50 border border-pink-200 px-2.5 py-0.5 text-[11px] font-bold text-pink-600">
          {String(preview.targetRole ?? "CV Preview")}
        </span>
      </div>
      {preview.summary != null && <p className="text-slate-600 leading-relaxed font-medium">{String(preview.summary)}</p>}
      {Array.isArray(preview.skills) && preview.skills.length > 0 && (
        <p className="text-xs text-slate-700">
          <span className="font-bold text-slate-900">Skills:</span> {(preview.skills as string[]).join(", ")}
        </p>
      )}
      <p className="text-pink-600 text-[11px] font-bold pt-1 border-t border-slate-100">
        Reply <span className="underline">“approve”</span> to build your final PDF, or suggest changes.
      </p>
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
    return <p className="text-slate-500 text-xs italic">No matching job listings found.</p>;
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <button
          key={job.id}
          type="button"
          className="group relative w-full overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-4 text-left text-xs transition-all duration-200 hover:border-pink-600 hover:shadow-md hover:shadow-pink-600/10 focus:outline-none focus:ring-2 focus:ring-pink-600/20 active:scale-98 animate-in fade-in slide-in-from-bottom-2 duration-300"
          onClick={() => onJobSelect(job)}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-pink-600 opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 text-sm group-hover:text-pink-600 transition-colors">
                {job.title}
              </h3>
              <p className="text-slate-500 text-xs mt-0.5 font-semibold">
                {job.company.name} · {job.location.workType} · {job.yearsOfExperience.min}+ yrs exp
              </p>
            </div>
            <span className="shrink-0 rounded-2xl bg-pink-600 text-white px-3 py-1 text-xs font-black shadow-xs">
              {job.score}% match
            </span>
          </div>

          <p className="text-slate-600 mt-2.5 line-clamp-2 leading-relaxed">{job.description}</p>
          <p className="mt-2.5 text-slate-800 font-bold bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
            {job.reason}
          </p>

          {Array.isArray(job.gaps) && job.gaps.length > 0 && (
            <p className="text-amber-700 mt-2 text-[11px] font-bold">Gaps: {job.gaps.join(" · ")}</p>
          )}

          <div className="mt-3 flex flex-wrap gap-1.5">
            {job.matchedSkills.map((skill) => (
              <span
                key={skill}
                className="rounded-xl bg-pink-50 border border-pink-200/60 px-2.5 py-0.5 text-[11px] font-bold text-pink-600"
              >
                {skill}
              </span>
            ))}
          </div>
        </button>
      ))}
    </div>
  );
}