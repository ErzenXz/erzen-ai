import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";

export const list = query({
  args: {
    conversationId: v.id("conversations"),
    branchId: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify user owns the conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    const branchId = args.branchId || conversation.currentBranch || "main";

    // Get messages for the specific branch only - no fallback
    const branchMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_branch", (q) =>
        q.eq("conversationId", args.conversationId).eq("branchId", branchId)
      )
      .order("asc")
      .collect();

    // Paginate the results manually
    const startIndex = args.paginationOpts.cursor
      ? parseInt(args.paginationOpts.cursor)
      : 0;
    const endIndex = startIndex + args.paginationOpts.numItems;
    const page = branchMessages.slice(startIndex, endIndex);
    const hasMore = endIndex < branchMessages.length;

    return {
      page,
      isDone: !hasMore,
      continueCursor: hasMore ? endIndex.toString() : null,
    };
  },
});

export const add = mutation({
  args: {
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
    isError: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify user owns the conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    const branchId = args.branchId || conversation.currentBranch || "main";

    // Update conversation's last message time
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: Date.now(),
    });

    return await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      branchId,
      parentMessageId: args.parentMessageId,
      role: args.role,
      content: args.content,
      thinking: args.thinking,
      attachments: args.attachments,
      toolCalls: args.toolCalls,
      toolCallId: args.toolCallId,
      generationMetrics: args.generationMetrics,
      isError: args.isError,
    });
  },
});

export const update = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
    thinking: v.optional(v.string()),
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
    isError: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get the message and verify ownership through conversation
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    const conversation = await ctx.db.get(message.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Not authorized to update this message");
    }

    const update: any = { content: args.content };
    if (args.thinking !== undefined) update.thinking = args.thinking;
    if (args.toolCalls) update.toolCalls = args.toolCalls;
    if (args.generationMetrics)
      update.generationMetrics = args.generationMetrics;
    if (args.isError) update.isError = args.isError;

    await ctx.db.patch(args.messageId, update);
  },
});

export const cleanupOldToolMessages = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    // Get all tool messages for this conversation
    const toolMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .filter((q) => q.eq(q.field("role"), "tool"))
      .collect();

    // Delete tool messages that look malformed (old format)
    const deletePromises = toolMessages
      .filter(
        (msg) =>
          // Delete if content starts with "Tool output for" (old format)
          msg.content.startsWith("Tool output for") ||
          // Or if it's just the tool call ID
          msg.content.match(/^[a-zA-Z0-9]+$/) ||
          // Or if it's empty
          !msg.content.trim()
      )
      .map((msg) => ctx.db.delete(msg._id));

    await Promise.all(deletePromises);

    return { cleaned: deletePromises.length };
  },
});

export const cleanupDuplicatedContent = mutation({
  args: {
    conversationId: v.optional(v.id("conversations")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    let messages;

    if (args.conversationId) {
      // Clean up specific conversation
      const conversation = await ctx.db.get(args.conversationId);
      if (!conversation || conversation.userId !== userId) {
        throw new Error("Conversation not found");
      }

      messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", args.conversationId!)
        )
        .collect();
    } else {
      // Clean up all user's messages
      const userConversations = await ctx.db
        .query("conversations")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();

      const conversationIds = userConversations.map((c) => c._id);
      messages = [];

      for (const convId of conversationIds) {
        const convMessages = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", convId))
          .collect();
        messages.push(...convMessages);
      }
    }

    let fixedCount = 0;

    for (const message of messages) {
      if (message.content && message.content.length > 100) {
        // Check for content duplication patterns
        const content = message.content;
        const lines = content.split("\n");

        // Look for repeated blocks of text
        const cleanedLines: string[] = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();

          // Skip if we've seen this exact line recently (within last 5 lines)
          const recentLines = cleanedLines.slice(-5);
          if (!recentLines.includes(line) || line.length < 10) {
            cleanedLines.push(lines[i]); // Keep original formatting
          }
        }

        const cleanedContent = cleanedLines.join("\n").trim();

        // Only update if content actually changed and is significantly different
        if (
          cleanedContent !== content &&
          cleanedContent.length < content.length * 0.8
        ) {
          await ctx.db.patch(message._id, { content: cleanedContent });
          fixedCount++;
        }
      }
    }

    return { fixed: fixedCount };
  },
});

