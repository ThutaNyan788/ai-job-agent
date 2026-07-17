// MUST be first: loads .dev.vars before any module that reads env at load time.
import "./env";

import { DBOS } from "@dbos-inc/dbos-sdk";
import express from "express";
import { createServer, type IncomingMessage } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { assertAuthConfiguration, auth } from "./auth";
import {
  ensureSchema,
  ensureAuthSchema,
  clearCandidateProfile,
  clearEventLog,
  ownsApplicationWorkflow,
} from "../harness/db";
import { subscribe, history } from "../harness/bus";
import { runAgentWorkflow } from "../harness/runtime";
import { runApplicationWorkflow } from "../harness/applications";
import { findJob } from "../harness/jobs";
import type { ClientMessage } from "@shared/events";

const PORT = Number(process.env.PORT ?? 8787);
const APP_ORIGIN = process.env.APP_ORIGIN ?? "http://localhost:5173";

async function authenticatedUser(headers: Parameters<typeof fromNodeHeaders>[0]) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(headers) });
  return session?.user ?? null;
}

async function main() {
  assertAuthConfiguration();
  await ensureSchema();
  await ensureAuthSchema();

  // Point DBOS at the same Postgres for its checkpoint store, then launch it.
  // launch() ALSO recovers any workflows that were mid-flight when the process
  // last died, resuming each from its last completed step.
  DBOS.setConfig({ name: "harness", systemDatabaseUrl: process.env.DATABASE_URL });
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
  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.get("/", (_req, res) => res.redirect(APP_ORIGIN));

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
  const upgradeUsers = new WeakMap<IncomingMessage, { id: string }>();

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
        });
      }
      if (message.type === "request_application") {
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
  });
}

main().catch((error) => {
  console.error("failed to start:", error);
  process.exit(1);
});
