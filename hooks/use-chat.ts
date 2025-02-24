"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { nanoid } from "nanoid";
import { Message, ChatThread } from "@/lib/types";
import { streamChat, fetchThreads, fetchThreadMessages } from "@/lib/api";

export function useChat() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messageMapRef = useRef<Map<string, Message[]>>(new Map());
  // NEW: A ref to always track the current thread id
  const currentThreadIdRef = useRef<string | null>(null);

  useEffect(() => {
    loadThreads();
  }, []);

  useEffect(() => {
    if (currentThreadId) {
      currentThreadIdRef.current = currentThreadId;
      loadThreadMessages(currentThreadId);
    }
  }, [currentThreadId]);

  const loadThreads = async (reset: boolean = false) => {
    try {
      const newPage = reset ? 1 : page;
      const loadedThreads = await fetchThreads(newPage, 10);

      setThreads((prev) => {
        if (reset) return loadedThreads;

        // Create a map of existing threads
        const threadMap = new Map(prev.map((thread) => [thread.id, thread]));

        // Update or add new threads
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

      // Convert API message format to our internal format and sort by date
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
    if (!currentThreadId) return null;
    const thread = threads.find((t) => t.id === currentThreadId);
    if (!thread) return null;

    return {
      ...thread,
      messages: messageMapRef.current.get(thread.id) || [],
    };
  }, [currentThreadId, threads]);

  // Update the setter so the ref is always in sync
  const setCurrentThread = useCallback((threadId: string) => {
    setCurrentThreadId(threadId);
    currentThreadIdRef.current = threadId;
  }, []);

  const createThread = useCallback(() => {
    setCurrentThreadId(null);
    currentThreadIdRef.current = null;
    messageMapRef.current.set("new", []);
  }, []);

  const sendMessage = useCallback(
    async (content: string, model: string) => {
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

        const thread = getCurrentThread();
        const threadKey = thread?.id ?? "new";
        const messages = [
          ...(messageMapRef.current.get(threadKey) || []),
          userMessage,
          assistantMessage,
        ];
        messageMapRef.current.set(threadKey, messages);
        setThreads((prev) => [...prev]); // Force re-render

        abortControllerRef.current = new AbortController();

        const { stream } = await streamChat(content, model, thread?.id);

        let fullResponse = "";
        let newThreadId: string | null = null;

        for await (const chunk of stream()) {
          try {
            const response = JSON.parse(chunk);

            if (response.chatId && !newThreadId) {
              // New thread created
              newThreadId = response.chatId;

              // Update threads list without duplicates
              setThreads((prev) => {
                const newThread = {
                  id: newThreadId!,
                  title: content.slice(0, 50) + "...",
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  userId: "", // Will be set by the server
                  messages: [],
                };

                // Check if thread already exists
                const exists = prev.some((t) => t.id === newThreadId);
                if (exists) return prev;

                return [newThread, ...prev];
              });

              setCurrentThread(newThreadId!);

              // Move messages from 'new' to the new thread ID
              const newMessages = messageMapRef.current.get("new") || [];
              messageMapRef.current.set(newThreadId!, newMessages);
              messageMapRef.current.delete("new");
            } else if (response.result) {
              fullResponse += response.result.content;
            }
          } catch (err) {
            console.error("Error parsing chunk:", err);
          }

          // Use the ref value so we always get the latest current thread id
          const activeThreadId =
            newThreadId || currentThreadIdRef.current || "new";
          const currentMessages =
            messageMapRef.current.get(activeThreadId) || [];
          if (currentMessages.length > 0) {
            currentMessages[currentMessages.length - 1] = {
              ...currentMessages[currentMessages.length - 1],
              content: fullResponse,
            };
            messageMapRef.current.set(activeThreadId, currentMessages);
            setThreads((prev) => [...prev]); // Force re-render
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send message");
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [getCurrentThread]
  );

  const loadMoreThreads = useCallback(() => {
    if (!hasMore || isLoading) return;
    loadThreads();
  }, [hasMore, isLoading, loadThreads]);

  return {
    threads,
    currentThread: getCurrentThread(),
    isLoading,
    error,
    sendMessage,
    createThread,
    setCurrentThread,
    loadMoreThreads,
    hasMore,
  };
}