export const editMessage = mutation({
  args: {
    messageId: v.id("messages"),
    newContent: v.string(),
    branchTitle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get the original message
    const originalMessage = await ctx.db.get(args.messageId);
    if (!originalMessage) {
      throw new Error("Message not found");
    }

    // Verify ownership
    const conversation = await ctx.db.get(originalMessage.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Not authorized to edit this message");
    }

    // Create a new branch
    const branchId = `edit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const branchTitle =
      args.branchTitle || `Edit: ${args.newContent.slice(0, 30)}...`;

    await ctx.db.insert("conversationBranches", {
      conversationId: originalMessage.conversationId,
      branchId,
      parentBranchId: originalMessage.branchId || "main",
      branchPoint: args.messageId,
      title: branchTitle,
      createdAt: Date.now(),
      isActive: true,
    });

    // Set all other branches as inactive
    const existingBranches = await ctx.db
      .query("conversationBranches")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", originalMessage.conversationId)
      )
      .collect();

    for (const branch of existingBranches) {
      if (branch.branchId !== branchId) {
        await ctx.db.patch(branch._id, { isActive: false });
      }
    }

    // Update conversation's current branch
    await ctx.db.patch(originalMessage.conversationId, {
      currentBranch: branchId,
    });

    // Get the current branch to copy messages from
    const currentBranchId =
      originalMessage.branchId || conversation.currentBranch || "main";

    // Copy messages from the current branch only, up to the edit point
    const branchMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_branch", (q) =>
        q
          .eq("conversationId", originalMessage.conversationId)
          .eq("branchId", currentBranchId)
      )
      .collect();

    const sortedMessages = branchMessages.sort(
      (a, b) => a._creationTime - b._creationTime
    );
    const editPointIndex = sortedMessages.findIndex(
      (m) => m._id === args.messageId
    );

    if (editPointIndex === -1) {
      throw new Error("Message not found in current branch");
    }

    const messagesToCopy = sortedMessages.slice(0, editPointIndex);

    // Copy messages to new branch
    for (const message of messagesToCopy) {
      await ctx.db.insert("messages", {
        conversationId: message.conversationId,
        branchId,
        role: message.role,
        content: message.content,
        thinking: message.thinking,
        attachments: message.attachments,
        toolCalls: message.toolCalls,
        toolCallId: message.toolCallId,
        generationMetrics: message.generationMetrics,
      });
    }

    // Add the edited message to the new branch
    const editedMessageId = await ctx.db.insert("messages", {
      conversationId: originalMessage.conversationId,
      branchId,
      parentMessageId: args.messageId,
      role: originalMessage.role,
      content: args.newContent,
      attachments: originalMessage.attachments,
      isEdited: true,
      editedAt: Date.now(),
    });

    return { branchId, messageId: editedMessageId };
  },
});

export const retryMessage = mutation({
  args: {
    messageId: v.id("messages"),
    branchTitle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get the message to retry
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Verify ownership
    const conversation = await ctx.db.get(message.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Not authorized to retry this message");
    }

    // Only allow retrying assistant messages
    if (message.role !== "assistant") {
      throw new Error("Can only retry assistant messages");
    }

    // Create a new branch for the retry
    const branchId = `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const branchTitle =
      args.branchTitle || `Retry: ${message.content.slice(0, 30)}...`;

    await ctx.db.insert("conversationBranches", {
      conversationId: message.conversationId,
      branchId,
      parentBranchId: message.branchId || "main",
      branchPoint: args.messageId,
      title: branchTitle,
      createdAt: Date.now(),
      isActive: true,
    });

    // Set all other branches as inactive
    const existingBranches = await ctx.db
      .query("conversationBranches")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", message.conversationId)
      )
      .collect();

    for (const branch of existingBranches) {
      if (branch.branchId !== branchId) {
        await ctx.db.patch(branch._id, { isActive: false });
      }
    }

    // Update conversation's current branch
    await ctx.db.patch(message.conversationId, { currentBranch: branchId });

    // Get the current branch to copy messages from
    const currentBranchId =
      message.branchId || conversation.currentBranch || "main";

    // Copy messages from the current branch only, up to (but not including) the message to retry
    const branchMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_branch", (q) =>
        q
          .eq("conversationId", message.conversationId)
          .eq("branchId", currentBranchId)
      )
      .collect();

    const sortedMessages = branchMessages.sort(
      (a, b) => a._creationTime - b._creationTime
    );
    const retryPointIndex = sortedMessages.findIndex(
      (m) => m._id === args.messageId
    );

    if (retryPointIndex === -1) {
      throw new Error("Message not found in current branch");
    }

    const messagesToCopy = sortedMessages.slice(0, retryPointIndex);

    // Copy messages to new branch
    for (const msg of messagesToCopy) {
      await ctx.db.insert("messages", {
        conversationId: msg.conversationId,
        branchId,
        role: msg.role,
        content: msg.content,
        thinking: msg.thinking,
        attachments: msg.attachments,
        toolCalls: msg.toolCalls,
        toolCallId: msg.toolCallId,
        generationMetrics: msg.generationMetrics,
      });
    }

    return { branchId, needsRegeneration: true };
  },
});

export const copyMessage = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Verify ownership
    const conversation = await ctx.db.get(message.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Not authorized to copy this message");
    }

    return { content: message.content };
  },
});

// Migration function to assign existing messages to main branch
export const migrateMessagesToMainBranch = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify user owns the conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    // Find messages without branchId
    const unbrandedMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .filter((q) => q.eq(q.field("branchId"), undefined))
      .collect();

    // Ensure main branch exists
    const mainBranch = await ctx.db
      .query("conversationBranches")
      .withIndex("by_conversation_branch", (q) =>
        q.eq("conversationId", args.conversationId).eq("branchId", "main")
      )
      .unique();

    if (!mainBranch) {
      await ctx.db.insert("conversationBranches", {
        conversationId: args.conversationId,
        branchId: "main",
        title: "Main",
        createdAt: Date.now(),
        isActive: true,
      });
    }

    // Update conversation to have main as current branch if not set
    if (!conversation.currentBranch) {
      await ctx.db.patch(args.conversationId, { currentBranch: "main" });
    }

    // Assign all unbranded messages to main branch
    for (const message of unbrandedMessages) {
      await ctx.db.patch(message._id, { branchId: "main" });
    }

    return { migratedCount: unbrandedMessages.length };
  },
});
