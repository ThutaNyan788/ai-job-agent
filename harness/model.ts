import { openai } from "@ai-sdk/openai";

// The one place the model is configured.
//   - cheaper for a workshop → a "-mini" / "-nano" variant (e.g. "gpt-5-mini")
//   - this default            → "gpt-5.5"
//
// The provider reads OPENAI_API_KEY from the environment at request time
// (the server loads it from .dev.vars on startup).
export const model = openai("gpt-5-mini");

// This is a reasoning model, and reasoning happens *before* the first token is
// streamed - so the default effort shows up directly as dead air in the chat.
// This agent mostly routes intent and calls tools, which does not need deep
// deliberation, so we trade reasoning depth for latency. Raise `reasoningEffort`
// if answers start missing steps.
export const chatProviderOptions = {
  openai: { reasoningEffort: "low", textVerbosity: "low" },
} as const;
