"use node";

import { api } from "../../_generated/api";

// Helper function to perform Tavily search
export async function performTavilySearch(
  ctx: any,
  query: string,
  searchDepth: "basic" | "advanced" = "basic",
  shouldCountUsage: boolean = true
): Promise<string> {
  try {
    const apiKeyRecord = await ctx.runQuery(api.apiKeys.getByProvider, {
      provider: "tavily",
    });

    let apiKey = "";
    let usingUserKey = false;

    // PRIORITIZE USER'S API KEY FIRST
    if (apiKeyRecord?.apiKey && apiKeyRecord.apiKey.trim().length > 0) {
      apiKey = apiKeyRecord.apiKey.trim();
      usingUserKey = true;
    } else {
      // Use built-in Tavily key as fallback
      apiKey = process.env.TAVILY_API_KEY || "";
    }

    if (!apiKey) {
      return `Search results for "${query}": This is a simulated search result. Configure your Tavily API key in settings for real web search.`;
    }

    // Only count usage if using built-in key
    if (!usingUserKey && shouldCountUsage) {
      const usage = await ctx.runQuery(api.usage.get);
      const limits = await ctx.runQuery(api.usage.getLimits);

      if (usage && usage.searchesUsed >= limits.searches) {
        return `Search limit reached (${limits.searches}). Add your own Tavily API key in settings for unlimited searches.`;
      }

      await ctx.runMutation(api.usage.incrementSearches);
    }

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: searchDepth,
        include_answer: true,
        include_images: false,
        include_raw_content: searchDepth === "advanced",
        max_results: searchDepth === "advanced" ? 8 : 5,
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const results = data.results
        .map(
          (result: any) => `${result.title}: ${result.content} (${result.url})`
        )
        .join("\n\n");

      return `Search results for "${query}":\n\n${results}${data.answer ? `\n\nSummary: ${data.answer}` : ""}`;
    }

    return `No results found for "${query}"`;
  } catch (error) {
    return `Search failed for "${query}": ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}
