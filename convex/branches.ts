import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// Helper function to copy messages from a branch up to a specific point
async function copyMessagesFromBranch(
  ctx: any,
  conversationId: any,
  sourceBranchId: string,
  targetBranchId: string,
  upToMessageId?: any
) {
  // Get all messages from the source branch
  const branchMessages = await ctx.db
    .query("messages")
    .withIndex("by_conversation_branch", (q: any) =>
      q.eq("conversationId", conversationId).eq("branchId", sourceBranchId)
    )
    .collect();

  // Sort messages by creation time
  const sortedMessages = branchMessages.sort(
    (a: any, b: any) => a._creationTime - b._creationTime
  );

  let messagesToCopy = sortedMessages;

  // If we have a specific cutoff point, find it
  if (upToMessageId) {
    const cutoffIndex = sortedMessages.findIndex(
      (m: any) => m._id === upToMessageId
    );
    if (cutoffIndex === -1) {
      throw new Error("Cutoff message not found in source branch");
    }
    messagesToCopy = sortedMessages.slice(0, cutoffIndex);
  }

  // Copy messages to the target branch
  for (const message of messagesToCopy) {
    await ctx.db.insert("messages", {
      conversationId: message.conversationId,
      branchId: targetBranchId,
      role: message.role,
      content: message.content,
      thinking: message.thinking,
      attachments: message.attachments,
      toolCalls: message.toolCalls,
      toolCallId: message.toolCallId,
      generationMetrics: message.generationMetrics,
    });
  }

  return messagesToCopy.length;
}

