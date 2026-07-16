import type { ApplicationRecord } from "./db";

export function needsApplicationApproval(
  application: ApplicationRecord,
  workflowId: string,
): boolean {
  return application.workflowId === workflowId && application.status === "pending";
}
