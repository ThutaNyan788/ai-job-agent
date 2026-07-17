import { randomUUID } from "node:crypto";
import { db, eventLog } from "./db";
import type { AgentEvent, EventInput } from "@shared/events";

// Durable events are persisted to Postgres before they are broadcast.
// Streaming model deltas are broadcast live without a database write.
//
// `emit` is async now — we write to the database before we hand the event out.

type Listener = (event: AgentEvent) => void;
const listeners = new Set<Listener>();

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function createEvent(input: EventInput, userId?: string): AgentEvent {
  return {
    ...input,
    id: randomUUID(),
    ts: Date.now(),
    ...(userId ? { userId } : {}),
  };
}

function publish(event: AgentEvent): void {
  for (const listener of listeners) listener(event);
}

// High-frequency stream fragments bypass Postgres. The final model.completed
// event is still durable, so refresh and workflow recovery retain the answer.
export function emitTransient(input: EventInput, userId?: string): void {
  publish(createEvent(input, userId));
}

export async function emit(input: EventInput, userId?: string): Promise<void> {
  const event = createEvent(input, userId);
  await db.insert(eventLog).values({ data: event }); // durable, ordered by `seq`
  publish(event);
}

// The full timeline so far, in order — read back from Postgres on every connect.
export async function history(userId: string): Promise<AgentEvent[]> {
  const rows = await db.select().from(eventLog).orderBy(eventLog.seq);
  return rows.map((row) => row.data).filter((event) => event.userId === userId);
}
