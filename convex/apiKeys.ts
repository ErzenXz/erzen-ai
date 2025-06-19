import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Simple encryption utilities using environment variables
const ENCRYPTION_KEY =
  process.env.API_KEY_ENCRYPTION_SECRET || "default-key-for-dev";

function encryptApiKey(apiKey: string): string {
  if (!apiKey) return "";

  // Simple XOR encryption with base64 encoding
  // This works in the Convex environment without Node.js Buffer
  const keyBytes = new TextEncoder().encode(apiKey);
  const encryptedBytes = new Uint8Array(keyBytes.length);

  for (let i = 0; i < keyBytes.length; i++) {
    encryptedBytes[i] =
      keyBytes[i] ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
  }

  // Convert to base64 without using Buffer
  const encrypted = btoa(String.fromCharCode(...encryptedBytes));
  return encrypted;
}

function decryptApiKey(encryptedKey: string): string {
  if (!encryptedKey) return "";

  try {
    // Decrypt the XOR-encrypted data
    // Convert from base64 without using Buffer
    const encryptedBytes = new Uint8Array(
      atob(encryptedKey)
        .split("")
        .map((c) => c.charCodeAt(0))
    );

    const decryptedBytes = new Uint8Array(encryptedBytes.length);

    for (let i = 0; i < encryptedBytes.length; i++) {
      decryptedBytes[i] =
        encryptedBytes[i] ^
        ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
    }

    const decrypted = new TextDecoder().decode(decryptedBytes);

    return decrypted;
  } catch (error) {
    return "";
  }
}

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
      .unique();

    if (!apiKey) {
      return null;
    }

    // Decrypt the API key before returning
    const decryptedKey = decryptApiKey(apiKey.apiKey);

    return {
      ...apiKey,
      apiKey: decryptedKey,
    };
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

    // Encrypt the API key before storing
    const encryptedApiKey = encryptApiKey(args.apiKey);

    const existing = await ctx.db
      .query("apiKeys")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", userId).eq("provider", args.provider)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        apiKey: encryptedApiKey,
        isActive: true,
      });
    } else {
      await ctx.db.insert("apiKeys", {
        userId,
        provider: args.provider,
        apiKey: encryptedApiKey,
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
      await ctx.db.delete(existing._id);
    }

    return null;
  },
});

// Migration function to encrypt existing unencrypted API keys
export const migrateUnencryptedKeys = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const allKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_user_provider", (q) => q.eq("userId", userId))
      .collect();

    let migratedCount = 0;

    for (const key of allKeys) {
      // Try to decrypt the key - if it fails, it's likely unencrypted
      const decrypted = decryptApiKey(key.apiKey);

      // Check if the decrypted key looks valid (contains common API key patterns)
      const looksLikeValidKey =
        decrypted &&
        (decrypted.startsWith("sk-") || // OpenAI
          decrypted.startsWith("sk-ant-") || // Anthropic
          decrypted.startsWith("AIza") || // Google
          decrypted.startsWith("sk-or-") || // OpenRouter
          decrypted.startsWith("gsk_") || // Groq
          decrypted.startsWith("tvly-") || // Tavily
          decrypted.startsWith("xai-") || // Grok
          decrypted.startsWith("co_") || // Cohere
          decrypted.length > 20); // General check for API key length

      // If decrypt failed or result doesn't look like a key, assume it's unencrypted
      if (!looksLikeValidKey && key.apiKey.length > 0) {
        // Re-encrypt the existing key
        const reencrypted = encryptApiKey(key.apiKey);
        await ctx.db.patch(key._id, {
          apiKey: reencrypted,
        });
        migratedCount++;
      }
    }

    return migratedCount;
  },
});

// New query to get enhanced API key information for the settings UI
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
      const decryptedKey = decryptApiKey(key.apiKey);
      const keyPreview = decryptedKey
        ? `${decryptedKey.substring(0, 8)}...${decryptedKey.substring(decryptedKey.length - 4)}`
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
