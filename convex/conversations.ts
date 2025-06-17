import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";
import { paginationOptsValidator } from "convex/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    // Sort to show pinned conversations first, then by lastMessageAt
    return conversations.sort((a, b) => {
      // First sort by pinned status (pinned first)
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      // Then sort by lastMessageAt (newest first)
      return b.lastMessageAt - a.lastMessageAt;
    });
  },
});

export const get = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    return conversation;
  },
});

export const create = mutation({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Use a single transaction to create both conversation and main branch
    const conversationId = await ctx.db.insert("conversations", {
      userId,
      title: args.title,
      lastMessageAt: Date.now(),
      currentBranch: "main",
    });

    // Create the main branch in the same transaction
    await ctx.db.insert("conversationBranches", {
      conversationId,
      branchId: "main",
      title: "Main",
      createdAt: Date.now(),
      isActive: true,
    });

    return conversationId;
  },
});

// Optimized mutation to create conversation and add first message in single operation
export const createWithFirstMessage = mutation({
  args: {
    title: v.string(),
    content: v.string(),
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
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();

    // Create conversation and main branch in a single transaction
    const conversationId = await ctx.db.insert("conversations", {
      userId,
      title: args.title,
      lastMessageAt: now,
      currentBranch: "main",
    });

    await ctx.db.insert("conversationBranches", {
      conversationId,
      branchId: "main",
      title: "Main",
      createdAt: now,
      isActive: true,
    });

    // Add the first user message immediately
    const messageId = await ctx.db.insert("messages", {
      conversationId,
      branchId: "main",
      role: "user",
      content: args.content,
      attachments: args.attachments,
    });

    return { conversationId, messageId };
  },
});

export const updateTitle = mutation({
  args: {
    conversationId: v.id("conversations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    await ctx.db.patch(args.conversationId, {
      title: args.title,
    });
  },
});

export const remove = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    // Get all messages in the conversation to find storage files to delete
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    // Collect all storage IDs that need to be deleted
    const storageIdsToDelete: Array<string> = [];

    for (const message of messages) {
      if (message.attachments) {
        for (const attachment of message.attachments) {
          if (attachment.storageId) {
            storageIdsToDelete.push(attachment.storageId);
          }
        }
      }
    }

    // Delete all storage files
    for (const storageId of storageIdsToDelete) {
      try {
        await ctx.storage.delete(storageId as any);
      } catch (error) {
        // Log error but don't fail the deletion - file might already be gone
        console.warn(`Failed to delete storage file ${storageId}:`, error);
      }
    }

    // Delete all file metadata records associated with these storage IDs
    for (const storageId of storageIdsToDelete) {
      try {
        const fileRecord = await ctx.db
          .query("uploadedFiles")
          .withIndex("by_storage_id", (q) =>
            q.eq("storageId", storageId as any)
          )
          .unique();

        if (fileRecord) {
          await ctx.db.delete(fileRecord._id);
        }
      } catch (error) {
        console.warn(`Failed to delete file metadata for ${storageId}:`, error);
      }
    }

    // Delete all conversation branches
    const branches = await ctx.db
      .query("conversationBranches")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    for (const branch of branches) {
      await ctx.db.delete(branch._id);
    }

    // Delete all messages in the conversation
    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Delete the conversation
    await ctx.db.delete(args.conversationId);
  },
});

