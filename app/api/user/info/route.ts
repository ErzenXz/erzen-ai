import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const API_BASE_URL = "https://apis.erzen.tk";
const SYNC_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export const dynamic = "force-dynamic"; // No caching for this route

// Function to fetch user info directly from the main API using the token
async function fetchMainApiUserInfo(request: NextRequest) {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/auth/info`, {
      method: "GET",
      headers: {
        Cookie: request.headers.get("cookie") ?? "",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { message: errorText };
      }

      console.error(`[API] Main API returned ${response.status}:`, errorData);
      throw new Error(
        `Main API returned ${response.status}: ${JSON.stringify(errorData)}`
      );
    }
    return await response.json();
  } catch (error) {
    console.error("[API] Error calling main API:", error);
    throw error;
  }
}

function needsSync(lastSyncedAt: Date | null): boolean {
  if (!lastSyncedAt) return true;
  const timeSinceLastSync = Date.now() - lastSyncedAt.getTime();
  return timeSinceLastSync >= SYNC_INTERVAL;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    let userId: string | null = null;

    try {
      const tokenPayload = JSON.parse(atob(token.split(".")[1]));
      userId = tokenPayload.sub;
    } catch (e) {
      console.warn("[API] Could not decode token payload:", e);
      return NextResponse.json(
        { error: "Invalid token format" },
        { status: 401 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Invalid token - no user ID found" },
        { status: 401 }
      );
    }

    // Try to find user in local database first
    let localUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    // Only sync if user doesn't exist or needs sync based on time
    if (!localUser || needsSync(localUser.lastSyncedAt)) {
      console.log(
        `[API] Syncing user ${userId}, last sync: ${localUser?.lastSyncedAt}`
      );

      const apiUserInfo = await fetchMainApiUserInfo(request);
      const mainApiData = JSON.parse(JSON.stringify(apiUserInfo));

      const userData = {
        id: apiUserInfo.id,
        email: apiUserInfo.email || "unknown@example.com",
        name: apiUserInfo.name || null,
        username: apiUserInfo.username || null,
        role: apiUserInfo.role || "USER",
        emailVerified: apiUserInfo.emailVerified || false,
        image: apiUserInfo.image || null,
        lastLogin: apiUserInfo.lastLogin
          ? new Date(apiUserInfo.lastLogin)
          : new Date(),
        language: apiUserInfo.language || "en-US",
        timezone: apiUserInfo.timezone || "UTC",
        mainApiData,
        lastSyncedAt: new Date(),
      };

      // Use upsert to handle both create and update cases
      localUser = await prisma.user.upsert({
        where: { id: userId },
        create: userData,
        update: {
          ...userData,
          createdAt: undefined, // Don't update creation date
        },
      });

      console.log(
        `[API] ${!localUser ? "Created" : "Updated"} user: ${localUser.id}`
      );
    }

    // Return sanitized user data
    return NextResponse.json({
      id: localUser.id,
      email: localUser.email,
      name: localUser.name,
      username: localUser.username,
      role: localUser.role,
      emailVerified: localUser.emailVerified,
      image: localUser.image,
      lastLogin: localUser.lastLogin,
      language: localUser.language,
      timezone: localUser.timezone,
      lastSyncedAt: localUser.lastSyncedAt,
      createdAt: localUser.createdAt,
      updatedAt: localUser.updatedAt,
    });
  } catch (error) {
    console.error("[API] Error in user info endpoint:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
