import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentEvent, ClientMessage } from "@shared/events";
import { AUTH_BASE_URL } from "./auth-client";

// The inspector's single source of truth: the harness event stream, received
// over one WebSocket. We also send commands (submit_task, ...) back over it.
const WS_URL = `${AUTH_BASE_URL.replace(/^http/, "ws")}/ws`;

export function useHarnessSocket() {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;

    socket.onopen = () => {
      setConnected(true);
      setError(null);
    };
    socket.onerror = () => {
      setError("Cannot reach the harness server.");
    };
    socket.onclose = () => {
      setConnected(false);
    };
    socket.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as AgentEvent;
        setEvents((prev) => [...prev, event]);
      } catch {
        setError("Received an invalid event from the harness server.");
      }
    };

    return () => socket.close();
  }, []);

  const send = useCallback((message: ClientMessage) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      setError("The harness server is not connected.");
      return false;
    }

    socketRef.current.send(JSON.stringify(message));
    setError(null);
    return true;
  }, []);

  return { events, connected, error, send };
}
