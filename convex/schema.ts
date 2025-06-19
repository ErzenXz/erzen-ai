import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  conversations: defineTable({
    userId: v.id("users"),
    title: v.string(),
    lastMessageAt: v.number(),
    currentBranch: v.optional(v.string()),
    isGenerationCancelled: v.optional(v.boolean()),
    isGenerating: v.optional(v.boolean()),
    generatingMessageId: v.optional(v.id("messages")),
    isPinned: v.optional(v.boolean()),
    shareId: v.optional(v.string()),
    isShared: v.optional(v.boolean()),
    sharedAt: v.optional(v.number()),
    exportedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_share_id", ["shareId"])
    .index("by_user_pinned", ["userId", "isPinned"]),

  conversationBranches: defineTable({
    conversationId: v.id("conversations"),
    branchId: v.string(),
    parentBranchId: v.optional(v.string()),
    branchPoint: v.optional(v.id("messages")),
    title: v.string(),
    createdAt: v.number(),
    isActive: v.boolean(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_branch", ["conversationId", "branchId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    branchId: v.optional(v.string()),
    parentMessageId: v.optional(v.id("messages")),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system"),
      v.literal("tool")
    ),
    content: v.string(),
    thinking: v.optional(v.string()),
    attachments: v.optional(
      v.array(
        v.object({
          type: v.union(
            v.literal("image"),
            v.literal("file"),
            v.literal("audio"),
            v.literal("video")
          ),
          url: v.string(),
          name: v.string(),
          size: v.optional(v.number()),
          storageId: v.optional(v.id("_storage")),
          extractedText: v.optional(v.string()),
          mimeType: v.optional(v.string()),
        })
      )
    ),
    toolCalls: v.optional(
      v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          arguments: v.string(),
          result: v.optional(v.string()),
        })
      )
    ),
    toolCallId: v.optional(v.string()),
    generationMetrics: v.optional(
      v.object({
        provider: v.string(),
        model: v.string(),
        tokensUsed: v.optional(v.number()),
        promptTokens: v.optional(v.number()),
        completionTokens: v.optional(v.number()),
        generationTimeMs: v.optional(v.number()),
        tokensPerSecond: v.optional(v.number()),
        temperature: v.optional(v.number()),
        maxTokens: v.optional(v.number()),
      })
    ),
    isEdited: v.optional(v.boolean()),
    editedAt: v.optional(v.number()),
    isError: v.optional(v.boolean()),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_branch", ["conversationId", "branchId"])
    .index("by_parent", ["parentMessageId"]),

  uploadedFiles: defineTable({
    userId: v.id("users"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    extractedText: v.optional(v.string()),
    uploadedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_storage_id", ["storageId"]),

  userPreferences: defineTable({
    userId: v.id("users"),
    aiProvider: v.union(
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
    model: v.string(),
    temperature: v.number(),
    maxTokens: v.optional(v.number()),
    enabledTools: v.optional(v.array(v.string())),
    previousEnabledTools: v.optional(v.array(v.string())),
    favoriteModels: v.optional(
      v.array(
        v.object({
          provider: v.string(),
          model: v.string(),
        })
      )
    ),
    modelReasoningEfforts: v.optional(
      v.record(v.string(), v.union(v.string(), v.number()))
    ),
    reasoningEffort: v.optional(v.union(v.string(), v.number())),
    hideUserInfo: v.optional(v.boolean()),
    showToolOutputs: v.optional(v.boolean()),
    showMessageMetadata: v.optional(v.boolean()),
    systemPrompt: v.optional(v.string()),
    useCustomSystemPrompt: v.optional(v.boolean()),
    showThinking: v.optional(v.boolean()),
    imageModel: v.optional(v.string()),
    theme: v.optional(
      v.union(v.literal("light"), v.literal("dark"), v.literal("system"))
    ),
    colorTheme: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  apiKeys: defineTable({
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
  }).index("by_user_provider", ["userId", "provider"]),

  userUsage: defineTable({
    userId: v.id("users"),
    plan: v.union(v.literal("free"), v.literal("pro"), v.literal("ultra")),
    creditsUsed: v.number(),
    creditsLimit: v.number(),
    maxSpendingDollars: v.number(),
    dollarsSpent: v.number(),
    searchesUsed: v.number(),
    resetDate: v.number(),
  }).index("by_user", ["userId"]),

  userInstructions: defineTable({
    userId: v.id("users"),
    instructions: v.string(),
  }).index("by_user", ["userId"]),

  userMemories: defineTable({
    userId: v.id("users"),
    memory: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