export const duplicate = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const originalConversation = await ctx.db.get(args.conversationId);
    if (!originalConversation || originalConversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    const newConversationId = await ctx.db.insert("conversations", {
      userId,
      title: `Copy of ${originalConversation.title}`,
      lastMessageAt: originalConversation.lastMessageAt,
      currentBranch: "main",
    });

    // Create main branch for new conversation
    await ctx.db.insert("conversationBranches", {
      conversationId: newConversationId,
      branchId: "main",
      title: "Main",
      createdAt: Date.now(),
      isActive: true,
    });

    // Get the current active branch from original conversation
    const currentBranchId = originalConversation.currentBranch || "main";

    // Only copy messages from the current active branch
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_branch", (q) =>
        q
          .eq("conversationId", args.conversationId)
          .eq("branchId", currentBranchId)
      )
      .order("asc")
      .collect();

    for (const message of messages) {
      await ctx.db.insert("messages", {
        conversationId: newConversationId,
        branchId: "main",
        role: message.role,
        content: message.content,
        thinking: message.thinking,
        attachments: message.attachments,
        toolCalls: message.toolCalls,
        toolCallId: message.toolCallId,
        generationMetrics: message.generationMetrics,
      });
    }

    return newConversationId;
  },
});

export const listWithMessageCounts = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const result = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate(args.paginationOpts);

    // Get message counts for each conversation and filter those with > 1 message
    const conversationsWithCounts = await Promise.all(
      result.page.map(async (conversation) => {
        // Count messages from the current active branch
        const currentBranchId = conversation.currentBranch || "main";
        const messageCount = await ctx.db
          .query("messages")
          .withIndex("by_conversation_branch", (q) =>
            q
              .eq("conversationId", conversation._id)
              .eq("branchId", currentBranchId)
          )
          .collect()
          .then((messages) => messages.length);

        return {
          ...conversation,
          messageCount,
        };
      })
    );

    // Only return conversations with more than 1 message
    const filteredConversations = conversationsWithCounts.filter(
      (conv) => conv.messageCount > 1
    );

    // Sort to show pinned conversations first, then by lastMessageAt
    const sortedConversations = filteredConversations.sort((a, b) => {
      // First sort by pinned status (pinned first)
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      // Then sort by lastMessageAt (newest first)
      return b.lastMessageAt - a.lastMessageAt;
    });

    return {
      ...result,
      page: sortedConversations,
    };
  },
});

export const generateTitle = action({
  args: {
    conversationId: v.id("conversations"),
    firstUserMessage: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.runQuery(api.conversations.get, {
      conversationId: args.conversationId,
    });
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    // Build context for title generation.
    // If caller supplied a firstUserMessage we use it, otherwise we synthesise
    // a context string from up to the first message plus the most recent few messages.

    let contextText = "";

    if (args.firstUserMessage) {
      contextText = args.firstUserMessage;
    } else {
      // Fetch messages via query since actions cannot access the database directly.
      const messagesResult = await ctx.runQuery(api.messages.list, {
        conversationId: args.conversationId,
        paginationOpts: { numItems: 100, cursor: null },
      });

      const allMessages = messagesResult.page;

      if (allMessages.length > 0) {
        const firstMsg: string = allMessages[0].content;
        const recentMsgs: string[] = allMessages
          .slice(-5)
          .map((m: any) => m.content);
        contextText = [firstMsg, ...recentMsgs].join(" \n\n");
      }
    }

    // Ensure we don't send an excessively long prompt.
    const truncatedContext = contextText.split(" ").slice(0, 500).join(" ");

    // Generate title using AI
    try {
      const titleResponse: string = await ctx.runAction(api.ai.generateTitle, {
        userMessage: truncatedContext,
      });

      // Update the conversation title
      await ctx.runMutation(api.conversations.updateTitle, {
        conversationId: args.conversationId,
        title: titleResponse || "New Chat",
      });

      return titleResponse || "New Chat";
    } catch (error) {
      console.error("Failed to generate AI title:", error);

      // Fallback to simple title generation
      let fallbackTitle = truncatedContext
        .slice(0, 40)
        .split(" ")
        .slice(0, 6)
        .join(" ");

      if (truncatedContext.length > 40) {
        fallbackTitle += "...";
      }

      await ctx.runMutation(api.conversations.updateTitle, {
        conversationId: args.conversationId,
        title: fallbackTitle || "New Chat",
      });

      return fallbackTitle || "New Chat";
    }
  },
});

