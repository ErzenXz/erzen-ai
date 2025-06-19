"use node";

import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import {
  generateStreamingResponse as streamingHandler,
  generateNonStreamingResponse as nonStreamingHandler,
  generateTitle as titleHandler,
  getAvailableProviders as providersHandler,
} from "./ai/core";
import { getAvailableToolsConfig } from "./ai/tools";
import { PROVIDER_CONFIGS } from "../src/lib/models";
import { PROVIDER_BASE_URLS } from "./ai/providers/constants";

export const maxDuration = 1600;

export const generateStreamingResponse = action({
  args: {
    conversationId: v.id("conversations"),
    branchId: v.optional(v.string()),
    messages: v.array(
      v.object({
        role: v.union(
          v.literal("user"),
          v.literal("assistant"),
          v.literal("system")
        ),
        content: v.union(
          v.string(),
          v.array(
            v.union(
              v.object({
                type: v.literal("text"),
                text: v.string(),
              }),
              v.object({
                type: v.literal("image"),
                image: v.string(),
              }),
              v.object({
                type: v.literal("file"),
                data: v.string(),
                mimeType: v.string(),
              })
            )
          )
        ),
      })
    ),
    provider: v.optional(
      v.union(
        v.literal("openai"),
        v.literal("anthropic"),
        v.literal("google"),
        v.literal("openrouter"),
        v.literal("groq"),
        v.literal("deepseek"),
        v.literal("grok"),
        v.literal("cohere"),
        v.literal("mistral")
      )
    ),
    model: v.optional(v.string()),
    temperature: v.optional(v.number()),
    enabledTools: v.optional(v.array(v.string())),
    thinkingBudget: v.optional(v.union(v.string(), v.number())),
  },
  handler: streamingHandler,
});

export const generateResponse = action({
  args: {
    conversationId: v.id("conversations"),
    branchId: v.optional(v.string()),
    messages: v.array(
      v.object({
        role: v.union(
          v.literal("user"),
          v.literal("assistant"),
          v.literal("system")
        ),
        content: v.string(),
      })
    ),
    provider: v.optional(
      v.union(
        v.literal("openai"),
        v.literal("anthropic"),
        v.literal("google"),
        v.literal("openrouter"),
        v.literal("groq"),
        v.literal("deepseek"),
        v.literal("grok"),
        v.literal("cohere"),
        v.literal("mistral")
      )
    ),
    model: v.optional(v.string()),
    temperature: v.optional(v.number()),
    enabledTools: v.optional(v.array(v.string())),
  },
  handler: nonStreamingHandler,
});

export const getProviderModels = action({
  args: {
    provider: v.union(
      v.literal("openai"),
      v.literal("anthropic"),
      v.literal("google"),
      v.literal("openrouter"),
      v.literal("groq"),
      v.literal("deepseek"),
      v.literal("grok"),
      v.literal("cohere"),
      v.literal("mistral")
    ),
  },
  handler: async (_ctx, args) => {
    const cfg = (PROVIDER_CONFIGS as Record<string, any>)[args.provider] ?? {
      models: [],
    };
    return {
      name: args.provider,
      models: cfg.models ?? [],
      baseUrl: PROVIDER_BASE_URLS[args.provider],
    };
  },
});

export const getAvailableProviders = action({
  args: {},
  handler: providersHandler,
});

export const generateTitle = action({
  args: {
    userMessage: v.string(),
  },
  handler: async (ctx, args) => {
    return await titleHandler(ctx, args.userMessage);
  },
});

export const getAvailableTools = action({
  args: {},
  handler: async (ctx, _args) => {
    // Get enabled MCP servers
    let mcpServers: any[] = [];
    try {
      mcpServers = await ctx.runQuery(api.mcpServers.listEnabled);
    } catch (error) {
      console.error("Failed to load MCP servers:", error);
      // Continue without MCP servers if not authenticated or error occurs
    }

    // Return base tool configuration with MCP tools
    return getAvailableToolsConfig(mcpServers);
  },
});
