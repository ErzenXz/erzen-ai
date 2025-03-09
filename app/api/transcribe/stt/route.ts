import { createClient } from "@deepgram/sdk";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioBlob = formData.get("audio") as Blob;

    if (!audioBlob) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    if (!deepgramApiKey) {
      return NextResponse.json(
        { error: "Deepgram API key not configured" },
        { status: 500 }
      );
    }

    // Initialize Deepgram client
    const deepgram = createClient(deepgramApiKey);

    // Convert Blob to ArrayBuffer
    const arrayBuffer = await audioBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Send to Deepgram
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      buffer,
      {
        smart_format: true,
        model: "nova-2",
        language: "en-GB",
      }
    );

    if (error) {
      console.error("Deepgram error:", error);
      return NextResponse.json(
        { error: "Transcription failed" },
        { status: 500 }
      );
    }

    // Extract the transcript from the response
    const transcript =
      result.results?.channels[0]?.alternatives[0]?.transcript || "";

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error("Error processing audio:", error);
    return NextResponse.json(
      { error: "Failed to process audio" },
      { status: 500 }
    );
  }
}
