"use node";

export async function browseUrl(
  url: string,
  analysisType: string = "content"
): Promise<string> {
  try {
    // Validate URL format
    try {
      new URL(url);
      console.log("[BROWSE DEBUG] URL validation passed");
    } catch {
      console.log("[BROWSE DEBUG] URL validation failed");
      return `Error: Invalid URL format "${url}"`;
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
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