// Create a new branch from a specific message
export const createBranch = mutation({
  args: {
    conversationId: v.id("conversations"),
    branchPoint: v.optional(v.id("messages")),
    title: v.string(),
    parentBranchId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get the conversation to find current branch
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    const branchId = `branch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sourceBranchId =
      args.parentBranchId || conversation.currentBranch || "main";

    // Create the branch record
    await ctx.db.insert("conversationBranches", {
      conversationId: args.conversationId,
      branchId,
      parentBranchId: sourceBranchId,
      branchPoint: args.branchPoint,
      title: args.title,
      createdAt: Date.now(),
      isActive: true,
    });

    // Set all other branches as inactive
    const existingBranches = await ctx.db
      .query("conversationBranches")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    for (const branch of existingBranches) {
      if (branch.branchId !== branchId) {
        await ctx.db.patch(branch._id, { isActive: false });
      }
    }

    // Update conversation's current branch
    await ctx.db.patch(args.conversationId, { currentBranch: branchId });

    // Copy messages from the source branch up to the branch point (if specified)
    await copyMessagesFromBranch(
      ctx,
      args.conversationId,
      sourceBranchId,
      branchId,
      args.branchPoint
    );

    return branchId;
  },
});

// Switch to a different branch
export const switchBranch = mutation({
  args: {
    conversationId: v.id("conversations"),
    branchId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Set all branches as inactive
    const branches = await ctx.db
      .query("conversationBranches")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    for (const branch of branches) {
      await ctx.db.patch(branch._id, {
        isActive: branch.branchId === args.branchId,
      });
    }

    // Update conversation's current branch
    await ctx.db.patch(args.conversationId, { currentBranch: args.branchId });

    return args.branchId;
  },
});

// Get all branches for a conversation
export const listBranches = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const branches = await ctx.db
      .query("conversationBranches")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    return branches.sort((a, b) => a.createdAt - b.createdAt);
  },
});

// Get the current active branch
export const getCurrentBranch = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return null;

    return conversation.currentBranch || "main";
  },
});

// Initialize main branch if it doesn't exist
export const initializeMainBranch = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    if (!conversation.currentBranch) {
      // Create main branch if it doesn't exist
      const mainBranchId = "main";
      await ctx.db.insert("conversationBranches", {
        conversationId: args.conversationId,
        branchId: mainBranchId,
        title: "Main",
        createdAt: Date.now(),
        isActive: true,
      });

      await ctx.db.patch(args.conversationId, { currentBranch: mainBranchId });
      return mainBranchId;
    }

    return conversation.currentBranch;
  },
});

// Create a new conversation from a branch point
export const branchOffConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
    branchPoint: v.id("messages"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get the original conversation to find current branch
    const originalConversation = await ctx.db.get(args.conversationId);
    if (!originalConversation || originalConversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    const currentBranchId = originalConversation.currentBranch || "main";

    // Create new conversation
    const newConversationId = await ctx.db.insert("conversations", {
      userId,
      title: args.title,
      lastMessageAt: Date.now(),
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

    // Get the branch point message to ensure it exists
    const branchPointMessage = await ctx.db.get(args.branchPoint);
    if (!branchPointMessage) throw new Error("Branch point message not found");

    // Only get messages from the current branch up to the branch point
    const branchMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_branch", (q) =>
        q
          .eq("conversationId", args.conversationId)
          .eq("branchId", currentBranchId)
      )
      .collect();

    // Sort messages by creation time and find messages up to branch point
    const sortedMessages = branchMessages.sort(
      (a, b) => a._creationTime - b._creationTime
    );
    const branchPointIndex = sortedMessages.findIndex(
      (m) => m._id === args.branchPoint
    );

    if (branchPointIndex === -1) {
      throw new Error("Branch point message not found in current branch");
    }

    const messagesToCopy = sortedMessages.slice(0, branchPointIndex + 1);

    // Copy messages to new conversation
    for (const message of messagesToCopy) {
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

// Delete a branch
export const deleteBranch = mutation({
  args: {
    conversationId: v.id("conversations"),
    branchId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Can't delete main branch
    if (args.branchId === "main") {
      throw new Error("Cannot delete main branch");
    }

    // Delete branch record
    const branch = await ctx.db
      .query("conversationBranches")
      .withIndex("by_conversation_branch", (q) =>
        q
          .eq("conversationId", args.conversationId)
          .eq("branchId", args.branchId)
      )
      .unique();

    if (branch) {
      await ctx.db.delete(branch._id);
    }

    // Get messages in this branch to find storage files to delete
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_branch", (q) =>
        q
          .eq("conversationId", args.conversationId)
          .eq("branchId", args.branchId)
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

    // Delete storage files
    for (const storageId of storageIdsToDelete) {
      try {
        await ctx.storage.delete(storageId as any);
      } catch (error) {
        console.warn(`Failed to delete storage file ${storageId}:`, error);
      }
    }

    // Delete file metadata records
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

    // Delete messages in this branch
    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // If this was the active branch, switch to main
    const conversation = await ctx.db.get(args.conversationId);
    if (conversation?.currentBranch === args.branchId) {
      await ctx.db.patch(args.conversationId, { currentBranch: "main" });

      // Set main branch as active
      const mainBranch = await ctx.db
        .query("conversationBranches")
        .withIndex("by_conversation_branch", (q) =>
          q.eq("conversationId", args.conversationId).eq("branchId", "main")
        )
        .unique();

      if (mainBranch) {
        await ctx.db.patch(mainBranch._id, { isActive: true });
      }
    }

    return true;
  },
});

// Get conversation messages for a specific branch in chronological order
export const getMessagesForBranch = query({
  args: {
    conversationId: v.id("conversations"),
    branchId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify user owns the conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    const branchId = args.branchId || conversation.currentBranch || "main";

    // Get messages for the specific branch only
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_branch", (q: any) =>
        q.eq("conversationId", args.conversationId).eq("branchId", branchId)
      )
      .collect();

    // Return messages sorted by creation time
    return messages.sort((a, b) => a._creationTime - b._creationTime);
  },
});

// Get branch statistics for better UI display
export const getBranchStats = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const branches = await ctx.db
      .query("conversationBranches")
      .withIndex("by_conversation", (q: any) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    const branchStats = await Promise.all(
      branches.map(async (branch) => {
        // Count messages in this branch
        const messages = await ctx.db
          .query("messages")
          .withIndex("by_conversation_branch", (q: any) =>
            q
              .eq("conversationId", args.conversationId)
              .eq("branchId", branch.branchId)
          )
          .collect();

        const messageCount = messages.length;

        // Get the latest message timestamp
        const latestMessage = messages.sort(
          (a, b) => b._creationTime - a._creationTime
        )[0];

        return {
          ...branch,
          messageCount,
          lastMessageAt: latestMessage?._creationTime || branch.createdAt,
        };
      })
    );

    return branchStats.sort((a, b) => a.createdAt - b.createdAt);
  },
});

// Test function to demonstrate proper branching/versioning behavior
export const testBranchingSystem = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    // Get all branches for this conversation
    const branches = await ctx.db
      .query("conversationBranches")
      .withIndex("by_conversation", (q: any) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    // For each branch, get its message count and structure
    const branchAnalysis = await Promise.all(
      branches.map(async (branch) => {
        const messages = await ctx.db
          .query("messages")
          .withIndex("by_conversation_branch", (q: any) =>
            q
              .eq("conversationId", args.conversationId)
              .eq("branchId", branch.branchId)
          )
          .collect();

        const sortedMessages = messages.sort(
          (a, b) => a._creationTime - b._creationTime
        );

        return {
          branchId: branch.branchId,
          title: branch.title,
          parentBranchId: branch.parentBranchId,
          branchPoint: branch.branchPoint,
          isActive: branch.isActive,
          messageCount: messages.length,
          messageIds: sortedMessages.map((m) => m._id),
          createdAt: branch.createdAt,
        };
      })
    );

    return {
      conversationId: args.conversationId,
      currentBranch: conversation.currentBranch,
      totalBranches: branches.length,
      branchAnalysis: branchAnalysis.sort((a, b) => a.createdAt - b.createdAt),
    };
  },
});
