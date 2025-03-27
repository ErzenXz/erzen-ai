import { NextResponse } from "next/server";

// Ensure the API key is properly loaded from environment variables
const GROQ_API_KEY = process.env.GROQ_API_KEY ?? "";

export async function POST(request: Request) {
  try {
    // Parse request body - clone the request first to avoid disturbing it
    const requestClone = request.clone();
    let body;
    try {
      body = await requestClone.json();
    } catch (e) {
      console.error("Failed to parse request body:", e);
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }
    
    const { text, voice = "Arista-PlayAI" } = body;

    // Validate input
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Text input is required" },
        { status: 400 }
      );
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

    // Call the Groq TTS API
    const response = await fetch(
      "https://api.groq.com/openai/v1/audio/speech",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "playai-tts",
          voice: voice,
          input: text,
        }),
      }
    );

    if (!response.ok) {
      let errorMessage = "Failed to generate speech";
      try {
        // Try to get error details but don't fail if we can't
        const errorText = await response.text();
        console.error("Error generating speech:", errorText);
        errorMessage = `Failed to generate speech: ${errorText.substring(0, 100)}`;
      } catch (e) {
        console.error("Could not read error response:", e);
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    // Get the audio data as buffer
    const audioBuffer = await response.arrayBuffer();
    
    // Create a new response with the audio data
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      },
    });
  } catch (error) {
    console.error("Error in text-to-speech API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
