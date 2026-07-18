import assert from "node:assert/strict";
import test from "node:test";
import {
  EMPTY_CANDIDATE_PROFILE,
  profilePatchValues,
  type CandidateProfilePatch,
} from "./candidate";

test("incremental profile updates preserve facts represented as null placeholders", () => {
  const current = {
    ...EMPTY_CANDIDATE_PROFILE,
    email: "nyanshein94@gmail.com",
    phone: "091122334455",
    targetRole: "Full Stack developer",
  };
  const toolPatch: CandidateProfilePatch = {
    fullName: "Nyan Shein",
    email: null,
    phone: null,
    targetRole: null,
  };

  const merged = { ...current, ...profilePatchValues(toolPatch) };

  assert.equal(merged.fullName, "Nyan Shein");
  assert.equal(merged.email, "nyanshein94@gmail.com");
  assert.equal(merged.phone, "091122334455");
  assert.equal(merged.targetRole, "Full Stack developer");
});

test("full profile replacements can still clear missing fields", () => {
  const values = profilePatchValues({
    fullName: "Nyan Shein",
    email: null,
    replace: true,
  });

  assert.equal(values.email, null);
});
