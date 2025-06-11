import { openai } from "@ai-sdk/openai";
import { groq } from "@ai-sdk/groq";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { fireworks } from "@ai-sdk/fireworks";
import type { LanguageModelV1 } from "ai";

// Return the correct AI-SDK language model instance for the given model name.
export function getLanguageModel(model: string): LanguageModelV1 {
  const lower = model.toLowerCase();

  if (lower.includes("gpt")) return openai(model);
  if (lower.includes("llama") || lower.includes("groq")) return groq(model);
  if (lower.includes("gemini")) return google(model);
  if (lower.includes("claude")) return anthropic(model);

  // Fireworks is a bit special, it uses a generic model string
  if (model.startsWith("accounts/fireworks/models/")) {
    return fireworks(model);
  }

  // Fallback for OpenRouter or other models. For now, we'll use OpenAI as a
  // generic handler, though this might not work for all models. A proper
  // custom fetch implementation would be needed for full OpenRouter support.
  if (lower.includes("openrouter")) {
    console.warn(
      `OpenRouter model selected (${model}), attempting to use OpenAI provider as a fallback.`
    );
    return openai(model);
  }

  // Default fallback
  console.warn(`Unknown model provider for "${model}". Defaulting to OpenAI.`);
  return openai(model);
}
