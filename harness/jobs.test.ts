import assert from "node:assert/strict";
import test from "node:test";
import { JOB_POSTS } from "./job-seed";
import { rankJobs } from "./jobs";

test("ranks matching skills and experience above partial matches", () => {
  const matches = rankJobs(JOB_POSTS, ["React", "TypeScript", "Testing"], 3);

  assert.equal(matches[0]?.title, "Frontend Developer");
  assert.equal(matches[0]?.score, 54);
  assert.deepEqual(matches[0]?.matchedSkills, ["react", "typescript"]);
});

test("excludes jobs without a required-skill overlap", () => {
  const matches = rankJobs(JOB_POSTS, ["figma"], 2);

  assert.deepEqual(matches.map((job) => job.title), ["Product Designer"]);
});

test("normalizes duplicate skills and applies an experience penalty", () => {
  const [match] = rankJobs(JOB_POSTS, ["JavaScript", " javascript "], 0);

  assert.equal(match?.title, "Junior Software Engineer");
  assert.equal(match?.score, 50);
  assert.deepEqual(match?.matchedSkills, ["javascript"]);
});

test("returns an empty shortlist for no skills", () => {
  assert.deepEqual(rankJobs(JOB_POSTS, [], 5), []);
});
