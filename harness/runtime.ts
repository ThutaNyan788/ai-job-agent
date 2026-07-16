import { DBOS } from "@dbos-inc/dbos-sdk";
import { streamText } from "ai";
import type { JSONValue, ModelMessage } from "ai";
import { EventType, type JobMatch } from "@shared/events";
import { emit } from "./bus";
import { jobSeekerAgent } from "./agents";
import { model } from "./model";
import { getCandidateProfile, runTool } from "./tools";
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
export type JobWorkflowInput = { message: string; sessionId: string };

async function modelTurn(
  workflowId: string,
  context: ModelMessage[],
): Promise<Turn> {
  const result = streamText({ model, messages: context, tools: jobSeekerAgent.tools });
  for await (const part of result.fullStream) {
    if (part.type === "text-delta") {
      await emit({ type: EventType.ModelDelta, workflowId, text: part.text });
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
  sessionId: string,
  call: ToolCall,
): Promise<Record<string, unknown>> {
  await emit({
    type: EventType.ToolRequested,
    workflowId,
    toolCallId: call.toolCallId,
    name: call.toolName,
    args: call.input,
  });
  const output = await runTool(call.toolName, call.input, { sessionId });
  await emit({
    type: EventType.ToolCompleted,
    workflowId,
    toolCallId: call.toolCallId,
    result: output,
  });
  if (call.toolName === "searchJobs") {
    await emit({ type: EventType.JobMatches, workflowId, jobs: output.matches as JobMatch[] });
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
  await DBOS.runStep(
    () => emit({ type: EventType.WorkflowStarted, workflowId, input: input.message }),
    { name: "started" },
  );

  let profile = await DBOS.runStep(() => getCandidateProfile(input.sessionId), { name: "load-profile" });
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
        summary = await DBOS.runStep(() => summarize(old, summary), { name: `summarize-${step}` });
        await DBOS.runStep(
          () => emit({
            type: EventType.MemoryCompacted,
            workflowId,
            summarizedTurns: old.length,
            contextTokens: estimateTokens(buildContext(jobSeekerAgent.systemPrompt(profile), input.message, summary, turns)),
            summary,
          }),
          { name: `compacted-${step}` },
        );
      }
    }

    const context = buildContext(jobSeekerAgent.systemPrompt(profile), input.message, summary, turns);
    const turn = await DBOS.runStep(() => modelTurn(workflowId, context), { name: `model-${step}` });
    const turnMessages: ModelMessage[] = [...turn.responseMessages];

    if (turn.toolCalls.length === 0) {
      await DBOS.runStep(() => emit({ type: EventType.ModelCompleted, workflowId, text: turn.text }), {
        name: `model-done-${step}`,
      });
      await DBOS.runStep(() => emit({ type: EventType.WorkflowCompleted, workflowId, output: turn.text }), {
        name: "completed",
      });
      return turn.text;
    }

    for (const call of turn.toolCalls) {
      const output = await DBOS.runStep(() => toolStep(workflowId, input.sessionId, call), {
        name: `tool-${call.toolCallId}`,
      });
      if (call.toolName === "saveCandidateProfile" && output.profile) {
        profile = output.profile as typeof profile;
      }
      turnMessages.push(toolResultMessage(call, output as JSONValue));
    }
    turns.push(turnMessages);
  }

  await DBOS.runStep(
    () => emit({ type: EventType.WorkflowFailed, workflowId, error: `Hit the ${MAX_STEPS}-step limit without finishing.` }),
    { name: "failed" },
  );
  return "";
}

export const runAgentWorkflow = DBOS.registerWorkflow(agentWorkflow, { name: "jobAgentWorkflow" });
