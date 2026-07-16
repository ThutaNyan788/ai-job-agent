import assert from "node:assert/strict";
import test from "node:test";
import { searchJobs } from "./jobs";

test("ranks matching skills and experience above partial matches", () => {
  const matches = searchJobs(["React", "TypeScript", "Testing"], 3);

  assert.equal(matches[0]?.title, "Frontend Engineer");
  assert.equal(matches[0]?.score, 75);
  assert.deepEqual(matches[0]?.matchedSkills, ["typescript", "react", "testing"]);
});

test("excludes jobs without a required-skill overlap", () => {
  const matches = searchJobs(["figma"], 2);

  assert.deepEqual(matches.map((job) => job.title), ["Product Designer"]);
});

test("normalizes duplicate skills and applies an experience penalty", () => {
  const [match] = searchJobs(["JavaScript", " javascript "], 0);

  assert.equal(match?.title, "Junior Software Engineer");
  assert.equal(match?.score, 50);
  assert.deepEqual(match?.matchedSkills, ["javascript"]);
});

test("returns an empty shortlist for no skills", () => {
  assert.deepEqual(searchJobs([], 5), []);
});
