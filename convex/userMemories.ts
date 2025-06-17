import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db
      .query("userMemories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const add = mutation({
  args: {
    memory: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db.insert("userMemories", {
      userId,
      memory: args.memory,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("userMemories"),
    memory: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const memory = await ctx.db.get(args.id);
    if (!memory || memory.userId !== userId) {
      throw new Error("Memory not found or access denied");
    }

    await ctx.db.patch(args.id, {
      memory: args.memory,
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("userMemories"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const memory = await ctx.db.get(args.id);
    if (!memory || memory.userId !== userId) {
      throw new Error("Memory not found or access denied");
    }

    await ctx.db.delete(args.id);
  },
});

export const removeAll = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const memories = await ctx.db
      .query("userMemories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const memory of memories) {
      await ctx.db.delete(memory._id);
    }
  },
});
