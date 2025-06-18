import { tool } from "ai";
import { z } from "zod";
import { browseUrl } from "../utils/browse";

export function createUrlFetchTool(ctx: any) {
  return tool({
    description:
      "Fetch and analyze content from web URLs. Use ONLY when users provide specific URLs they want analyzed, or when you need to access content from a particular webpage for research. Do NOT use for general web searches (use web_search instead) or for information you can provide directly.",
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
      return await browseUrl(url, analysis_type);
    },
  });
}
