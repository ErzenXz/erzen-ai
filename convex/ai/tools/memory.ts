"use node";

import { tool } from "ai";
import { z } from "zod";
import { api } from "../../_generated/api";

export function createMemoryTool(ctx: any) {
  return tool({
    description:
      "Store or retrieve important information from long-term conversation memory. Use ONLY to remember user preferences, important personal details, ongoing projects, or context that should persist across conversations. Do NOT use for temporary information or things that don't need to be remembered long-term.",
    parameters: z.object({
      action: z
        .enum(["store", "retrieve"])
        .describe(
          "Whether to store important information or retrieve previously stored information"
        ),
      key: z
        .string()
        .describe(
          "The topic/category of information to store or retrieve (e.g., 'preferences', 'project_status', 'personal_info')"
        ),
      value: z
        .string()
        .optional()
        .describe(
          "The important information to store for future conversations (required for store action)"
        ),
    }),
    execute: async ({ action, key, value }): Promise<string> => {
      if (action === "store" && key && value) {
        await ctx.runMutation(api.userMemories.add, {
          memory: `${key}: ${value}`,
        });
        return `Stored information for future reference - "${key}": ${value}`;
      } else if (action === "retrieve" && key) {
        try {
          const memories = await ctx.runQuery(api.userMemories.list);
          const memory = memories.find((m: any) =>
            m.memory.startsWith(`${key}:`)
          );
          return memory
            ? `Retrieved stored information for "${key}": ${memory.memory.substring(key.length + 2)}`
            : `No stored information found for "${key}"`;
        } catch {
          return `No stored information found for "${key}"`;
        }
      }
      return "Invalid memory operation - specify 'store' or 'retrieve' action with appropriate parameters";
    },
  });
}
