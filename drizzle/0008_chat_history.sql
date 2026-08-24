-- The chat agent had no memory between messages: every user message starts a
-- new workflow, and the workflow's turn list started empty each time. The only
-- thing that survived was the candidate profile in the system prompt, so the
-- agent re-asked for a name or phone it had already been told.
--
-- One row per user holds the recent turns verbatim plus the compacted summary,
-- which is exactly the pair the workflow keeps in memory.
CREATE TABLE IF NOT EXISTS "chat_history" (
  "user_id" text PRIMARY KEY,
  "turns" jsonb NOT NULL,
  "summary" text NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
