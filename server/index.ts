// MUST be first: loads .dev.vars before any module that reads env at load time.
import "./env";

import express from "express";
import multer from "multer";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { z } from "zod";
import { createCipheriv, randomBytes, randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import { assertAuthConfiguration, auth } from "./auth";
import {
  ensureSchema,
  ensureAuthSchema,
  clearCandidateProfile,
  clearEventLog,
  ownsApplicationWorkflow,
  loadCvDocument,
  saveCvUpload,
} from "../harness/db";
import { history } from "../harness/bus";
import { runAgentWorkflow } from "../harness/runtime";
import { requestApplication, decideApplication } from "../harness/applications";
import { createCompanyJob, findJob, listJobs, listJobsForCompany } from "../harness/jobs";

const PORT = Number(process.env.PORT ?? 8787);
const APP_ORIGIN = process.env.APP_ORIGIN ?? "http://localhost:5173";
const INTERVIEW_RECIPIENT = process.env.INTERVIEW_INVITATION_RECIPIENT ?? "thutanyan788@gmail.com";
const LOCAL_ORIGINS = new Set([APP_ORIGIN, "http://localhost:5173", "http://localhost:5174", "http://localhost:5175"]);

const scheduleInterviewSchema = z.object({
  candidateName: z.string().trim().min(1).max(160),
  jobTitle: z.string().trim().min(1).max(160),
  date: z.string().trim().min(1).max(40),
  time: z.string().trim().min(1).max(40),
  platform: z.string().trim().min(1).max(80),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(20_000),
});

function requireZegoConfig() {
  const appId = Number(process.env.ZEGO_APP_ID);
  const serverSecret = process.env.ZEGO_SERVER_SECRET;
  if (!Number.isSafeInteger(appId) || appId <= 0 || !serverSecret) {
    throw new Error("Zego Cloud is not configured. Set ZEGO_APP_ID and ZEGO_SERVER_SECRET.");
  }
  return { appId, serverSecret };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>\"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

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

export async function createApp() {
  assertAuthConfiguration();
  await ensureSchema();
  await ensureAuthSchema();

  const app = express();
  app.use((req, res, next) => {
    if (typeof req.headers.origin === "string" && LOCAL_ORIGINS.has(req.headers.origin)) {
      res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
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
    res.json({ jobs: await listJobsForCompany(user.id) });
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

  app.post("/api/interviews/schedule", async (req, res) => {
    try {
      const user = await authenticatedUser(req.headers);
      if (!user) return res.sendStatus(401);
      if (user.role !== "company") return res.status(403).json({ error: "A company account is required." });
      const parsed = scheduleInterviewSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid interview details." });

      requireZegoConfig();
      const roomId = `nexora-${randomUUID()}`;
      const videoCallLink = `${APP_ORIGIN}/interview-room/${encodeURIComponent(roomId)}`;
      const text = `${parsed.data.message}\n\nJoin the video interview: ${videoCallLink}`;
      const html = `<p>${escapeHtml(parsed.data.message).replace(/\n/g, "<br />")}</p><p><strong>Join the video interview:</strong> <a href="${escapeHtml(videoCallLink)}">${escapeHtml(videoCallLink)}</a></p>`;
      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = Number(process.env.SMTP_PORT ?? 587);
      const smtpSecure = process.env.SMTP_SECURE === "true";
      const smtpUser = process.env.SMTP_USER;
      const smtpPassword = process.env.SMTP_PASSWORD;
      const from = process.env.EMAIL_FROM ?? smtpUser;
      if (!smtpHost || !smtpUser || !smtpPassword || !from || !Number.isInteger(smtpPort)) {
        return res.status(500).json({ error: "Email is not configured. Check SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and EMAIL_FROM." });
      }
      const transporter = nodemailer.createTransport({ host: smtpHost, port: smtpPort, secure: smtpSecure, auth: { user: smtpUser, pass: smtpPassword } });
      await transporter.sendMail({ from, to: INTERVIEW_RECIPIENT, subject: parsed.data.subject, text, html });
      return res.status(201).json({ ok: true, recipient: INTERVIEW_RECIPIENT, videoCallLink });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown scheduling error.";
      console.error("Interview scheduling failed:", message);
      const isConfigurationError = message.startsWith("Zego Cloud is not configured") || message.startsWith("ZEGO_SERVER_SECRET");
      return res.status(isConfigurationError ? 500 : 502).json({ error: isConfigurationError ? message : `The invitation email could not be sent: ${message}` });
    }
  });

  app.get("/api/interviews/:roomId/token", async (req, res) => {
    try {
      const roomId = req.params.roomId.trim();
      if (!/^nexora-[0-9a-f-]{36}$/.test(roomId)) return res.status(400).json({ error: "Invalid interview room." });
      const { appId, serverSecret } = requireZegoConfig();
      const userId = `guest-${randomUUID()}`;
      const userName = typeof req.query.name === "string" && req.query.name.trim() ? req.query.name.trim().slice(0, 80) : "Interview guest";
      // This test-token helper is intended for development. Use a backend Zego
      // token service with generateKitTokenForProduction before deploying publicly.
      const token = generateZegoTestToken(appId, serverSecret, roomId, userId, userName);
      return res.json({ token, appId, roomId, userId, userName });
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
    const status = await decideApplication(user.id, req.params.workflowId, approved);
    res.json({ ok: true, status });
  });

  app.get("/api/events", async (req, res) => {
    const user = await authenticatedUser(req.headers);
    if (!user) return res.sendStatus(401);
    const after = Number(req.query.after ?? 0);
    const events = await history(user.id, Number.isFinite(after) ? after : 0);
    return res.json({ events, cursor: events.length ? (events[events.length - 1] as typeof events[number] & { seq: number }).seq : after });
  });

  app.post("/api/tasks", async (req, res) => {
    const user = await authenticatedUser(req.headers);
    if (!user) return res.sendStatus(401);
    const input = typeof req.body?.input === "string" ? req.body.input.trim() : "";
    if (!input) return res.status(400).json({ error: "Task input is required." });
    const workflowId = randomUUID();
    void runAgentWorkflow({ message: input, userId: user.id, attachments: req.body?.attachments, workflowId }).catch((error) => console.error("Task failed:", error));
    return res.status(202).json({ workflowId });
  });

  app.post("/api/applications", async (req, res) => {
    const user = await authenticatedUser(req.headers);
    if (!user) return res.sendStatus(401);
    const job = await findJob(String(req.body?.jobId ?? ""));
    if (!job) return res.sendStatus(404);
    const application = await requestApplication({ userId: user.id, job });
    return res.status(202).json({ application });
  });

  return app;
  /*
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
        await DBOS.startWorkflow(runApplicationWorkflow)({ userId: user.id, job });
      }
    });

    // Replay the durable timeline (including a workflow DBOS is recovering).
    for (const event of await history(user.id)) socket.send(JSON.stringify(event));
  });
  server.listen(PORT, () => {
    console.log(`harness server listening on http://localhost:${PORT}  (ws: /ws)`);
  });*/
}

/*main().catch((error) => {
  console.error("failed to start:", error);
  process.exit(1);
});*/
