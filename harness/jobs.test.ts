import assert from "node:assert/strict";
import test from "node:test";
import { JOB_POSTS } from "./job-seed";
import { rankJobs } from "./jobs";
import { EMPTY_CANDIDATE_PROFILE, type CandidateProfile } from "@shared/candidate";

function profile(update: Partial<CandidateProfile>): CandidateProfile {
  return { ...structuredClone(EMPTY_CANDIDATE_PROFILE), ...update, revision: 1 };
}

test("ranks matching skills and experience above partial matches", () => {
  const matches = rankJobs(JOB_POSTS, profile({
    skills: ["React", "TypeScript", "Testing"],
    experienceYears: 3,
    targetRole: "Frontend",
  }));

  assert.equal(matches[0]?.title, "Frontend Developer");
  assert.ok((matches[0]?.score ?? 0) > (matches[1]?.score ?? 0));
  assert.deepEqual(matches[0]?.matchedSkills, ["react", "typescript", "testing"]);
});

test("excludes jobs without a required-skill overlap", () => {
  const matches = rankJobs(JOB_POSTS, profile({
    skills: ["figma"],
    experienceYears: 2,
    targetRole: "Designer",
  }));

  assert.deepEqual(matches.map((job) => job.title), ["Product Designer"]);
});

test("normalizes duplicate skills and applies an experience penalty", () => {
  const [match] = rankJobs(JOB_POSTS, profile({
    skills: ["JavaScript", " javascript "],
    experienceYears: 0,
    targetRole: "Software Engineer",
  }));

  assert.equal(match?.title, "Junior Software Engineer");
  assert.ok((match?.score ?? 0) > 0);
  assert.deepEqual(match?.matchedSkills, ["javascript"]);
});

test("returns an empty shortlist for no skills", () => {
  assert.deepEqual(rankJobs(JOB_POSTS, profile({})), []);
});
