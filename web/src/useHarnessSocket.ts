import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentEvent, ClientMessage } from "@shared/events";
import { AUTH_BASE_URL } from "./auth-client";

export function useHarnessSocket() {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cursorRef = useRef(0);
  const stopped = useRef(false);

  useEffect(() => {
    stopped.current = false;
    let delay = 1000;
    const poll = async () => {
      if (stopped.current) return;
      try {
        const response = await fetch(`${AUTH_BASE_URL}/api/events?after=${cursorRef.current}`, { credentials: "include" });
        if (!response.ok) throw new Error(`events (${response.status})`);
        const payload = await response.json() as { events: (AgentEvent & { seq?: number })[]; cursor?: number };
        if (payload.events.length) {
          setEvents((prev) => [...prev, ...payload.events.filter((event) => !prev.some((item) => item.id === event.id))]);
          cursorRef.current = payload.cursor ?? payload.events.at(-1)?.seq ?? cursorRef.current;
        }
        setConnected(true);
        setError(null);
        delay = 1000;
      } catch {
        setConnected(false);
        setError("Cannot reach the harness server.");
        delay = Math.min(delay * 2, 15_000);
      }
      if (!stopped.current) window.setTimeout(poll, delay);
    };
    void poll();
    return () => { stopped.current = true; };
  }, []);

  const send = useCallback((message: ClientMessage) => {
    const endpoint = message.type === "submit_task" ? "/api/tasks" : "/api/applications";
    const body = message.type === "submit_task"
      ? { input: message.input, attachments: message.attachments }
      : { jobId: message.jobId };
    void fetch(`${AUTH_BASE_URL}${endpoint}`, {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }).then((response) => {
      if (!response.ok) throw new Error(`request (${response.status})`);
      setError(null);
    }).catch(() => setError("The harness server is not connected."));
    return true;
  }, []);

  return { events, connected, error, send };
}