export const cancelGeneration = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    await ctx.db.patch(args.conversationId, {
      isGenerationCancelled: true,
    });
  },
});

export const checkCancellation = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    return conversation?.isGenerationCancelled === true;
  },
});

export const clearCancellation = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    await ctx.db.patch(args.conversationId, {
      isGenerationCancelled: false,
      isGenerating: false,
      generatingMessageId: undefined,
    });
  },
});

export const setGenerationState = mutation({
  args: {
    conversationId: v.id("conversations"),
    isGenerating: v.boolean(),
    messageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    await ctx.db.patch(args.conversationId, {
      isGenerating: args.isGenerating,
      generatingMessageId: args.messageId,
    });
  },
});

export const checkGenerationState = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    return {
      isGenerating: conversation?.isGenerating === true,
      messageId: conversation?.generatingMessageId,
    };
  },
});

// ============ PINNING FUNCTIONALITY ============

export const togglePin = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    await ctx.db.patch(args.conversationId, {
      isPinned: !conversation.isPinned,
    });

    return !conversation.isPinned;
  },
});

export const pinConversation = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    await ctx.db.patch(args.conversationId, {
      isPinned: true,
    });
  },
});

export const unpinConversation = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    await ctx.db.patch(args.conversationId, {
      isPinned: false,
    });
  },
});

// ============ SHARING FUNCTIONALITY ============

