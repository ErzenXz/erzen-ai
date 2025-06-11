import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/threads - Fetch all threads for the user
export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const threads = await prisma.chatThread.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json(threads);
  } catch (error) {
    console.error("[THREADS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// POST /api/threads - Create a new thread
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    const { title } = await request.json();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!title) {
      return new NextResponse("Title is required", { status: 400 });
    }

    const newThread = await prisma.chatThread.create({
      data: {
        userId,
        title: title,
      },
    });

    return NextResponse.json(newThread, { status: 201 });
  } catch (error) {
    console.error("[THREADS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
