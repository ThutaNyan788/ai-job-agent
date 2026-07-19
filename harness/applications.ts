import { randomUUID } from "node:crypto";
import type { JobPost, ApplicationStatus } from "@shared/events";
import { EventType } from "@shared/events";
import { emit, history } from "./bus";
import { ensureApplication, resolveApplication } from "./db";

export type ApplicationWorkflowInput = { userId: string; job: JobPost; workflowId?: string };

/** Creates the pending application and emits its approval request. Safe to retry. */
export async function requestApplication(input: ApplicationWorkflowInput) {
  const workflowId = input.workflowId ?? randomUUID();
  const application = await ensureApplication(input.userId, input.job.id, workflowId);
  await emit({ type: EventType.ApplicationStatus, workflowId: application.workflowId, userId: input.userId, jobId: input.job.id, status: application.status }, input.userId);
  const alreadyRequested = (await history(input.userId)).some((event) =>
    event.type === EventType.ApprovalRequested && event.workflowId === application.workflowId);
  if (application.status === "pending" && !alreadyRequested) {
    await emit({
      type: EventType.ApprovalRequested,
      workflowId: application.workflowId,
      toolCallId: `application-${input.job.id}`,
      action: "submitApplication",
      args: { jobId: input.job.id, title: input.job.title, company: input.job.company.name },
    }, input.userId);
  }
  return application;
}

export async function decideApplication(userId: string, workflowId: string, approved: boolean): Promise<ApplicationStatus> {
  const status: "submitted" | "cancelled" = approved ? "submitted" : "cancelled";
  const prior = await history(userId);
  const priorStatus = prior.findLast((event) =>
    event.type === EventType.ApplicationStatus && event.workflowId === workflowId);
  if (priorStatus?.type === EventType.ApplicationStatus && priorStatus.status !== "pending") return priorStatus.status;
  const application = await resolveApplication(userId, workflowId, status);
  await emit({ type: EventType.ApprovalResolved, workflowId, toolCallId: `application-${application.jobId}`, approved }, userId);
  await emit({ type: EventType.ApplicationStatus, workflowId, userId, jobId: application.jobId, status: application.status }, userId);
  return application.status;
}

export const runApplicationWorkflow = requestApplication;
