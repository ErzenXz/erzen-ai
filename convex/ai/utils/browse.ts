"use node";

export async function browseUrl(
  url: string,
  analysisType: string = "content"
): Promise<string> {
  try {
    // Validate URL format
    try {
      new URL(url);
    } catch {
      return `Error: Invalid URL format "${url}"`;
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AI Assistant)",
      },
      // Add timeout handling like the web search pattern
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      return `Error fetching URL "${url}": ${response.status} ${response.statusText}`;
    }

    if (analysisType === "metadata") {
      return `URL: ${url}\nStatus: ${response.status}\nContent-Type: ${response.headers.get("content-type")}\nContent-Length: ${response.headers.get("content-length")}`;
    }

    const text = await response.text();

    if (!text || text.trim().length === 0) {
      return `Content from ${url}: No content found or empty response.`;
    }

    // Basic HTML cleanup
    const cleanText = text
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const truncatedContent = cleanText.substring(0, 2000);
    return `Content from ${url}:\n\n${truncatedContent}${cleanText.length > 2000 ? "..." : ""}`;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return `Error fetching URL "${url}": ${errorMessage}`;
  }
}
