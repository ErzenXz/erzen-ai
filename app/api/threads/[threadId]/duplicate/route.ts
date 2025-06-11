import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface Params {
  params: { threadId: string };
}

// POST /api/threads/[threadId]/duplicate - Duplicate a thread
export async function POST(request: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    const { threadId } = params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!threadId) {
      return new NextResponse("Thread ID is required", { status: 400 });
    }

    // Find the original thread and its messages
    const originalThread = await prisma.chatThread.findUnique({
      where: { id: threadId },
      include: { messages: true },
    });

    if (!originalThread || originalThread.userId !== userId) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Create the new thread
    const newThread = await prisma.chatThread.create({
      data: {
        userId,
        title: `${originalThread.title} (Copy)`,
        messages: {
          create: originalThread.messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        },
      },
      include: {
        messages: true,
      },
    });

    return NextResponse.json(newThread, { status: 201 });
  } catch (error) {
    console.error("[THREAD_DUPLICATE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
