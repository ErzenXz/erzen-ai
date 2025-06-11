import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface Params {
  params: { threadId: string };
}

// PATCH /api/threads/[threadId]/rename - Rename a thread
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    const { threadId } = params;
    const { title } = await request.json();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!threadId) {
      return new NextResponse("Thread ID is required", { status: 400 });
    }

    if (!title) {
      return new NextResponse("Title is required", { status: 400 });
    }

    // First, verify the thread belongs to the user
    const thread = await prisma.chatThread.findUnique({
      where: { id: threadId },
    });

    if (!thread || thread.userId !== userId) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // If verification passes, update the thread
    const updatedThread = await prisma.chatThread.update({
      where: { id: threadId },
      data: { title },
    });

    return NextResponse.json(updatedThread);
  } catch (error) {
    console.error("[THREAD_RENAME]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
