"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { nanoid } from "nanoid";
import { Message, ChatThread } from "@/lib/types";
import { fetchThreads, fetchThreadMessages, refreshToken } from "@/lib/api";
import { io, Socket } from "socket.io-client";

// Helper to check if code is running in browser environment
const isBrowser = typeof window !== "undefined";

export function useChat() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const messageMapRef = useRef<Map<string, Message[]>>(new Map());
  const currentThreadIdRef = useRef<string | null>(null);

  useEffect(() => {
    loadThreads();
    initializeSocket();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (currentThreadId && !messageMapRef.current.has(currentThreadId)) {
      currentThreadIdRef.current = currentThreadId;
      loadThreadMessages(currentThreadId);
    }
  }, [currentThreadId]);

  const initializeSocket = async () => {
    // Skip socket initialization if not in browser
    if (!isBrowser) return;

    // Ensure token is fresh before initializing socket
    await refreshToken();

    const token = localStorage.getItem("accessToken");
    if (!token) {
      setError("Authentication token not found");
      return;
    }

    socketRef.current = io("wss://apis.erzen.tk/ai", {
      query: { token },
      transports: ["websocket"],
    });

    socketRef.current.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setError(`Connection error: ${error.message}`);
      setIsLoading(false);

      // If connection error is due to authentication, try to refresh token
      if (
        error.message.includes("authentication") ||
        error.message.includes("Authorization")
      ) {
        refreshToken().then((success) => {
          if (success) {
            // Re-attempt socket connection with new token
            initializeSocket();
          }
        });
      }
    });
  };

  const loadThreads = async (reset: boolean = false) => {
    try {
      const newPage = reset ? 1 : page;
      const loadedThreads = await fetchThreads(newPage, 10);

      setThreads((prev) => {
        if (reset) return loadedThreads;

        const threadMap = new Map(prev.map((thread) => [thread.id, thread]));
        loadedThreads.forEach((thread) => {
          threadMap.set(thread.id, thread);
        });

        return Array.from(threadMap.values());
      });

      setHasMore(loadedThreads.length === 10);
      setPage(newPage + 1);
    } catch (err) {
      setError("Failed to load chat threads");
    }
  };

  const loadThreadMessages = async (threadId: string) => {
    try {
      setIsLoading(true);
      const messages = await fetchThreadMessages(threadId);

      const formattedMessages = messages
        .map((msg) => ({
          id: msg.id,
          content: msg.content,
          role:
            msg.role === "model" ? ("assistant" as const) : ("user" as const),
          timestamp: new Date(msg.createdAt ?? Date.now()),
        }))
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      messageMapRef.current.set(threadId, formattedMessages);
      setThreads((prev) => [...prev]); // Force re-render
    } catch (err) {
      setError("Failed to load thread messages");
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentThread = useCallback(() => {
    const threadId = currentThreadId ?? "new";
    if (threadId === "new") {
      return {
        id: "new",
        title: "New Chat",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: "",
        messages: messageMapRef.current.get("new") || [],
      };
    }

    const thread = threads.find((t) => t.id === threadId);
    if (!thread) {
      return null;
    }

    return {
      ...thread,
      messages: messageMapRef.current.get(thread.id) || [],
    };
  }, [currentThreadId, threads]);

  const createThread = useCallback(() => {
    setCurrentThreadId(null);
    currentThreadIdRef.current = null;
    messageMapRef.current.set("new", []);
    setThreads((prev) => [...prev]); // Force re-render
  }, []);

  const sendMessage = useCallback(
    async (
      content: string,
      model: string,
      browseMode: boolean,
      reasoning: boolean
    ) => {
      // Skip if we're not in a browser context
      if (!isBrowser) {
        setError("Cannot send messages in server context");
        return;
      }

      if (!socketRef.current) {
        // Try to reinitialize socket if it's not available
        await initializeSocket();
        if (!socketRef.current) {
          setError("Socket connection not established");
          return;
        }
      }

      // Ensure token is fresh before sending message
      await refreshToken();

      try {
        setError(null);
        setIsLoading(true);

        const userMessage: Message = {
          id: nanoid(),
          content,
          role: "user",
          timestamp: new Date(),
        };

        const assistantMessage: Message = {
          id: nanoid(),
          content: "",
          role: "assistant",
          timestamp: new Date(),
        };

        // Capture the thread ID early
        const threadId = currentThreadId ?? "new";
        const currentMessages = messageMapRef.current.get(threadId) || [];
        const updatedMessages = [
          ...currentMessages,
          userMessage,
          assistantMessage,
        ];
        messageMapRef.current.set(threadId, updatedMessages);
        setThreads((prev) => [...prev]); // Force re-render

        let fullResponse = "";
        let newThreadId: string | null = null;

        socketRef.current.off("chatChunk");
        socketRef.current.off("chatComplete");
        socketRef.current.off("chatError");

        // Set up socket event handlers
        socketRef.current.on("chatChunk", (data) => {
          // Check if response contains a chat ID pattern
          const chatIdMatch = data.content?.match(/__CHATID__([0-9a-f-]+)__/);

          if (chatIdMatch && !newThreadId && threadId === "new") {
            // Extract the chat ID from the match
            newThreadId = chatIdMatch[1];

            // Update currentThreadId and ref immediately
            setCurrentThreadId(newThreadId);
            currentThreadIdRef.current = newThreadId;

            // Remove the chat ID marker from the message content
            data.content = data.content.replace(/__CHATID__([0-9a-f-]+)__/, "");

            // Update threads list with the new thread
            setThreads((prev) => {
              const newThread = {
                id: newThreadId!,
                title: content.slice(0, 50) + "...",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                userId: "",
                messages: [],
              };

              const exists = prev.some((t) => t.id === newThreadId);
              if (exists) return prev;

              return [newThread, ...prev];
            });

            // Move messages from 'new' to the new thread ID
            const newMessages = messageMapRef.current.get("new") || [];
            messageMapRef.current.set(newThreadId!, newMessages);
            messageMapRef.current.delete("new");
          }

          const sanitizedContent = data.content.replace(
            /__CHATID__([0-9a-f-]+)__/g,
            ""
          );
          fullResponse += sanitizedContent;

          // Update messages immediately with each chunk
          const activeThreadId =
            threadId === "new" ? newThreadId ?? "new" : threadId;
          const currentMessages =
            messageMapRef.current.get(activeThreadId) || [];
          if (currentMessages.length > 0) {
            const updatedMessages = [...currentMessages];
            updatedMessages[updatedMessages.length - 1] = {
              ...updatedMessages[updatedMessages.length - 1],
              content: fullResponse,
            };
            messageMapRef.current.set(activeThreadId, updatedMessages);
            setThreads((prev) => [...prev]); // Force re-render
          }
        });

        socketRef.current.on("chatComplete", (data) => {
          if (data?.chatId && threadId === "new" && !newThreadId) {
            newThreadId = data.chatId;

            // Update currentThreadId and ref
            setCurrentThreadId(newThreadId);
            currentThreadIdRef.current = newThreadId;

            setThreads((prev) => {
              const newThread = {
                id: newThreadId!,
                title: content.slice(0, 50) + "...",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                userId: "",
                messages: [],
              };

              const exists = prev.some((t) => t.id === newThreadId);
              if (exists) return prev;

              return [newThread, ...prev];
            });

            // Move messages from 'new' to the new thread ID
            const newMessages = messageMapRef.current.get("new") || [];
            if (newThreadId) {
              messageMapRef.current.set(newThreadId, newMessages);
              messageMapRef.current.delete("new");
            }
          }
          setIsLoading(false);
        });

        socketRef.current.on("chatError", (error) => {
          setError(
            typeof error === "string" ? error : "Failed to send message"
          );
          setIsLoading(false);
        });

        // Determine which socket event to use based on browseMode and reasoning
        const messageToEmit =
          browseMode || (browseMode && reasoning)
            ? "chatStream"
            : "chatPlainStream";

        // Use the captured threadId for sending the request.
        // When creating a new thread, we do not send an existing chatId.
        socketRef.current.emit(messageToEmit, {
          message: content,
          chatId: threadId === "new" ? undefined : threadId,
          model: model,
          reasoning,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send message");
        setIsLoading(false);
      }
    },
    [currentThreadId]
  );

  const loadMoreThreads = useCallback(() => {
    if (!hasMore || isLoading) return;
    loadThreads();
  }, [hasMore, isLoading]);

  return {
    threads,
    currentThread: getCurrentThread(),
    isLoading,
    error,
    sendMessage,
    createThread,
    setCurrentThread: setCurrentThreadId,
    loadMoreThreads,
    hasMore,
  };
}
