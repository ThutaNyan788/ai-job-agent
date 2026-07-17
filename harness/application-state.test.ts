import assert from "node:assert/strict";
import test from "node:test";
import { needsApplicationApproval } from "./application-state";

const pendingApplication = {
  userId: "user-1",
  jobId: "job_001",
  workflowId: "workflow-1",
  status: "pending" as const,
};

test("a pending application belongs to its creating workflow", () => {
  assert.equal(needsApplicationApproval(pendingApplication, "workflow-1"), true);
  assert.equal(needsApplicationApproval(pendingApplication, "workflow-2"), false);
});

test("a submitted or cancelled application cannot request approval again", () => {
  assert.equal(needsApplicationApproval({ ...pendingApplication, status: "submitted" }, "workflow-1"), false);
  assert.equal(needsApplicationApproval({ ...pendingApplication, status: "cancelled" }, "workflow-1"), false);
});
