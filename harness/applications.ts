import { DBOS } from "@dbos-inc/dbos-sdk";
import type { JobPost } from "@shared/events";
import { EventType, type ApplicationStatus } from "@shared/events";
import { emit } from "./bus";
import { ensureApplication, resolveApplication } from "./db";
import { needsApplicationApproval } from "./application-state";

const APPROVAL_TIMEOUT_S = 86_400;

export type ApplicationWorkflowInput = {
  userId: string;
  job: JobPost;
};

async function emitStatus(
  workflowId: string,
  userId: string,
  jobId: string,
  status: ApplicationStatus,
): Promise<void> {
  await emit({ type: EventType.ApplicationStatus, workflowId, userId, jobId, status }, userId);
}

async function applicationWorkflow(input: ApplicationWorkflowInput): Promise<ApplicationStatus> {
  const workflowId = DBOS.workflowID ?? "unknown";
  const application = await DBOS.runStep(
    () => ensureApplication(input.userId, input.job.id, workflowId),
    { name: "ensure-application" },
  );
  await DBOS.runStep(
    () => emitStatus(application.workflowId, input.userId, input.job.id, application.status),
    { name: "application-pending" },
  );

  if (!needsApplicationApproval(application, workflowId)) return application.status;

  const toolCallId = `application-${input.job.id}`;
  await DBOS.runStep(
    () => emit({
      type: EventType.ApprovalRequested,
      workflowId,
      toolCallId,
      action: "submitApplication",
      args: { jobId: input.job.id, title: input.job.title, company: input.job.company.name },
    }, input.userId),
    { name: "approval-requested" },
  );

  const decision = await DBOS.recv<{ approved: boolean }>("approval", APPROVAL_TIMEOUT_S);
  const approved = decision?.approved ?? false;
  await DBOS.runStep(
    () => emit({ type: EventType.ApprovalResolved, workflowId, toolCallId, approved }, input.userId),
    { name: "approval-resolved" },
  );

  const status: Extract<ApplicationStatus, "submitted" | "cancelled"> = approved
    ? "submitted"
    : "cancelled";
  const resolved = await DBOS.runStep(
    () => resolveApplication(input.userId, input.job.id, workflowId, status),
    { name: "resolve-application" },
  );
  await DBOS.runStep(
    () => emitStatus(workflowId, input.userId, input.job.id, resolved.status),
    { name: "application-resolved" },
  );
  return resolved.status;
}

export const runApplicationWorkflow = DBOS.registerWorkflow(applicationWorkflow, {
  name: "mockApplicationWorkflow",
});
