import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";

// List user's MCP servers
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db
      .query("mcpServers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

// Get enabled MCP servers
export const listEnabled = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db
      .query("mcpServers")
      .withIndex("by_user_enabled", (q) =>
        q.eq("userId", userId).eq("isEnabled", true)
      )
      .collect();
  },
});

// Add a new MCP server
export const add = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    transportType: v.union(
      v.literal("stdio"),
      v.literal("sse"),
      v.literal("http")
    ),
    command: v.optional(v.string()),
    args: v.optional(v.array(v.string())),
    url: v.optional(v.string()),
    headers: v.optional(v.record(v.string(), v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Validate transport-specific fields
    if (args.transportType === "stdio") {
      if (!args.command) {
        throw new Error("Command is required for stdio transport");
      }
    } else if (args.transportType === "sse" || args.transportType === "http") {
      if (!args.url) {
        throw new Error("URL is required for SSE/HTTP transport");
      }
    }

    return await ctx.db.insert("mcpServers", {
      userId,
      name: args.name,
      description: args.description,
      transportType: args.transportType,
      command: args.command,
      args: args.args,
      url: args.url,
      headers: args.headers,
      isEnabled: true,
      createdAt: Date.now(),
    });
  },
});

// Update an MCP server
export const update = mutation({
  args: {
    id: v.id("mcpServers"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    transportType: v.optional(
      v.union(v.literal("stdio"), v.literal("sse"), v.literal("http"))
    ),
    command: v.optional(v.string()),
    args: v.optional(v.array(v.string())),
    url: v.optional(v.string()),
    headers: v.optional(v.record(v.string(), v.string())),
    isEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const server = await ctx.db.get(args.id);
    if (!server || server.userId !== userId) {
      throw new Error("MCP server not found or access denied");
    }

    const updates: any = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.transportType !== undefined)
      updates.transportType = args.transportType;
    if (args.command !== undefined) updates.command = args.command;
    if (args.args !== undefined) updates.args = args.args;
    if (args.url !== undefined) updates.url = args.url;
    if (args.headers !== undefined) updates.headers = args.headers;
    if (args.isEnabled !== undefined) updates.isEnabled = args.isEnabled;

    return await ctx.db.patch(args.id, updates);
  },
});

// Delete an MCP server
export const remove = mutation({
  args: {
    id: v.id("mcpServers"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const server = await ctx.db.get(args.id);
    if (!server || server.userId !== userId) {
      throw new Error("MCP server not found or access denied");
    }

    await ctx.db.delete(args.id);
  },
});

// Toggle server enabled state
export const toggle = mutation({
  args: {
    id: v.id("mcpServers"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const server = await ctx.db.get(args.id);
    if (!server || server.userId !== userId) {
      throw new Error("MCP server not found or access denied");
    }

    await ctx.db.patch(args.id, {
      isEnabled: !server.isEnabled,
      lastUsed: server.isEnabled ? undefined : Date.now(),
    });
  },
});

// Update server's available tools cache
export const updateToolsCache = mutation({
  args: {
    id: v.id("mcpServers"),
    availableTools: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const server = await ctx.db.get(args.id);
    if (!server || server.userId !== userId) {
      throw new Error("MCP server not found or access denied");
    }

    await ctx.db.patch(args.id, {
      availableTools: args.availableTools,
      toolsLastUpdated: Date.now(),
    });
  },
});
