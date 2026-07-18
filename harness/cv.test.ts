import assert from "node:assert/strict";
import test from "node:test";
import { asSchema } from "@ai-sdk/provider-utils";
import { candidateProfileContentSchema, EMPTY_CANDIDATE_PROFILE } from "@shared/candidate";
import { buildCvSnapshot, extractPdfText, renderCvPdf } from "./cv";

const profile = {
  ...EMPTY_CANDIDATE_PROFILE,
  fullName: "Alex Morgan",
  email: "alex@example.com",
  targetRole: "Frontend Developer",
  skills: ["React", "TypeScript"],
  projects: [{
    name: "Talent App",
    description: "A job matching application.",
    technologies: ["React"],
    url: null,
  }],
};

test("requires the minimum facts before preparing a CV", () => {
  const result = buildCvSnapshot({ ...EMPTY_CANDIDATE_PROFILE, skills: ["React"] });
  assert.deepEqual(result.missingFields, [
    "full name",
    "email or phone",
    "target role",
    "at least one work experience, project, or education entry",
  ]);
});

test("renders an ATS PDF and extracts its approved content", async () => {
  const { snapshot } = buildCvSnapshot(profile);
  assert.ok(snapshot);
  const data = await renderCvPdf(snapshot);
  assert.equal(data.subarray(0, 5).toString("ascii"), "%PDF-");
  const text = await extractPdfText(data);
  assert.match(text, /Alex Morgan/);
  assert.match(text, /Frontend Developer/);
  assert.match(text, /Talent App/);
});

test("rejects non-PDF uploads", async () => {
  await assert.rejects(
    () => extractPdfText(Buffer.from("not a pdf")),
    /not a valid PDF/i,
  );
});

test("accepts common CV links without URL protocols", () => {
  const parsed = candidateProfileContentSchema.parse({
    ...profile,
    email: "alex at example dot com",
    links: [{ label: "LinkedIn", url: "linkedin.com/in/alex-morgan" }],
  });
  assert.equal(parsed.links[0]?.url, "linkedin.com/in/alex-morgan");
});

test("CV extraction JSON schema requires every declared property", async () => {
  const jsonSchema = await asSchema(candidateProfileContentSchema).jsonSchema as {
    properties: Record<string, { properties?: Record<string, unknown>; required?: string[]; items?: {
      properties?: Record<string, unknown>;
      required?: string[];
    } }>;
    required?: string[];
  };
  assert.deepEqual(
    new Set(jsonSchema.required),
    new Set(Object.keys(jsonSchema.properties)),
  );
  const workItems = jsonSchema.properties.workExperience?.items;
  assert.deepEqual(
    new Set(workItems?.required),
    new Set(Object.keys(workItems?.properties ?? {})),
  );
});
