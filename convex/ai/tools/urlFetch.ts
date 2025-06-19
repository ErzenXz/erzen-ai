import { tool } from "ai";
import { z } from "zod";
import { browseUrl } from "../utils/browse";
import { api } from "../../_generated/api";

export function createUrlFetchTool(ctx: any) {
  return tool({
    description:
      "Fetch and analyze content from web URLs using Firecrawl. Use ONLY when users provide specific URLs they want analyzed, or when you need to access content from a particular webpage for research. Do NOT use for general web searches (use web_search instead) or for information you can provide directly. Requires Firecrawl API key to be configured.",
    parameters: z.object({
      url: z
        .string()
        .describe("The specific URL to fetch and analyze content from"),
      analysis_type: z
        .enum(["content", "summary", "extract", "metadata"])
        .optional()
        .describe(
          "How to process the content: full content, summary, extract key information, or just metadata"
        ),
    }),
    execute: async ({ url, analysis_type = "content" }): Promise<string> => {
      // Get Firecrawl API key from the context
      const apiKeyRecord = await ctx.runQuery(api.apiKeys.getByProvider, {
        provider: "firecrawl",
      });

      let apiKey = "";
      let usingUserKey = false;

      // PRIORITIZE USER'S API KEY FIRST
      if (apiKeyRecord?.apiKey && apiKeyRecord.apiKey.trim().length > 0) {
        apiKey = apiKeyRecord.apiKey.trim();
        usingUserKey = true;
      } else {
        // Use built-in Firecrawl key as fallback
        apiKey = process.env.FIRECRAWL_API_KEY || "";
      }

      if (!apiKey) {
        return `Error: Firecrawl API key not configured. Please add your Firecrawl API key in settings to use URL fetching, or set FIRECRAWL_API_KEY environment variable.`;
      }

      return await browseUrl(url, analysis_type, apiKey);
    },
  });
}
