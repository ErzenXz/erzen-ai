"use node";

import { tool } from "ai";
import { z } from "zod";
import { performTavilySearch } from "../utils/search";
import { api } from "../../_generated/api";

export function createWebSearchTool(ctx: any, usingUserKey: boolean) {
  return tool({
    description:
      "Search the web for current, real-time information. Use ONLY when you need recent news, current events, live data, or information that changes frequently (like prices, weather, stock prices, recent developments). Do NOT use for general knowledge questions, explanations, jokes, creative tasks, or information you already know.",
    parameters: z.object({
      query: z
        .string()
        .describe("The search query for current/real-time information"),
    }),
    execute: async ({ query }): Promise<string> => {
      return await performTavilySearch(ctx, query, "basic", !usingUserKey);
    },
  });
}

export function createDeepSearchTool(ctx: any, usingUserKey: boolean) {
  return tool({
    description:
      "Perform comprehensive research with multiple search queries for thorough investigation of current topics. Use ONLY for complex research tasks requiring current information from multiple angles. This is expensive (3x message cost) - use sparingly and only when basic web search isn't sufficient. NOT for general knowledge or simple questions.",
    parameters: z.object({
      query: z
        .string()
        .describe("The main research topic requiring current information"),
      related_queries: z
        .array(z.string())
        .optional()
        .describe(
          "Additional specific research angles for comprehensive coverage"
        ),
    }),
    execute: async ({ query, related_queries = [] }): Promise<string> => {
      // Only increment search usage if using built-in keys
      if (!usingUserKey) {
        // Deep search uses additional search quota
        await ctx.runMutation(api.usage.incrementSearches);
        await ctx.runMutation(api.usage.incrementSearches);
      }

      const allQueries = [query, ...related_queries.slice(0, 3)]; // Limit to 4 total queries
      const searchPromises = allQueries.map((q) =>
        performTavilySearch(ctx, q, "advanced", !usingUserKey)
      );
      const results = await Promise.all(searchPromises);

      let combinedResults = `Deep search results for "${query}":\n\n`;
      results.forEach((result, index) => {
        combinedResults += `=== Results for "${allQueries[index]}" ===\n${result}\n\n`;
      });

      return combinedResults;
    },
  });
}
