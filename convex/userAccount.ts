import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    profilePicture: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const updateData: any = {};
    if (args.name !== undefined) {
      updateData.name = args.name;
    }
    if (args.profilePicture !== undefined) {
      updateData.image = args.profilePicture;
    }

    await ctx.db.patch(userId, updateData);
  },
});

export const deleteAllConversations = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get all user conversations
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Collect all storage IDs that need to be deleted
    const storageIdsToDelete: Array<string> = [];

    // Delete all messages for each conversation and collect storage IDs
    for (const conversation of conversations) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversation._id)
        )
        .collect();

      for (const message of messages) {
        // Collect storage IDs from attachments
        if (message.attachments) {
          for (const attachment of message.attachments) {
            if (attachment.storageId) {
              storageIdsToDelete.push(attachment.storageId);
            }
          }
        }

        await ctx.db.delete(message._id);
      }

      // Delete conversation branches
      const branches = await ctx.db
        .query("conversationBranches")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversation._id)
        )
        .collect();

      for (const branch of branches) {
        await ctx.db.delete(branch._id);
      }

      // Delete the conversation
      await ctx.db.delete(conversation._id);
    }

    // Delete all storage files
    for (const storageId of storageIdsToDelete) {
      try {
        await ctx.storage.delete(storageId as any);
      } catch (error) {
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
  },
});

export const changePassword = mutation({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Note: Password change functionality would need to be implemented
    // with the Convex auth system. This is a placeholder for the UI.
    // The actual implementation would depend on the auth provider setup.
    throw new Error("Password change functionality not yet implemented");
  },
});
