// Define route config to optimize API route handling
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Simple helper to create JSON responses
const jsonResponse = (data: any, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
};

export async function POST(request: Request) {
  try {
    console.log("TTS API route called");

    // Parse the JSON from the request
    const data = await request.json();

    // Extract and validate text
    const text = data.text;
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      console.error("TTS API: Text input is required");
      return jsonResponse({ error: "Text input is required" }, 400);
    }

    // Get voice parameter or use default
    const voice = data.voice || "Arista-PlayAI";

    // Get API key
    const GROQ_API_KEY = process.env.GROQ_API_KEY ?? "";
    if (!GROQ_API_KEY) {
      console.error("TTS API: Groq API key is not set");
      return jsonResponse({ error: "API key configuration error" }, 500);
    }

    console.log("TTS API: Calling Groq TTS API");

    // Call Groq TTS API
    const ttsResponse = await fetch(
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
          response_format: "wav", // Explicitly use WAV format
        }),
      }
    );

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error("TTS API: Error generating speech:", errorText);
      return jsonResponse(
        { error: "Failed to generate speech" },
        ttsResponse.status
      );
    }

    // Get the full audio data
    const audioBuffer = await ttsResponse.arrayBuffer();

    // Convert to base64 string
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");

    // Return as JSON with base64 data
    return jsonResponse({
      audio: `data:audio/wav;base64,${audioBase64}`,
    });
  } catch (error) {
    console.error("TTS API: Error in text-to-speech API:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
}
