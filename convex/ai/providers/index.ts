import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { deepseek } from "@ai-sdk/deepseek";
import { openrouter as openrouterProvider } from "@openrouter/ai-sdk-provider";
import { cohere as cohereProvider } from "@ai-sdk/cohere";
import { mistral as mistralProvider } from "@ai-sdk/mistral";
import { wrapLanguageModel, extractReasoningMiddleware } from "ai";
import {
  PROVIDER_BASE_URLS,
  SUPPORTED_PROVIDERS,
  SupportedProvider,
} from "./constants";
import {
  PROVIDER_CONFIGS,
  getModelInfo,
  createEnhancedModel,
} from "../../../src/lib/models";
// Provider options types are available but not exported, so we'll use any for now

// Helper to get the first model for a provider from the shared PROVIDER_CONFIGS.
// Falls back to a hard-coded default if the provider isn't found.
export const getDefaultModel = (provider: string): string => {
  const cfg = (PROVIDER_CONFIGS as Record<string, any>)[provider];
  if (cfg && Array.isArray(cfg.models) && cfg.models.length) {
    return cfg.models[0];
  }
  return "gemini-2.5-flash-preview-05-20"; // sensible global fallback
};

// Helper function to create AI model based on provider
export function createAIModel(args: {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  thinkingBudget?: string | number;
}) {
  console.log(`[AI Provider] Creating model ${args.provider}/${args.model}`);

  let baseModel;
  const providerOptions: any = {};

  try {
    switch (args.provider) {
      case "openai": {
        baseModel = openai(
          args.model as any,
          {
            apiKey: args.apiKey,
            baseURL: args.baseUrl,
          } as any
        );

        // Native thinking support for OpenAI models
        if (args.model.includes("o1") || args.model.includes("o3")) {
          // Reasoning models - use reasoningEffort
          const modelInfo = getModelInfo(args.model);
          if (modelInfo.supportsThinking) {
            providerOptions.openai = {
              reasoningEffort: args.thinkingBudget || "medium",
            };
          }
        }
        break;
      }

      case "anthropic": {
        baseModel = anthropic(
          args.model as any,
          {
            apiKey: args.apiKey,
            baseURL: args.baseUrl,
          } as any
        );

        // Native thinking support for Anthropic models
        const anthropicModelInfo = getModelInfo(args.model);
        if (anthropicModelInfo.supportsThinking) {
          providerOptions.anthropic = {
            thinking: {
              type: "enabled",
              budgetTokens:
                typeof args.thinkingBudget === "number"
                  ? args.thinkingBudget
                  : 15000,
            },
          };
        }
        break;
      }

      case "google": {
        baseModel = google(
          args.model as any,
          {
            apiKey: args.apiKey,
            baseURL: args.baseUrl,
          } as any
        );

        // Native thinking support for Google/Gemini models
        const googleModelInfo = getModelInfo(args.model);
        if (googleModelInfo.supportsThinking) {
          const thinkingBudget =
            typeof args.thinkingBudget === "number"
              ? args.thinkingBudget
              : 2048;

          providerOptions.google = {
            thinkingConfig: {
              includeThoughts: true,
              thinkingBudget,
            },
          };

          console.log(
            `[Google Provider] Enabling thinking for ${args.model} with budget: ${thinkingBudget}`
          );
        }
        break;
      }

      case "groq":
        baseModel = groq(args.model as any, { apiKey: args.apiKey } as any);
        break;

      case "openrouter":
        baseModel = openrouterProvider(
          args.model as any,
          { apiKey: args.apiKey } as any
        );
        break;

      case "deepseek":
        baseModel = deepseek(args.model as any, { apiKey: args.apiKey } as any);
        break;

      case "grok":
        baseModel = openai(
          args.model as any,
          { baseURL: args.baseUrl, apiKey: args.apiKey } as any
        );
        break;

      case "cohere":
        baseModel = cohereProvider(
          args.model as any,
          { apiKey: args.apiKey } as any
        );
        break;

      case "mistral":
        baseModel = mistralProvider(
          args.model as any,
          { apiKey: args.apiKey } as any
        );
        break;

      default:
        throw new Error(`Unsupported provider: ${args.provider}`);
    }

    console.log(
      `[AI Provider] Base model created for ${args.provider}/${args.model}`
    );

    // Apply reasoning middleware as fallback for providers without native thinking
    const needsMiddleware = !["openai", "anthropic", "google"].includes(
      args.provider
    );

    let finalModel;
    if (needsMiddleware) {
      // Apply reasoning middleware for providers that need it
      finalModel = wrapLanguageModel({
        model: baseModel,
        middleware: extractReasoningMiddleware({
          tagName: getReasoningTagName(args.provider, args.model),
        }),
      });
      console.log(
        `[AI Provider] Applied reasoning middleware to ${args.provider}/${args.model}`
      );
    } else {
      finalModel = baseModel;
      console.log(
        `[AI Provider] Using native thinking support for ${args.provider}/${args.model}`
      );
    }

    return {
      model: finalModel,
      providerOptions,
      hasNativeThinking: !needsMiddleware,
    };
  } catch (error) {
    console.error(
      `[AI Provider] Error creating model ${args.provider}/${args.model}:`,
      error
    );
    throw new Error(
      `Failed to create model: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

function getReasoningTagName(provider: string, model: string): string {
  // Tag patterns for different providers/models
  if (provider === "deepseek" || model.toLowerCase().includes("deepseek")) {
    return "think";
  }
  if (provider === "groq" && model.toLowerCase().includes("qwq")) {
    return "think";
  }
  if (model.toLowerCase().includes("r1")) {
    return "think";
  }

  // Default reasoning tags
  return "thinking";
}

// Helper function to get API key for a provider based on user preferences
export function getProviderApiKey(
  provider: SupportedProvider,
  userApiKey?: string
): { apiKey: string; usingUserKey: boolean } {
  let apiKey = "";
  let usingUserKey = false;

  // PRIORITIZE USER'S API KEY FIRST
  if (userApiKey && userApiKey.trim().length > 0) {
    apiKey = userApiKey.trim();
    usingUserKey = true;
  } else {
    // Use built-in keys only as fallback
    if (provider === "openai") {
      apiKey =
        process.env.CONVEX_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "";
    } else if (provider === "google") {
      apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
    } else if (provider === "anthropic") {
      apiKey = process.env.ANTHROPIC_API_KEY || "";
    } else if (provider === "openrouter") {
      apiKey = process.env.OPENROUTER_API_KEY || "";
    } else if (provider === "groq") {
      apiKey = process.env.GROQ_API_KEY || "";
    } else if (provider === "deepseek") {
      apiKey = process.env.DEEPSEEK_API_KEY || "";
    } else if (provider === "grok") {
      apiKey = process.env.GROK_API_KEY || "";
    } else if (provider === "cohere") {
      apiKey = process.env.COHERE_API_KEY || "";
    } else if (provider === "mistral") {
      apiKey = process.env.MISTRAL_API_KEY || "";
    }
  }

  return { apiKey, usingUserKey };
}

// Export constants and types
export { PROVIDER_BASE_URLS, SUPPORTED_PROVIDERS, getModelInfo };
export type { SupportedProvider };
