# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

> **Note (2026-08-21):** This repo started as the "Harness Engineering & Agent Orchestration"
> workshop scaffold (see below), but the current branch (`chatCVgeneration`, off real feature
> branches like `AdminAccount`, `Authentication`, `LandingPage`, `JobListUI`, `InterviewerList`,
> `ProductionStep1`) has evolved it into a real vertical product: **TalentAI**, a conversational
> job-matching app. This is the opposite of the original "domain-neutral agent, harness is the
> protagonist" premise — worth keeping in mind since the rest of this file (Course Structure,
> Branching Strategy, Lesson Notes, parts of Repo structure) describes the *original workshop
> plan*, not what's actually in the tree today (there is no `lessons/` directory, and the git
> branches don't follow the `lesson-1..lesson-7` scheme).

**What TalentAI actually does, as built:**

- A chat-based assistant ("TalentAI") that helps a job-seeker: import an existing CV (PDF
  upload → `extractUploadedCv` → user confirms extracted facts), build/update a candidate
  profile (`updateCandidateProfile`, `confirmCandidateProfile`), generate a tailored CV PDF
  (`prepareCvPreview` → explicit approval → `generateCvPdf`), and search/rank job postings
  (`searchJobs`, scored in `harness/jobs.ts`). System prompt and tool wiring live in
  `harness/agents.ts`; the model loop lives in `harness/runtime.ts`.
- A two-sided marketplace: `user` accounts (job seekers) and `company` accounts (post jobs via
  `harness/jobs.ts` + `server/index.ts` `/api/company/jobs`, browse via `web/src/components/
  CompanyJobsPage.tsx`, `JobListPage.tsx`).
- A job-application flow with **human-in-the-loop approval**: `harness/applications.ts` runs a
  DBOS workflow that emits `ApprovalRequested`, suspends on `DBOS.recv("approval", ...)` for up
  to 24h, and resumes when the user approves/rejects via `POST /api/approve/:workflowId`.
- Auth via **better-auth** (email/password + Google OAuth), backed by Drizzle/Postgres
  (`server/auth.ts`, `harness/auth-schema.ts`), with a `role` field (`user` | `company`).
- Durable execution is provided by **DBOS** (`@dbos-inc/dbos-sdk`), not a hand-rolled
  StateStore/EventLog — `DBOS.launch()` recovers in-flight workflows on restart, `DBOS.runStep`
  checkpoints each step, `DBOS.startWorkflow` / `DBOS.send` / `DBOS.recv` replace the
  from-scratch L2/L7 primitives the original workshop plan describes below.
- Everything (chat turns, tool calls, job matches, CV events, approvals) still flows through the
  same event-bus-over-WebSocket shape the workshop scaffold set up (`shared/events.ts`,
  `harness/bus.ts`, `server/index.ts`), rendered by the inspector-derived UI in `web/`.

**Open questions (unresolved as of 2026-08-21 — confirm before relying on either answer):**

- **Admin role.** `server/auth.ts`'s role enum is only `"user" | "company"` — there is no
  `"admin"` anywhere in the code (verified by grep). But recent history mentions an admin
  account (`492c9d4 admin role account created`) and there's an `AdminAccount` branch. Unclear
  whether admin support lives on an unmerged branch, is done some other way (allowlist/DB flag),
  or was reverted. Don't assume an admin role exists in `chatCVgeneration` until checked.
- **`candidate_profiles` legacy columns.** `harness/db.ts` keeps old flat columns (`position`,
  `programming_languages`, `skills`, etc.) written in parallel with the new `profile_data` jsonb
  column, commented as mid-"migration window". Whether that migration is finished (columns are
  dead weight) or still relied on somewhere is unresolved — don't drop the legacy columns without
  checking every reader of them first.

---

## Gotchas (not derivable from the code)

- **One WebSocket, not the AI SDK UI transport.** The browser and server speak over a single
  WebSocket: client→server commands and server→client the harness event stream. We deliberately do
  NOT use the AI SDK's `useChat`/UI transport — it is request-scoped and cannot express
  server-initiated events (a sub-agent finishing, a workflow resuming days later). The AI SDK is
  used server-side only (`streamText`), bridged into the event bus.
- **`harness/system-prompt.ts` is dead code.** It exports only `SAMPLE_TASK`, a refund/billing demo
  string unrelated to TalentAI. Nothing in the tree imports it — safe to delete when touching this area.
- **`harness/sandbox.ts` is `node:vm`, not a real isolate.** It does not stop async hangs. See its
  own header comment before trusting it with untrusted code.

## Code Style

This is a live-coding course. All code must be:
- **Simple and readable** — students type this during the workshop.
- **No clever abstractions** — prefer straightforward, explicit code over DRY.
- **Easy to follow** — prioritize clarity over elegance. The failure modes should be impressive,
  not the agent.

## Git Commits

Do not add co-author lines to commits.
