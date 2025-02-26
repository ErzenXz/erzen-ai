"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { nanoid } from "nanoid";
import { Message, ChatThread } from "@/lib/types";
import { fetchThreads, fetchThreadMessages } from "@/lib/api";
import { io, Socket } from "socket.io-client";

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
    if (currentThreadId) {
      currentThreadIdRef.current = currentThreadId;
      loadThreadMessages(currentThreadId);
    }
  }, [currentThreadId]);

  const initializeSocket = () => {
    const token = localStorage.getItem("accessToken"); // Assuming token is stored in localStorage
    if (!token) {
      setError("Authentication token not found");
      return;
    }

    socketRef.current = io("wss://apis.erzen.tk/ai", {
      query: { token },
      transports: ["websocket"],
    });

    socketRef.current.on("connect_error", (error) => {
      setError(`Connection error: ${error.message}`);
      setIsLoading(false);
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
    const threadId = currentThreadId || "new";
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
    if (!thread) return null;

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
      if (!socketRef.current) {
        setError("Socket connection not established");
        return;
      }

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

        const threadId = currentThreadId || "new";
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

        // Set up socket event handlers
        socketRef.current.on("chatChunk", (data) => {
          fullResponse += data.content;

          // Update messages immediately with each chunk
          const activeThreadId =
            threadId === "new" ? newThreadId || "new" : threadId;
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

            setCurrentThreadId(newThreadId);
            currentThreadIdRef.current = newThreadId;

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

        // Send the message
        socketRef.current.emit("chatPlainStream", {
          message: content,
          chatId: currentThreadId ?? undefined,
          model: model,
          browseMode,
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
