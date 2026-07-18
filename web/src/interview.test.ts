import assert from "node:assert/strict";
import test from "node:test";
import { interviewRoleFromTitle, interviewUrlForTitle } from "./interview";

const expectedRoles = {
  "Frontend Developer": "frontend_developer",
  "Backend Engineer": "backend_engineer",
  "Full Stack Developer": "fullstack_developer",
  "Data Analyst": "data_analyst",
  "Data Engineer": "data_engineer",
  "QA Automation Engineer": "qa_automation_engineer",
  "Product Designer": "product_designer",
  "DevOps Engineer": "devops_engineer",
  "Mobile Developer": "mobile_developer",
  "Junior Software Engineer": "junior_software_engineer",
  "Machine Learning Engineer": "machine_learning_engineer",
  "Cloud Security Engineer": "cloud_security_engineer",
  "Android Developer": "android_developer",
  "Technical Writer": "technical_writer",
  "Solutions Architect": "solutions_architect",
  "Ruby on Rails Developer": "ruby_on_rails_developer",
  "Embedded Systems Engineer": "embedded_systems_engineer",
  "Product Manager": "product_manager",
  "Support Engineer": "support_engineer",
  "AI Application Developer": "ai_application_developer",
};

test("maps every seeded job title to its interview role", () => {
  for (const [title, expectedRole] of Object.entries(expectedRoles)) {
    assert.equal(interviewRoleFromTitle(title), expectedRole);
  }
});

test("builds the external interview URL", () => {
  assert.equal(
    interviewUrlForTitle("Full Stack Developer"),
    "http://ai-interview-agent-frontend-alpha.vercel.app/interview/fullstack_developer",
  );
});
