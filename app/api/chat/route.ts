import { streamText, CoreMessage } from "ai";
import { getLanguageModel } from "@/lib/providers";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import { nanoid } from "nanoid";

const prisma = new PrismaClient();

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  let {
    messages,
    id: threadId,
    model = "llama3-8b-8192",
    tools,
  }: {
    messages: CoreMessage[];
    id?: string;
    model?: string;
    tools?: any[];
  } = await req.json();

  // Get the last user message
  const userMessage = messages[messages.length - 1];
  if (userMessage.role !== "user") {
    return new Response(
      "Invalid message format: Last message must be from user.",
      { status: 400 }
    );
  }

  const userMessageContent =
    typeof userMessage.content === "string"
      ? userMessage.content
      : userMessage.content
          .filter((part) => part.type === "text")
          .map((part) => (part as any).text)
          .join("");

  let newThreadId = threadId;

  // If no threadId is provided, create a new thread
  if (!newThreadId) {
    // Generate a title for the new thread based on the first user message
    const title = userMessageContent.substring(0, 30);
    const newThread = await prisma.chatThread.create({
      data: {
        userId,
        title: title || "New Chat",
      },
    });
    newThreadId = newThread.id;
  }

  // Save the user's message to the database
  await prisma.chatMessage.create({
    data: {
      threadId: newThreadId,
      role: "user",
      content: userMessageContent,
    },
  });

  const result = await streamText({
    model: getLanguageModel(model),
    system: `As an AI assistant, you'll engage in a friendly, helpful conversation. 
             If a user's query could be interpreted in multiple ways, you'll ask clarifying questions to ensure you understand their intent.`,
    messages,
    ...(tools ? { tools: tools as any, toolChoice: "auto" } : {}),
    onFinish: async ({ text }) => {
      // Save the assistant's final response to the database
      await prisma.chatMessage.create({
        data: {
          threadId: newThreadId!,
          role: "assistant",
          content: text,
        },
      });
    },
  });

  // Respond with the stream
  return result.toDataStreamResponse({
    headers: {
      "X-Thread-Id": newThreadId,
    },
  });
}
