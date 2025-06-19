"use node";

export async function browseUrl(
  url: string,
  analysisType: string = "content",
  firecrawlApiKey?: string
): Promise<string> {
  try {
    // Validate URL format
    try {
      new URL(url);
    } catch {
      return `Error: Invalid URL format "${url}"`;
    }

    // Check if Firecrawl API key is provided
    if (!firecrawlApiKey) {
      return `Error: Firecrawl API key is required to fetch URL content. Please configure your Firecrawl API key in settings.`;
    }

    // Prepare Firecrawl API request
    const firecrawlEndpoint = "https://api.firecrawl.dev/v1/scrape";

    // Configure scrape options based on analysis type
    const scrapeOptions: any = {
      url: url,
      formats: ["markdown"],
    };

    // Add specific options based on analysis type
    switch (analysisType) {
      case "metadata":
        scrapeOptions.formats = ["markdown"];
        scrapeOptions.onlyMainContent = false;
        break;
      case "content":
        scrapeOptions.formats = ["markdown"];
        scrapeOptions.onlyMainContent = true;
        break;
      case "summary":
        scrapeOptions.formats = ["markdown"];
        scrapeOptions.onlyMainContent = true;
        break;
      case "extract":
        scrapeOptions.formats = ["markdown", "html"];
        scrapeOptions.onlyMainContent = true;
        break;
      default:
        scrapeOptions.formats = ["markdown"];
        scrapeOptions.onlyMainContent = true;
    }

    const response = await fetch(firecrawlEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${firecrawlApiKey}`,
      },
      body: JSON.stringify(scrapeOptions),
      signal: AbortSignal.timeout(30000), // 30 second timeout for Firecrawl
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[FIRECRAWL DEBUG] API error:", response.status, errorText);
      return `Error fetching URL "${url}" with Firecrawl: ${response.status} ${response.statusText}. ${errorText}`;
    }

    const data = await response.json();

    if (!data.success) {
      return `Error: Firecrawl failed to scrape "${url}": ${data.error || "Unknown error"}`;
    }

    const scrapedData = data.data;

    if (!scrapedData) {
      return `Content from ${url}: No content found or empty response from Firecrawl.`;
    }

    // Handle different analysis types
    if (analysisType === "metadata") {
      const metadata = scrapedData.metadata || {};
      return `URL: ${url}
Title: ${metadata.title || "N/A"}
Description: ${metadata.description || "N/A"}
Language: ${metadata.language || "N/A"}
Status Code: ${metadata.statusCode || "N/A"}
Content Type: ${metadata.contentType || "N/A"}`;
    }

    // Get the markdown content
    const markdownContent = scrapedData.markdown || "";

    if (!markdownContent || markdownContent.trim().length === 0) {
      return `Content from ${url}: No content found or empty response from Firecrawl.`;
    }

    // For content analysis, limit the response size to avoid overwhelming the AI
    const maxLength = analysisType === "summary" ? 3000 : 5000;
    const truncatedContent =
      markdownContent.length > maxLength
        ? markdownContent.substring(0, maxLength) + "..."
        : markdownContent;

    return `Content from ${url} (extracted with Firecrawl):

${truncatedContent}`;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[FIRECRAWL DEBUG] Error:", errorMessage);
    return `Error fetching URL "${url}" with Firecrawl: ${errorMessage}`;
  }
}