export const shareConversation = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    // Generate a unique share ID
    const shareId = `share_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

    await ctx.db.patch(args.conversationId, {
      shareId,
      isShared: true,
      sharedAt: Date.now(),
    });

    return shareId;
  },
});

export const unshareConversation = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    await ctx.db.patch(args.conversationId, {
      shareId: undefined,
      isShared: false,
      sharedAt: undefined,
    });
  },
});

export const getSharedConversation = query({
  args: { shareId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("conversations"),
      title: v.string(),
      lastMessageAt: v.number(),
      shareId: v.optional(v.string()),
      isShared: v.optional(v.boolean()),
      sharedAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // No authentication required for public shared conversations
    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_share_id", (q) => q.eq("shareId", args.shareId))
      .unique();

    if (!conversation || !conversation.isShared) {
      return null; // Return null if not found or not shared
    }

    // Return only safe public fields
    return {
      _id: conversation._id,
      title: conversation.title,
      lastMessageAt: conversation.lastMessageAt,
      shareId: conversation.shareId,
      isShared: conversation.isShared,
      sharedAt: conversation.sharedAt,
    };
  },
});

export const getSharedMessages = query({
  args: {
    shareId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(
      v.object({
        _id: v.id("messages"),
        _creationTime: v.number(),
        role: v.union(
          v.literal("user"),
          v.literal("assistant"),
          v.literal("system"),
          v.literal("tool")
        ),
        content: v.string(),
        thinking: v.optional(v.string()),
        attachments: v.optional(v.array(v.any())),
        toolCalls: v.optional(v.array(v.any())),
        generationMetrics: v.optional(v.any()),
      })
    ),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    // No authentication required for public shared conversations
    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_share_id", (q) => q.eq("shareId", args.shareId))
      .unique();

    if (!conversation || !conversation.isShared) {
      throw new Error("Shared conversation not found");
    }

    const currentBranchId = conversation.currentBranch || "main";

    const result = await ctx.db
      .query("messages")
      .withIndex("by_conversation_branch", (q) =>
        q.eq("conversationId", conversation._id).eq("branchId", currentBranchId)
      )
      .order("asc")
      .paginate(args.paginationOpts);

    // Return only safe public fields from messages
    return {
      isDone: result.isDone,
      continueCursor: result.continueCursor,
      page: result.page.map((msg) => ({
        _id: msg._id,
        _creationTime: msg._creationTime,
        role: msg.role,
        content: msg.content,
        thinking: msg.thinking,
        attachments: msg.attachments,
        toolCalls: msg.toolCalls,
        generationMetrics: msg.generationMetrics,
      })),
    };
  },
});

// ============ EXPORT/IMPORT FUNCTIONALITY ============

export const exportConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    // Get all branches for this conversation
    const branches = await ctx.db
      .query("conversationBranches")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    // Get all messages for this conversation
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    return {
      version: "1.0",
      exportedAt: Date.now(),
      conversation: {
        title: conversation.title,
        lastMessageAt: conversation.lastMessageAt,
        currentBranch: conversation.currentBranch,
      },
      branches,
      messages: messages.map((msg) => ({
        ...msg,
        conversationId: undefined, // Remove to avoid ID conflicts on import
      })),
    };
  },
});

export const markExported = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    await ctx.db.patch(args.conversationId, {
      exportedAt: Date.now(),
    });
  },
});

export const importConversation = mutation({
  args: {
    exportData: v.object({
      version: v.string(),
      exportedAt: v.number(),
      conversation: v.object({
        title: v.string(),
        lastMessageAt: v.number(),
        currentBranch: v.optional(v.string()),
      }),
      branches: v.array(v.any()),
      messages: v.array(v.any()),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Validate export data version
    if (args.exportData.version !== "1.0") {
      throw new Error("Unsupported export data version");
    }

    // Create new conversation
    const conversationId = await ctx.db.insert("conversations", {
      userId,
      title: `${args.exportData.conversation.title} (Imported)`,
      lastMessageAt: args.exportData.conversation.lastMessageAt,
      currentBranch: args.exportData.conversation.currentBranch || "main",
    });

    // Import branches (first pass - without branchPoint references)
    const branchIdMap = new Map<string, string>();
    for (const branch of args.exportData.branches) {
      const newBranchId = await ctx.db.insert("conversationBranches", {
        conversationId,
        branchId: branch.branchId,
        parentBranchId: branch.parentBranchId,
        branchPoint: undefined, // Will be updated after messages are imported
        title: branch.title,
        createdAt: branch.createdAt,
        isActive: branch.isActive,
      });
      branchIdMap.set(branch._id, newBranchId);
    }

    // Import messages
    const messageIdMap = new Map<string, string>();
    for (const message of args.exportData.messages) {
      const newMessageId = await ctx.db.insert("messages", {
        conversationId,
        branchId: message.branchId,
        parentMessageId: message.parentMessageId
          ? (messageIdMap.get(message.parentMessageId) as any)
          : undefined,
        role: message.role,
        content: message.content,
        thinking: message.thinking,
        attachments: message.attachments,
        toolCalls: message.toolCalls,
        toolCallId: message.toolCallId,
        generationMetrics: message.generationMetrics,
        isEdited: message.isEdited,
        editedAt: message.editedAt,
        isError: message.isError,
      });
      messageIdMap.set(message._id, newMessageId);
    }

    return conversationId;
  },
});

export const bulkExportConversations = query({
  args: { conversationIds: v.array(v.id("conversations")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const exports = [];
    for (const conversationId of args.conversationIds) {
      const conversation = await ctx.db.get(conversationId);
      if (!conversation || conversation.userId !== userId) {
        continue; // Skip conversations user doesn't own
      }

      // Get branches and messages for this conversation
      const branches = await ctx.db
        .query("conversationBranches")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversationId)
        )
        .collect();

      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversationId)
        )
        .collect();

      exports.push({
        version: "1.0",
        exportedAt: Date.now(),
        conversation: {
          title: conversation.title,
          lastMessageAt: conversation.lastMessageAt,
          currentBranch: conversation.currentBranch,
        },
        branches,
        messages: messages.map((msg) => ({
          ...msg,
          conversationId: undefined,
        })),
      });
    }

    return {
      version: "1.0",
      exportedAt: Date.now(),
      conversations: exports,
    };
  },
});
