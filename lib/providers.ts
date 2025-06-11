"use server";

import { openai } from "@ai-sdk/openai";
import { groq } from "@ai-sdk/groq";
import type { LanguageModelV1 } from "ai";

// Return the correct AI-SDK language model instance for the given model name.
export function getLanguageModel(model: string): LanguageModelV1 {
  const lower = model.toLowerCase();

  if (lower.includes("gpt") || lower.includes("openai")) {
    return openai(model);
  }

  if (lower.includes("llama") || lower.includes("groq")) {
    return groq(model);
  }

  // TODO: add actual providers for gemini, anthropic, openrouter, fireworks, grok etc.
  // For now, default to OpenAI so the request still succeeds.
  return openai(model);
}
