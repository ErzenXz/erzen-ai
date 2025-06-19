import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("apiKeys"),
      provider: v.union(
        v.literal("openai"),
        v.literal("anthropic"),
        v.literal("google"),
        v.literal("openrouter"),
        v.literal("groq"),
        v.literal("deepseek"),
        v.literal("grok"),
        v.literal("cohere"),
        v.literal("mistral"),
        v.literal("tavily"),
        v.literal("openweather"),
        v.literal("firecrawl")
      ),
      isActive: v.boolean(),
      hasKey: v.boolean(),
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const apiKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_user_provider", (q) => q.eq("userId", userId))
      .collect();

    // Return without exposing the actual API keys
    return apiKeys.map((key) => ({
      _id: key._id,
      provider: key.provider,
      isActive: key.isActive,
      hasKey: !!key.apiKey,
    }));
  },
});

export const getByProvider = query({
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
      v.literal("mistral"),
      v.literal("tavily"),
      v.literal("openweather"),
      v.literal("firecrawl")
    ),
  },
  returns: v.union(
    v.object({
      _id: v.id("apiKeys"),
      userId: v.id("users"),
      provider: v.union(
        v.literal("openai"),
        v.literal("anthropic"),
        v.literal("google"),
        v.literal("openrouter"),
        v.literal("groq"),
        v.literal("deepseek"),
        v.literal("grok"),
        v.literal("cohere"),
        v.literal("mistral"),
        v.literal("tavily"),
        v.literal("openweather"),
        v.literal("firecrawl")
      ),
      apiKey: v.string(),
      isActive: v.boolean(),
      _creationTime: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const apiKey = await ctx.db
      .query("apiKeys")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", userId).eq("provider", args.provider)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .filter((q) => q.neq(q.field("apiKey"), ""))
      .unique();

    if (!apiKey) {
      return null;
    }

    // Additional safety check - ensure apiKey is not just whitespace
    if (!apiKey.apiKey || apiKey.apiKey.trim().length === 0) {
      return null;
    }

    return apiKey;
  },
});

export const upsert = mutation({
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
      v.literal("mistral"),
      v.literal("tavily"),
      v.literal("openweather"),
      v.literal("firecrawl")
    ),
    apiKey: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("apiKeys")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", userId).eq("provider", args.provider)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        apiKey: args.apiKey,
        isActive: true,
      });
    } else {
      await ctx.db.insert("apiKeys", {
        userId,
        provider: args.provider,
        apiKey: args.apiKey,
        isActive: true,
      });
    }

    return null;
  },
});

export const remove = mutation({
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
      v.literal("mistral"),
      v.literal("tavily"),
      v.literal("openweather"),
      v.literal("firecrawl")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("apiKeys")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", userId).eq("provider", args.provider)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { apiKey: "", isActive: false });
    }

    return null;
  },
});

export const toggle = mutation({
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
      v.literal("mistral"),
      v.literal("tavily"),
      v.literal("openweather"),
      v.literal("firecrawl")
    ),
    isActive: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("apiKeys")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", userId).eq("provider", args.provider)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { isActive: args.isActive });
    }

    return null;
  },
});

export const getApiKeyInfo = query({
  args: {},
  returns: v.array(
    v.object({
      provider: v.union(
        v.literal("openai"),
        v.literal("anthropic"),
        v.literal("google"),
        v.literal("openrouter"),
        v.literal("groq"),
        v.literal("deepseek"),
        v.literal("grok"),
        v.literal("cohere"),
        v.literal("mistral"),
        v.literal("tavily"),
        v.literal("openweather"),
        v.literal("firecrawl")
      ),
      hasUserKey: v.boolean(),
      keyPreview: v.optional(v.string()),
      addedAt: v.optional(v.number()),
      isActive: v.boolean(),
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const apiKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_user_provider", (q) => q.eq("userId", userId))
      .collect();

    return apiKeys.map((key) => {
      const keyPreview = key.apiKey
        ? `${key.apiKey.substring(0, 4)}...${key.apiKey.substring(key.apiKey.length - 4)}`
        : undefined;

      return {
        provider: key.provider,
        hasUserKey: !!key.apiKey,
        keyPreview,
        addedAt: key._creationTime,
        isActive: key.isActive,
      };
    });
  },
});
