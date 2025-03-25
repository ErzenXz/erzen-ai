import { NextResponse } from "next/server";

// Ensure the API key is properly loaded from environment variables
// Use the server-side environment variable instead of the public one
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";

export async function POST(request: Request) {
  try {
    // Parse request body
    const { text, maxTokens = 40 } = await request.json();

    // Don't make API calls for very short inputs
    if (!text || text.trim().length < 3) {
      return NextResponse.json({ suggestions: [] }, { status: 200 });
    }

    // Use the API key from environment variables
    if (!GROQ_API_KEY) {
      console.error(
        "Groq API key is not set. Please check your environment variables."
      );
      return NextResponse.json(
        { error: "API key configuration error" },
        { status: 500 }
      );
    }

    // Detect if this is likely a programming request
    const isProgrammingRequest =
      /write|create|generate|implement|code|program|function|class|method|script|develop/i.test(
        text.toLowerCase()
      );

    // Create context-aware system prompt
    const systemPrompt = isProgrammingRequest
      ? "You are a helpful programming assistant providing smart completions. Based on the user's input, suggest 3-4 specific, relevant code-related completions that would naturally complete their thought. For example, if they type 'Write a Java program to', suggest valuable specific tasks like 'calculate fibonacci numbers', 'sort an array', 'implement a binary search tree', or 'create a REST API'. Make suggestions specific, practical and directly relevant to the programming language mentioned. Separate multiple suggestions with ||| delimiter."
      : "You are a helpful assistant providing text completions. Based on the user's input, suggest 3-4 specific, relevant phrases that would naturally complete their thought. Keep each suggestion clear, helpful and relevant. Separate multiple suggestions with ||| delimiter.";

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: text,
            },
          ],
          max_tokens: maxTokens,
          temperature: 0.7,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Error getting completions:", error);
      return NextResponse.json(
        { error: "Failed to get completions" },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Split the content by the delimiter and clean up each suggestion
    let content = data.choices[0].message.content.trim();
    let suggestions = content
      .split("|||")
      .map((suggestion: string) => suggestion.trim());

    // Filter out empty suggestions and limit to reasonable number
    suggestions = suggestions
      .filter((suggestion: string) => suggestion.length > 0)
      .slice(0, 4);

    // If somehow we didn't get multiple suggestions, fallback to treating the whole response as one
    if (suggestions.length === 1 && !suggestions[0].includes("|||")) {
      // Try to extract multiple suggestions from a single response
      // Some models might generate a numbered list or bullet points instead of using the delimiter
      const lines = suggestions[0].split(/\n|•|-|\d+\./);
      if (lines.length > 1) {
        suggestions = lines
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0);
      }
    }

    return NextResponse.json({ suggestions }, { status: 200 });
  } catch (error) {
    console.error("Error in completions API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
