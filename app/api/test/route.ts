import { NextResponse } from "next/server";

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      message: "Healthy!",
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error("API test error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to respond" },
      { status: 500 }
    );
  }
}
