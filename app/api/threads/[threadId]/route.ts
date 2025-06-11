import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface Params {
  params: { threadId: string };
}

// DELETE /api/threads/[threadId] - Delete a thread
export async function DELETE(request: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    const { threadId } = params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!threadId) {
      return new NextResponse("Thread ID is required", { status: 400 });
    }

    // First, verify the thread belongs to the user
    const thread = await prisma.chatThread.findUnique({
      where: { id: threadId },
    });

    if (!thread || thread.userId !== userId) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // If verification passes, delete the thread
    await prisma.chatThread.delete({
      where: { id: threadId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[THREAD_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
