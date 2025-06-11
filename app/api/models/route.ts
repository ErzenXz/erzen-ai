import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import type { AIModel } from "@/lib/types";

// Static catalogue of models grouped by provider. Expand as you add keys.
// NOTE: The `model` field is the identifier you pass to the AI SDK.
const catalog: AIModel[] = [
  // OpenAI
  {
    id: nanoid(),
    name: "GPT-4o",
    description: "OpenAI GPT-4o (vision + text)",
    model: "gpt-4o-mini",
    type: "openai",
    createdAt: new Date().toISOString(),
  },
  {
    id: nanoid(),
    name: "GPT-4 Turbo",
    description: "OpenAI GPT-4 Turbo 128k",
    model: "gpt-4o",
    type: "openai",
    createdAt: new Date().toISOString(),
  },
  {
    id: nanoid(),
    name: "GPT-3.5 Turbo",
    description: "OpenAI GPT-3.5 Turbo",
    model: "gpt-3.5-turbo",
    type: "openai",
    createdAt: new Date().toISOString(),
  },
  // Google Gemini
  {
    id: nanoid(),
    name: "Gemini Flash 2.5",
    description: "Google Gemini Flash 2.5 (vision, fast)",
    model: "gemini-flash-2.5",
    type: "google",
    createdAt: new Date().toISOString(),
  },
  {
    id: nanoid(),
    name: "Gemini Pro 1.5",
    description: "Google Gemini 1.5 Pro (128k)",
    model: "gemini-pro-1.5",
    type: "google",
    createdAt: new Date().toISOString(),
  },
  // Anthropic
  {
    id: nanoid(),
    name: "Claude 3.5 Sonnet",
    description: "Anthropic Claude 3.5 Sonnet",
    model: "claude-3.5-sonnet-20240620",
    type: "anthropic",
    createdAt: new Date().toISOString(),
  },
  {
    id: nanoid(),
    name: "Claude 3 Opus",
    description: "Anthropic Claude 3 Opus",
    model: "claude-3-opus-20240229",
    type: "anthropic",
    createdAt: new Date().toISOString(),
  },
  // Groq (Llama 3)
  {
    id: nanoid(),
    name: "Llama 3 70B",
    description: "Groq Llama 3 70B blazing-fast",
    model: "llama3-70b-8192",
    type: "groq",
    createdAt: new Date().toISOString(),
  },
  {
    id: nanoid(),
    name: "Llama 3 8B",
    description: "Groq Llama 3 8B",
    model: "llama3-8b-8192",
    type: "groq",
    createdAt: new Date().toISOString(),
  },
  // Mistral via Fireworks
  {
    id: nanoid(),
    name: "Mixtral 8x22B",
    description: "Fireworks Mixtral 8x22B",
    model: "accounts/fireworks/models/mixtral-8x22b-instruct",
    type: "fireworks",
    createdAt: new Date().toISOString(),
  },
  // OpenRouter community models example
  {
    id: nanoid(),
    name: "Llama 4 Maverick",
    description: "OpenRouter Llama 4 Maverick",
    model: "meta-llama/llama-4-maverick-200b",
    type: "openrouter",
    createdAt: new Date().toISOString(),
  },
];

export async function GET() {
  return NextResponse.json(catalog);
}
