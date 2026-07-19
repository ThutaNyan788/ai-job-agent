import { streamText } from "ai";
import type { JSONValue, ModelMessage } from "ai";
import { randomUUID } from "node:crypto";
import { EventType, type JobMatch } from "@shared/events";
import { emit, emitTransient } from "./bus";
import { jobSeekerAgent } from "./agents";
import { model } from "./model";
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
  workflowId?: string;
  attachments?: { id: string; kind: "cv_pdf"; name: string }[];
};

async function modelTurn(
  workflowId: string,
  userId: string,
  context: ModelMessage[],
): Promise<Turn> {
  const result = streamText({ model, messages: context, tools: jobSeekerAgent.tools });
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
  const workflowId = input.workflowId ?? randomUUID();
  await emit({ type: EventType.WorkflowStarted, workflowId, input: input.message }, input.userId);

  let profile = await getCandidateProfile(input.userId);
  let pendingPreview = await getLatestCvPreview(input.userId);
  const turns: ModelMessage[][] = [];
  let summary = "";

  for (let step = 0; step < MAX_STEPS; step++) {
    if (estimateTokens(turns.flat()) > MAX_CONTEXT_TOKENS) {
      const old: ModelMessage[][] = [];
      while (turns.length > 1 && estimateTokens(turns.flat()) > KEEP_CONTEXT_TOKENS) {
        const oldest = turns.shift();
        if (oldest) old.push(oldest);
      }
      if (old.length > 0) {
        summary = await summarize(old, summary);
        await emit({
            type: EventType.MemoryCompacted,
            workflowId,
            summarizedTurns: old.length,
            contextTokens: estimateTokens(
              buildContext(
                jobSeekerAgent.systemPrompt(profile, pendingPreview?.previewId),
                input.message,
                summary,
                turns,
              ),
            ),
            summary,
          }, input.userId);
      }
    }

    const attachmentContext = input.attachments?.length
      ? `\n\nAttached files:\n${input.attachments.map((file) => `- ${file.name} (uploadId: ${file.id}, kind: ${file.kind})`).join("\n")}`
      : "";
    const context = buildContext(
      jobSeekerAgent.systemPrompt(profile, pendingPreview?.previewId),
      input.message + attachmentContext,
      summary,
      turns,
    );
    const turn = await modelTurn(workflowId, input.userId, context);
    const turnMessages: ModelMessage[] = [...turn.responseMessages];

    if (turn.toolCalls.length === 0) {
      await emit({ type: EventType.ModelCompleted, workflowId, text: turn.text }, input.userId);
      await emit({ type: EventType.WorkflowCompleted, workflowId, output: turn.text }, input.userId);
      return turn.text;
    }

    for (const call of turn.toolCalls) {
      const output = await toolStep(workflowId, input.userId, call);
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

  await emit({ type: EventType.WorkflowFailed, workflowId, error: `Hit the ${MAX_STEPS}-step limit without finishing.` }, input.userId);
  return "";
}

export const runAgentWorkflow = agentWorkflow;
