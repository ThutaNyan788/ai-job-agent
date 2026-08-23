// MUST be first: loads .dev.vars before any module that reads env at load time.
import "./env";

import { DBOS } from "@dbos-inc/dbos-sdk";
import express from "express";
import multer from "multer";
import { createServer, type IncomingMessage } from "node:http";
import { createCipheriv, randomBytes, randomUUID } from "node:crypto";
import { WebSocketServer, type WebSocket } from "ws";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { z } from "zod";
import { assertAuthConfiguration, auth } from "./auth";
import {
  ensureSchema,
  ensureAuthSchema,
  clearCandidateProfile,
  clearEventLog,
  ownsApplicationWorkflow,
  loadCandidateProfile,
  loadCvDocument,
  loadApplicationCvForDownload,
  loadApplicationCvSummary,
  loadUserEmail,
  listApplicationsForJob,
  countApplicantsByJob,
  applicationExists,
  acceptApplication,
  saveCvUpload,
} from "../harness/db";
import { subscribe, history, emit } from "../harness/bus";
import { getSmtpConfig } from "../harness/mailer";
import { runAgentWorkflow } from "../harness/runtime";
import { runApplicationWorkflow } from "../harness/applications";
import { runInterviewInviteWorkflow } from "../harness/interviews";
import { createCompanyJob, findJob, findJobForOwner, listJobs, listJobsForCompany } from "../harness/jobs";
import { EventType, type ClientMessage } from "@shared/events";

const PORT = Number(process.env.PORT ?? 8787);
const APP_ORIGIN = process.env.APP_ORIGIN ?? "http://localhost:5173";

const scheduleInterviewSchema = z.object({
  date: z.string().trim().min(1).max(40),
  time: z.string().trim().min(1).max(40),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(20_000),
});

// Missing/invalid env, as opposed to a service being unreachable. The two need
// different status codes and different advice, so they get different types.
class ConfigurationError extends Error {}

function requireZegoConfig() {
  const appId = Number(process.env.ZEGO_APP_ID);
  const serverSecret = process.env.ZEGO_SERVER_SECRET;
  if (!Number.isSafeInteger(appId) || appId <= 0 || !serverSecret) {
    throw new ConfigurationError("Zego Cloud is not configured. Set ZEGO_APP_ID and ZEGO_SERVER_SECRET.");
  }
  return { appId, serverSecret };
}

// Mints a Zego "test" token. Fine for local/dev use; a production deployment
// should mint tokens via a Zego backend token service instead.
function generateZegoTestToken(appId: number, serverSecret: string, roomId: string, userId: string, userName: string, expireSeconds = 3600) {
  const now = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({ app_id: appId, user_id: userId, nonce: Math.floor(Math.random() * 0x7fffffff), ctime: now, expire: now + expireSeconds });
  const key = Buffer.from(serverSecret, "utf8");
  if (![16, 24, 32].includes(key.length)) throw new Error("ZEGO_SERVER_SECRET must be 16, 24, or 32 UTF-8 bytes.");
  const iv = randomBytes(16);
  const cipher = createCipheriv(`aes-${key.length * 8}-cbc`, key, iv);
  const encrypted = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  const header = Buffer.alloc(28);
  header.writeUInt32BE(now + expireSeconds, 4);
  header.writeUInt16BE(iv.length, 8);
  iv.copy(header, 10);
  header.writeUInt16BE(encrypted.length, 26);
  return `04${Buffer.concat([header, encrypted]).toString("base64")}#${Buffer.from(JSON.stringify({ userID: userId, roomID: roomId, userName: encodeURIComponent(userName), appID: appId })).toString("base64")}`;
}

async function authenticatedUser(headers: Parameters<typeof fromNodeHeaders>[0]) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(headers) });
  const user = session?.user;
  return user ? (user as typeof user & { role?: string }) : null;
}

