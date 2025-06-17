export const PROVIDER_BASE_URLS = {
  openai: "https://api.openai.com/v1",
  google: "https://generativelanguage.googleapis.com/v1beta",
  anthropic: "https://api.anthropic.com",
  openrouter: "https://openrouter.ai/api/v1",
  groq: "https://api.groq.com/openai/v1",
  deepseek: "https://api.deepseek.com/v1",
  grok: "https://api.x.ai/v1",
  cohere: "https://api.cohere.ai/v1",
  mistral: "https://api.mistral.ai/v1",
} as const;

export const SUPPORTED_PROVIDERS = [
  "openai",
  "google",
  "anthropic",
  "openrouter",
  "groq",
  "deepseek",
  "grok",
  "cohere",
  "mistral",
] as const;

export type SupportedProvider = (typeof SUPPORTED_PROVIDERS)[number];
