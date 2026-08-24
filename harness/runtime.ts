import { DBOS } from "@dbos-inc/dbos-sdk";
import { streamText } from "ai";
import type { JSONValue, ModelMessage } from "ai";
import { EventType, type JobMatch } from "@shared/events";
import { emit, emitTransient } from "./bus";
import { jobSeekerAgent } from "./agents";
import { chatProviderOptions, model } from "./model";
import { loadChatHistory, saveChatHistory } from "./db";
import { getCandidateProfile, getLatestCvPreview, runTool } from "./tools";
import {
  buildContext,
  summarize,
  estimateTokens,
  MAX_CONTEXT_TOKENS,
  KEEP_CONTEXT_TOKENS,
} from "./memory";

const MAX_STEPS = 12;

type ToolCall = { toolCallId: string; toolName: string; input: Record<string, unknown> };
type Turn = { text: string; toolCalls: ToolCall[]; responseMessages: ModelMessage[] };
export type JobWorkflowInput = {
  message: string;
  userId: string;
  attachments?: { id: string; kind: "cv_pdf"; name: string }[];
};

async function modelTurn(
  workflowId: string,
  userId: string,
  context: ModelMessage[],
): Promise<Turn> {
  const result = streamText({
    model,
    messages: context,
    tools: jobSeekerAgent.tools,
    providerOptions: chatProviderOptions,
  });
  for await (const part of result.fullStream) {
    if (part.type === "text-delta") {
      emitTransient({ type: EventType.ModelDelta, workflowId, text: part.text }, userId);
    }
  }
  const rawCalls = await result.toolCalls;
  return {
    text: await result.text,
    toolCalls: rawCalls.map((call) => ({
      toolCallId: call.toolCallId,
      toolName: call.toolName,
      input: call.input as Record<string, unknown>,
    })),
    responseMessages: (await result.response).messages,
  };
}