const jobPostInputSchema = z.object({
  company: z.object({
    name: z.string().trim().min(1).max(160),
    website: z.string().trim().url().max(500),
  }),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(20).max(10_000),
  location: z.object({
    country: z.string().trim().min(1).max(120),
    city: z.string().trim().min(1).max(120),
    workType: z.enum(["remote", "onsite", "hybrid"]),
  }),
  employmentType: z.enum(["full_time", "part_time", "contract", "internship"]),
  experienceLevel: z.enum(["junior", "mid", "senior", "lead"]),
  yearsOfExperience: z.object({
    min: z.number().int().min(0).max(80),
    max: z.number().int().min(0).max(80),
  }),
  salary: z.object({
    min: z.number().min(0),
    max: z.number().min(0),
    currency: z.string().trim().min(3).max(3).transform((value) => value.toUpperCase()),
  }),
  requiredSkills: z.array(z.object({
    name: z.string().trim().min(1).max(100),
    level: z.enum(["beginner", "intermediate", "advanced"]),
  })).min(1).max(50),
  responsibilities: z.array(z.string().trim().min(1).max(500)).min(1).max(50),
  requirements: z.array(z.string().trim().min(1).max(500)).min(1).max(50),
  niceToHave: z.array(z.string().trim().min(1).max(500)).max(50),
  benefits: z.array(z.string().trim().min(1).max(500)).max(50),
  status: z.enum(["active", "draft", "closed"]),
}).superRefine((job, context) => {
  if (job.yearsOfExperience.max < job.yearsOfExperience.min) {
    context.addIssue({ code: "custom", path: ["yearsOfExperience", "max"], message: "Maximum experience must be at least the minimum." });
  }
  if (job.salary.max < job.salary.min) {
    context.addIssue({ code: "custom", path: ["salary", "max"], message: "Maximum salary must be at least the minimum." });
  }
});

