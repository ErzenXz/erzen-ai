import { NextResponse } from "next/server";

// Ensure the API key is properly loaded from environment variables
const GROQ_API_KEY = process.env.GROQ_API_KEY ?? "";

export async function POST(request: Request) {
  try {
    // Parse request body
    const { text, maxTokens = 20 } = await request.json();

    return NextResponse.json({ suggestions: [] }, { status: 200 });
    // Don't make API calls for very short inputs
    if (!text || text.trim().length < 2) {
      return NextResponse.json({ suggestions: [] }, { status: 200 });
    }

    // Check for API key
    if (!GROQ_API_KEY) {
      console.error(
        "Groq API key is not set. Please check your environment variables."
      );
      return NextResponse.json(
        { error: "API key configuration error" },
        { status: 500 }
      );
    }

    // Create a prompt specifically for search-like autocomplete
    const systemPrompt =
      "You are a search autocomplete system like Google or YouTube. Based on the user's partial query, predict 4-5 popular search terms that would complete their query. IMPORTANT: Only provide the completion part, NOT the entire phrase. For example, if user types 'how to cook', just return completions like 'pasta' or 'rice' not 'how to cook pasta'. Keep suggestions short and varied. Format your response with each suggestion on a new line, no numbering, no explanations.";

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-specdec",
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: `The user has typed: "${text}". Provide only the completions, not the entire phrase.`,
            },
          ],
          max_tokens: maxTokens,
          temperature: 0.3, // Lower temperature for more predictable results
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Error getting autocomplete suggestions:", error);
      return NextResponse.json(
        { error: "Failed to get suggestions" },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Extract suggestions from the response
    const content = data.choices[0].message.content.trim();

    // Split by new lines to get individual suggestions
    let suggestions = content
      .split("\n")
      .map((suggestion: string) => suggestion.trim())
      .filter((suggestion: string) => suggestion.length > 0);

    // Clean up suggestions - remove any numbering or bullet points
    suggestions = suggestions.map((suggestion: string) =>
      suggestion.replace(/^(\d+\.|\*|-)\s*/, "")
    );

    // If the model didn't format properly as new lines, try to split by other means
    if (suggestions.length <= 1) {
      suggestions = content
        .split(/[.,;]/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);
    }

    // Ensure we have reasonable suggestions and limit to 5
    suggestions = suggestions.filter((s: string) => s.length >= 2).slice(0, 5);

    // Make sure suggestions don't already include the input text
    suggestions = suggestions.map((s: string) => {
      if (s.toLowerCase().startsWith(text.toLowerCase())) {
        return s.substring(text.length).trim();
      }
      return s;
    });

    // Filter out any empty suggestions after processing
    suggestions = suggestions.filter((s: string) => s.length > 0);

    return NextResponse.json({ suggestions }, { status: 200 });
  } catch (error) {
    console.error("Error in autocomplete API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
