import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const instructions = await ctx.db
      .query("userInstructions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    return instructions?.instructions || "";
  },
});

export const update = mutation({
  args: {
    instructions: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Validate instructions length (max 500 words)
    const wordCount = args.instructions.trim().split(/\s+/).length;
    if (wordCount > 500) {
      throw new Error("Instructions cannot exceed 500 words");
    }

    const existing = await ctx.db
      .query("userInstructions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        instructions: args.instructions,
      });
    } else {
      await ctx.db.insert("userInstructions", {
        userId,
        instructions: args.instructions,
      });
    }
  },
});