async function main() {
  assertAuthConfiguration();
  await ensureSchema();
  await ensureAuthSchema();

  // DBOS checkpoints every workflow step, so it is by far the chattiest user of
  // the database - and each round trip to a hosted Postgres costs ~250ms, which
  // the user feels directly as chat latency. The checkpoint store is pure
  // infrastructure and does not have to share the application database, so it
  // can be pointed at a local Postgres via DBOS_SYSTEM_DATABASE_URL.
  // Defaults to DATABASE_URL, which keeps existing setups working unchanged.
  //
  // launch() ALSO recovers any workflows that were mid-flight when the process
  // last died, resuming each from its last completed step.
  const systemDatabaseUrl = process.env.DBOS_SYSTEM_DATABASE_URL ?? process.env.DATABASE_URL;
  DBOS.setConfig({ name: "harness", systemDatabaseUrl });
  await DBOS.launch();

  const app = express();
  app.use((req, res, next) => {
    if (req.headers.origin === APP_ORIGIN) {
      res.setHeader("Access-Control-Allow-Origin", APP_ORIGIN);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });
  app.all("/api/auth/*splat", toNodeHandler(auth));
  app.use(express.json());
  const cvUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, callback) => {
      callback(null, file.mimetype === "application/pdf");
    },
  });
  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.get("/", (_req, res) => res.redirect(APP_ORIGIN));

  app.get("/api/jobs", async (req, res) => {
    const user = await authenticatedUser(req.headers);
    if (!user) return res.sendStatus(401);

    const query = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
    const location = typeof req.query.location === "string"
      ? req.query.location.trim().toLowerCase()
      : "";
    const experience = typeof req.query.experience === "string" ? req.query.experience : "";
    const workType = typeof req.query.workType === "string" ? req.query.workType : "";
    const jobs = (await listJobs()).filter((job) => {
      const searchable = [
        job.title,
        job.company.name,
        job.description,
        ...job.requiredSkills.map((skill) => skill.name),
        ...job.niceToHave,
      ].join(" ").toLowerCase();
      const jobLocation = `${job.location.city} ${job.location.country}`.toLowerCase();
      return (
        (!query || searchable.includes(query)) &&
        (!location || jobLocation.includes(location)) &&
        (!experience || job.experienceLevel === experience) &&
        (!workType || job.location.workType === workType)
      );
    });
    res.json({ jobs });
  });

  app.get("/api/jobs/:jobId", async (req, res) => {
    const user = await authenticatedUser(req.headers);
    if (!user) return res.sendStatus(401);
    const job = await findJob(req.params.jobId);
    if (!job || job.status !== "active") return res.sendStatus(404);
    res.json({ job });
  });

  app.post("/api/cv/uploads", async (req, res) => {
    const user = await authenticatedUser(req.headers);
    if (!user) return res.sendStatus(401);
    cvUpload.single("file")(req, res, async (error) => {
      try {
        if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ error: "CV PDF must be 5 MB or smaller." });
        }
        if (error) return res.status(400).json({ error: "Upload a single PDF file." });
        const file = req.file;
        if (!file || file.mimetype !== "application/pdf") {
          return res.status(400).json({ error: "Only PDF CV files are supported." });
        }
        if (file.size < 5 || file.buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
          return res.status(400).json({ error: "The uploaded file is not a valid PDF." });
        }
        const upload = await saveCvUpload(user.id, file.originalname, file.mimetype, file.buffer);
        return res.status(201).json(upload);
      } catch (uploadError) {
        console.error("CV upload failed:", uploadError);
        return res.status(500).json({ error: "The CV could not be stored. Please try again." });
      }
    });
  });

  app.get("/api/cv/documents/:documentId", async (req, res) => {
    const user = await authenticatedUser(req.headers);
    if (!user) return res.sendStatus(401);
    const document = await loadCvDocument(user.id, req.params.documentId);
    if (!document) return res.sendStatus(404);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${document.fileName.replace(/["\r\n]/g, "")}"`);
    return res.send(document.data);
  });

  app.get("/api/company/jobs", async (req, res) => {
    const user = await authenticatedUser(req.headers);
    if (!user) return res.sendStatus(401);
    if (user.role !== "company") return res.status(403).json({ error: "A company account is required." });
    const jobs = await listJobsForCompany(user.id);
    const applicantCounts = await countApplicantsByJob(jobs.map((job) => job.id));
    res.json({ jobs, applicantCounts });
  });

  app.post("/api/company/jobs", async (req, res) => {
    const user = await authenticatedUser(req.headers);
    if (!user) return res.sendStatus(401);
    if (user.role !== "company") return res.status(403).json({ error: "A company account is required." });
    const parsed = jobPostInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid job post." });
    }
    const job = await createCompanyJob(user.id, parsed.data);
    res.status(201).json({ job });
  });

  app.get("/api/company/jobs/:jobId/applicants", async (req, res) => {
    try {
      const user = await authenticatedUser(req.headers);
      if (!user) return res.sendStatus(401);
      if (user.role !== "company") return res.status(403).json({ error: "A company account is required." });
      const job = await findJobForOwner(req.params.jobId, user.id);
      if (!job) return res.sendStatus(404);
      const applications = await listApplicationsForJob(req.params.jobId);
      const applicants = await Promise.all(applications.map(async (application) => {
        const [email, profile, cv] = await Promise.all([
          loadUserEmail(application.userId),
          loadCandidateProfile(application.userId),
          loadApplicationCvSummary(application.userId, application.jobId),
        ]);
        return { ...application, email, profile, cv };
      }));
      return res.json({ job, applicants });
    } catch (error) {
      console.error("Failed to load applicants:", error);
      return res.status(500).json({ error: "Unable to load applicants." });
    }
  });

  app.get("/api/company/jobs/:jobId/applicants/:userId/cv", async (req, res) => {
    try {
      const user = await authenticatedUser(req.headers);
      if (!user) return res.sendStatus(401);
      if (user.role !== "company") return res.status(403).json({ error: "A company account is required." });
      const job = await findJobForOwner(req.params.jobId, user.id);
      if (!job) return res.sendStatus(404);
      const document = await loadApplicationCvForDownload(req.params.userId, req.params.jobId);
      if (!document) return res.sendStatus(404);
      res.setHeader("Content-Type", document.mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${document.fileName.replace(/["\r\n]/g, "")}"`);
      return res.send(document.data);
    } catch (error) {
      console.error("Failed to load CV:", error);
      return res.status(500).json({ error: "Unable to load the CV." });
    }
  });

  app.post("/api/company/jobs/:jobId/applicants/:userId/schedule-interview", async (req, res) => {
    try {
      const user = await authenticatedUser(req.headers);
      if (!user) return res.sendStatus(401);
      if (user.role !== "company") return res.status(403).json({ error: "A company account is required." });
      const job = await findJobForOwner(req.params.jobId, user.id);
      if (!job) return res.sendStatus(404);
      if (!(await applicationExists(req.params.userId, req.params.jobId))) return res.sendStatus(404);
      const parsed = scheduleInterviewSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid interview details." });

      const applicantEmail = await loadUserEmail(req.params.userId);
      if (!applicantEmail) return res.status(404).json({ error: "Applicant account not found." });

      requireZegoConfig();
      if (!getSmtpConfig()) {
        throw new ConfigurationError(
          "Email is not configured. Check SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and EMAIL_FROM.",
        );
      }

      const roomId = `talentai-${randomUUID()}`;
      const videoCallLink = `${APP_ORIGIN}/interview-room/${encodeURIComponent(roomId)}`;

      // Handing the email to a background workflow keeps this request fast. SMTP
      // can take a minute or more, which would otherwise hang the browser and
      // look like the server died. Progress arrives over the event stream.
      await DBOS.startWorkflow(runInterviewInviteWorkflow)({
        companyUserId: user.id,
        applicantUserId: req.params.userId,
        applicantEmail,
        jobId: req.params.jobId,
        roomId,
        videoCallLink,
        scheduledFor: `${parsed.data.date}T${parsed.data.time}`,
        subject: parsed.data.subject,
        message: parsed.data.message,
      });

      return res.status(202).json({ ok: true, videoCallLink, status: "sending" });
    } catch (error) {
      // Log the whole error - the code/command fields are what identify an SMTP
      // failure, and printing only `message` throws them away.
      console.error("Interview scheduling failed:", error);
      if (error instanceof ConfigurationError) {
        return res.status(500).json({ error: error.message });
      }
      return res.status(500).json({ error: "The interview could not be scheduled." });
    }
  });

  // Accepting an application is the company's decision, and it is what unlocks
  // the AI interview for the candidate. The event is addressed to the applicant,
  // so it reaches their open socket now and replays from history() later.
  app.post("/api/company/jobs/:jobId/applicants/:userId/accept", async (req, res) => {
    try {
      const user = await authenticatedUser(req.headers);
      if (!user) return res.sendStatus(401);
      if (user.role !== "company") return res.status(403).json({ error: "A company account is required." });
      const job = await findJobForOwner(req.params.jobId, user.id);
      if (!job) return res.sendStatus(404);

      const accepted = await acceptApplication(req.params.userId, req.params.jobId);
      if (!accepted) return res.status(409).json({ error: "Only a submitted application can be accepted." });

      await emit({
        type: EventType.ApplicationStatus,
        workflowId: accepted.workflowId,
        userId: accepted.userId,
        jobId: accepted.jobId,
        status: accepted.status,
      }, accepted.userId);

      return res.json({ applicant: accepted });
    } catch (error) {
      console.error("Failed to accept an application:", error);
      return res.status(500).json({ error: "The application could not be accepted." });
    }
  });

  app.get("/api/interviews/:roomId/token", async (req, res) => {
    try {
      const user = await authenticatedUser(req.headers);
      if (!user) return res.sendStatus(401);
      const roomId = req.params.roomId.trim();
      if (!/^talentai-[0-9a-f-]{36}$/.test(roomId)) return res.status(400).json({ error: "Invalid interview room." });
      const { appId, serverSecret } = requireZegoConfig();
      const userName = user.name || user.email;
      const token = generateZegoTestToken(appId, serverSecret, roomId, user.id, userName);
      return res.json({ token, appId, roomId, userId: user.id, userName });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create a Zego token.";
      return res.status(500).json({ error: message });
    }
  });

  // Clear the durable log. The inspector calls this, then reloads.
  app.post("/api/clear", async (req, res) => {
    const user = await authenticatedUser(req.headers);
    if (!user) return res.sendStatus(401);
    await clearEventLog(user.id);
    await clearCandidateProfile(user.id);
    res.json({ ok: true });
  });

  // Human-in-the-loop: deliver an approval decision to a suspended workflow.
  // DBOS.send wakes its recv() — even days later, even after a restart.
  app.post("/api/approve/:workflowId", async (req, res) => {
    const user = await authenticatedUser(req.headers);
    if (!user) return res.sendStatus(401);
    if (!(await ownsApplicationWorkflow(user.id, req.params.workflowId))) return res.sendStatus(404);
    const approved = Boolean(req.body?.approved);
    await DBOS.send(req.params.workflowId, { approved }, "approval");
    res.json({ ok: true });
  });

  const server = createServer(app);
  const wss = new WebSocketServer({ noServer: true });
  const socketUsers = new WeakMap<WebSocket, string>();
  const upgradeUsers = new WeakMap<IncomingMessage, { id: string; role?: string }>();

  server.on("upgrade", (request, socket, head) => {
    void (async () => {
      const path = new URL(request.url ?? "/", "http://localhost").pathname;
      if (path !== "/ws") return socket.destroy();
      if (request.headers.origin !== APP_ORIGIN) {
        socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
        return socket.destroy();
      }

      const user = await authenticatedUser(request.headers);
      if (!user) {
        socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
        return socket.destroy();
      }

      upgradeUsers.set(request, user);
      wss.handleUpgrade(request, socket, head, (websocket) => {
        wss.emit("connection", websocket, request);
      });
    })().catch(() => socket.destroy());
  });

  // An event is visible only to the account that owns the workflow which
  // emitted it. This also keeps live delivery consistent with history().
  subscribe((event) => {
    const data = JSON.stringify(event);
    for (const client of wss.clients) {
      if (socketUsers.get(client) === event.userId && client.readyState === client.OPEN) {
        client.send(data);
      }
    }
  });

  wss.on("connection", async (socket: WebSocket, request) => {
    const user = upgradeUsers.get(request);
    if (!user) return socket.close(1008, "Authentication required");
    socketUsers.set(socket, user.id);

    // Register the message handler FIRST — history() is an async DB read, and the
    // client sends as soon as it connects.
    socket.on("message", async (raw) => {
      let message: ClientMessage;
      try {
        message = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (message.type === "submit_task") {
        if (!message.input.trim()) return;
        await DBOS.startWorkflow(runAgentWorkflow)({
          message: message.input,
          userId: user.id,
          attachments: message.attachments,
        });
      }
      if (message.type === "request_application") {
        if (user.role === "company") return;
        const job = await findJob(message.jobId);
        if (!job) return;
        await DBOS.startWorkflow(runApplicationWorkflow)({ userId: user.id, job, cvUploadId: message.cvUploadId });
      }
    });

    // Replay the durable timeline (including a workflow DBOS is recovering).
    for (const event of await history(user.id)) socket.send(JSON.stringify(event));
  });

  server.listen(PORT, () => {
    console.log(`harness server listening on http://localhost:${PORT}  (ws: /ws)`);
  });
}

main().catch((error) => {
  console.error("failed to start:", error);
  process.exit(1);
});