async function toolStep(
  workflowId: string,
  userId: string,
  call: ToolCall,
): Promise<Record<string, unknown>> {
  await emit({
    type: EventType.ToolRequested,
    workflowId,
    toolCallId: call.toolCallId,
    name: call.toolName,
    args: call.input,
  }, userId);
  let output: Record<string, unknown>;
  try {
    output = await runTool(call.toolName, call.input, { userId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await emit({
      type: EventType.ToolFailed,
      workflowId,
      toolCallId: call.toolCallId,
      name: call.toolName,
      error: message,
    }, userId);
    return { error: message };
  }
  await emit({
    type: EventType.ToolCompleted,
    workflowId,
    toolCallId: call.toolCallId,
    result: output,
  }, userId);
  if (call.toolName === "searchJobs") {
    await emit({ type: EventType.JobMatches, workflowId, jobs: output.matches as JobMatch[] }, userId);
  }
  if (call.toolName === "extractUploadedCv") {
    await emit({
      type: EventType.CvExtracted,
      workflowId,
      profile: output.profile,
      warnings: (output.warnings as string[] | undefined) ?? [],
      missingFields: (output.missingFields as string[] | undefined) ?? [],
    }, userId);
  }
  if (call.toolName === "prepareCvPreview") {
    await emit({
      type: EventType.CvPreviewReady,
      workflowId,
      preview: output.preview ?? null,
      missingFields: (output.missingFields as string[] | undefined) ?? [],
    }, userId);
  }
  if (call.toolName === "generateCvPdf" && typeof output.documentId === "string") {
    await emit({
      type: EventType.CvGenerated,
      workflowId,
      documentId: output.documentId,
      fileName: String(output.fileName ?? "candidate-cv.pdf"),
      downloadUrl: String(output.downloadUrl ?? ""),
    }, userId);
  }
  return output;
}

function toolResultMessage(call: ToolCall, value: JSONValue): ModelMessage {
  return {
    role: "tool",
    content: [
      { type: "tool-result", toolCallId: call.toolCallId, toolName: call.toolName, output: { type: "json", value } },
    ],
  };
}

async function agentWorkflow(input: JobWorkflowInput): Promise<string> {
  const workflowId = DBOS.workflowID ?? "unknown";

  // Every DBOS step checkpoints to Postgres, and each round trip to a hosted
  // database is ~250ms+. These three used to run one after another, so the user
  // waited on all of them before the model was even called. They are independent,
  // so they run as one step, concurrently.
  const [, [loadedProfile, loadedPreview, loadedHistory]] = await DBOS.runStep(
    () => Promise.all([
      emit({ type: EventType.WorkflowStarted, workflowId, input: input.message }, input.userId),
      Promise.all([
        getCandidateProfile(input.userId),
        getLatestCvPreview(input.userId),
        loadChatHistory(input.userId),
      ]),
    ]),
    { name: "start-and-load" },
  );
  let profile = loadedProfile;
  let pendingPreview = loadedPreview;

  // Each user message runs as its own workflow, so without this the model saw
  // only the system prompt and the latest message - it would ask for a name it
  // had already been given. The turns and summary are the conversation.
  const turns: ModelMessage[][] = loadedHistory.turns;
  let summary = loadedHistory.summary;

  const attachmentContext = input.attachments?.length
    ? `\n\nAttached files:\n${input.attachments.map((file) => `- ${file.name} (uploadId: ${file.id}, kind: ${file.kind})`).join("\n")}`
    : "";
  // The message joins the transcript rather than being pinned ahead of it, so
  // it lands after the replies it is responding to. See buildContext.
  turns.push([{ role: "user", content: input.message + attachmentContext }]);

  for (let step = 0; step < MAX_STEPS; step++) {
    if (estimateTokens(turns.flat()) > MAX_CONTEXT_TOKENS) {
      const old: ModelMessage[][] = [];
      while (turns.length > 1 && estimateTokens(turns.flat()) > KEEP_CONTEXT_TOKENS) {
        const oldest = turns.shift();
        if (oldest) old.push(oldest);
      }
      if (old.length > 0) {
        summary = await DBOS.runStep(() => summarize(old, summary), { name: `summarize-${step}` });
        await DBOS.runStep(
          () => emit({
            type: EventType.MemoryCompacted,
            workflowId,
            summarizedTurns: old.length,
            contextTokens: estimateTokens(
              buildContext(
                jobSeekerAgent.systemPrompt(profile, pendingPreview?.previewId),
                summary,
                turns,
              ),
            ),
            summary,
          }, input.userId),
          { name: `compacted-${step}` },
        );
      }
    }

    const context = buildContext(
      jobSeekerAgent.systemPrompt(profile, pendingPreview?.previewId),
      summary,
      turns,
    );
    const turn = await DBOS.runStep(() => modelTurn(workflowId, input.userId, context), { name: `model-${step}` });
    const turnMessages: ModelMessage[] = [...turn.responseMessages];

    if (turn.toolCalls.length === 0) {
      turns.push(turnMessages);
      // Saved only once the turn is finished, so a crash mid-tool-loop leaves
      // no half-turn behind - an assistant tool call with no matching result is
      // a context the model cannot be sent.
      await DBOS.runStep(() => saveChatHistory(input.userId, { turns, summary }), { name: "save-history" });
      await DBOS.runStep(() => emit({ type: EventType.ModelCompleted, workflowId, text: turn.text }, input.userId), {
        name: `model-done-${step}`,
      });
      await DBOS.runStep(() => emit({ type: EventType.WorkflowCompleted, workflowId, output: turn.text }, input.userId), {
        name: "completed",
      });
      return turn.text;
    }

    for (const call of turn.toolCalls) {
      const output = await DBOS.runStep(() => toolStep(workflowId, input.userId, call), {
        name: `tool-${call.toolCallId}`,
      });
      if ((call.toolName === "updateCandidateProfile" || call.toolName === "confirmCandidateProfile" || call.toolName === "extractUploadedCv") && output.profile) {
        profile = output.profile as typeof profile;
      }
      if (call.toolName === "prepareCvPreview" && output.preview) {
        pendingPreview = output.preview as NonNullable<typeof pendingPreview>;
      }
      turnMessages.push(toolResultMessage(call, output as JSONValue));
    }
    turns.push(turnMessages);
  }

  // The turns here are whole and paired, so they are worth keeping - the user
  // should not have to repeat themselves because the agent ran long.
  await DBOS.runStep(() => saveChatHistory(input.userId, { turns, summary }), { name: "save-history-at-limit" });
  await DBOS.runStep(
    () => emit({ type: EventType.WorkflowFailed, workflowId, error: `Hit the ${MAX_STEPS}-step limit without finishing.` }, input.userId),
    { name: "failed" },
  );
  return "";
}

export const runAgentWorkflow = DBOS.registerWorkflow(agentWorkflow, { name: "jobAgentWorkflow" });
