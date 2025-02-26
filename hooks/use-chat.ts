"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { nanoid } from "nanoid";
import { Message, ChatThread } from "@/lib/types";
import { fetchThreads, fetchThreadMessages, refreshToken } from "@/lib/api";
import { io, Socket } from "socket.io-client";

// Helper to check if code is running in browser environment
const isBrowser = typeof window !== "undefined";
import { db } from "@/lib/db";

export function useChat() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const messageMapRef = useRef<Map<string, Message[]>>(new Map());
  const currentThreadIdRef = useRef<string | null>(null);
  const lastLoadedPageRef = useRef<number>(0);
  const isLoadingMoreRef = useRef<boolean>(false);

  useEffect(() => {
    // Load initial threads
    loadThreads(true);

    // Clean up any socket connection on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (currentThreadId && !messageMapRef.current.has(currentThreadId)) {
      currentThreadIdRef.current = currentThreadId;
      loadThreadMessages(currentThreadId);
    }
  }, [currentThreadId]);

  // Create a new socket connection for a single message exchange
  const createSocketConnection = async (): Promise<Socket | null> => {
    if (!isBrowser) return null;

    // Ensure token is fresh before initializing socket
    await refreshToken();

    const token = localStorage.getItem("accessToken");
    if (!token) {
      setError("Authentication token not found");
      return null;
    }

    try {
      const socket = io("wss://apis.erzen.tk/ai", {
        query: { token },
        transports: ["websocket"],
      });

      return new Promise((resolve, reject) => {
        socket.on("connect", () => {
          console.log("Socket connected for message exchange");
          resolve(socket);
        });

        socket.on("connect_error", (error) => {
          console.error("Socket connection error:", error);
          setError(`Connection error: ${error.message}`);
          reject(error);
        });

        // Set a timeout in case connection takes too long
        setTimeout(() => {
          if (socket.disconnected) {
            reject(new Error("Socket connection timeout"));
          }
        }, 5000);
      });
    } catch (err) {
      console.error("Failed to create socket connection:", err);
      return null;
    }
  };

  useEffect(() => {
    if (searchQuery) {
      searchThreads(searchQuery);
    } else {
      loadThreads(true);
    }
  }, [searchQuery]);

  const searchThreads = async (query: string) => {
    try {
      setIsLoading(true);
      const results = await db.searchThreads(query);
      setThreads(results);
      setHasMore(false);
      setIsLoading(false);
    } catch (err) {
      console.error("Failed to search threads:", err);
      setError("Failed to search threads");
      setIsLoading(false);
    }
  };

  const loadThreads = async (reset: boolean = false) => {
    // Prevent concurrent loading requests
    if (isLoadingMoreRef.current) {
      return;
    }

    try {
      setIsLoading(true);
      isLoadingMoreRef.current = true;
      setError(null);

      const newPage = reset ? 1 : page;

      // If we're resetting, clear the current threads
      if (reset) {
        setThreads([]);
        lastLoadedPageRef.current = 0;
      }

      console.log(`Loading threads page ${newPage}`);

      // Load from IndexedDB first
      const cachedThreads = await db.getThreads(newPage, 10);

      if (cachedThreads.length > 0) {
        setThreads((prevThreads) => {
          if (reset) return cachedThreads;

          // Create a map of existing threads to avoid duplicates
          const threadMap = new Map(prevThreads.map((t) => [t.id, t]));

          // Add new threads to the map
          cachedThreads.forEach((thread) => {
            threadMap.set(thread.id, thread);
          });

          // Convert map back to array and sort by updatedAt
          return Array.from(threadMap.values()).sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        });
      }

      // Then fetch from API
      const loadedThreads = await fetchThreads(newPage, 10);

      if (loadedThreads.length > 0) {
        // Save to IndexedDB
        await db.saveThreads(loadedThreads);

        setThreads((prevThreads) => {
          if (reset) return loadedThreads;

          // Create a map of existing threads to avoid duplicates
          const threadMap = new Map(prevThreads.map((t) => [t.id, t]));

          // Add new threads to the map
          loadedThreads.forEach((thread) => {
            threadMap.set(thread.id, thread);
          });

          // Convert map back to array and sort by updatedAt
          return Array.from(threadMap.values()).sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        });
      }

      // If we received fewer than 10 threads, we've reached the end
      setHasMore(loadedThreads.length === 10);

      // Update the page counter only if we're not resetting
      if (!reset) {
        setPage(newPage + 1);
      } else {
        setPage(2); // After reset, next page should be 2
      }

      // Update last loaded page reference
      lastLoadedPageRef.current = newPage;
    } catch (err) {
      console.error("Failed to load chat threads:", err);
      setError("Failed to load chat threads");
    } finally {
      setIsLoading(false);
      isLoadingMoreRef.current = false;
    }
  };

  const loadThreadMessages = async (threadId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Load from IndexedDB first
      const cachedMessages = await db.getMessages(threadId);
      if (cachedMessages.length > 0) {
        messageMapRef.current.set(threadId, cachedMessages);
        setThreads((prev) => [...prev]); // Force re-render
      }

      // Then fetch from API
      const messages = await fetchThreadMessages(threadId);

      const formattedMessages = messages
        .map((msg) => ({
          id: msg.id,
          content: msg.content,
          role:
            msg.role === "model" ? ("assistant" as const) : ("user" as const),
          timestamp: new Date(msg.createdAt ?? Date.now()),
          chatId: threadId,
        }))
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      await db.saveMessages(formattedMessages);

      messageMapRef.current.set(threadId, formattedMessages);
      setThreads((prev) => [...prev]); // Force re-render
    } catch (err) {
      console.error(`Failed to load thread messages for ${threadId}:`, err);
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

        // Create a new socket connection for this message
        if (socketRef.current) {
          // Clean up any existing socket
          socketRef.current.disconnect();
          socketRef.current = null;
        }

        socketRef.current = await createSocketConnection();

        if (!socketRef.current) {
          throw new Error("Failed to establish socket connection");
        }

        let fullResponse = "";
        let newThreadId: string | null = null;

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

            // Create a new thread object
            const newThread = {
              id: newThreadId!,
              title: content.slice(0, 50) + (content.length > 50 ? "..." : ""),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              userId: "",
              messages: [],
            };

            // Save the new thread in IndexedDB
            db.saveThread(newThread);

            // Update threads list with the new thread
            setThreads((prev) => {
              const exists = prev.some((t) => t.id === newThreadId);
              if (exists) return prev;

              // Add the new thread at the beginning of the list
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

        socketRef.current.on("chatComplete", async (data) => {
          if (data?.chatId && threadId === "new" && !newThreadId) {
            newThreadId = data.chatId;

            // Update currentThreadId and ref
            setCurrentThreadId(newThreadId);
            currentThreadIdRef.current = newThreadId;

            const newThread = {
              id: newThreadId!,
              title: content.slice(0, 50) + (content.length > 50 ? "..." : ""),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              userId: "",
              messages: [],
            };

            // Save the new thread in IndexedDB
            await db.saveThread(newThread);

            setThreads((prev) => {
              const exists = prev.some((t) => t.id === newThreadId);
              if (exists) return prev;

              return [newThread, ...prev];
            });

            // Move messages from 'new' to the new thread ID
            const newMessages = messageMapRef.current.get("new") || [];
            if (newThreadId) {
              // Save these messages to IndexedDB with the correct chatId
              const messagesToSave = newMessages.map((msg) => ({
                ...msg,
                chatId: newThreadId!,
              }));
              await db.saveMessages(messagesToSave);

              messageMapRef.current.set(newThreadId, newMessages);
              messageMapRef.current.delete("new");
            }
          }

          // Save the completed messages to IndexedDB if it's not a new thread
          if (threadId !== "new" || newThreadId) {
            const finalThreadId = newThreadId ?? threadId;
            const messagesToSave = updatedMessages.map((msg) => ({
              ...msg,
              chatId: finalThreadId,
            }));
            await db.saveMessages(messagesToSave);
          }

          // Close socket connection after completion
          if (socketRef.current) {
            console.log("Message exchange complete, closing socket");
            socketRef.current.disconnect();
            socketRef.current = null;
          }

          setIsLoading(false);
        });

        socketRef.current.on("chatError", (error) => {
          setError(
            typeof error === "string" ? error : "Failed to send message"
          );

          // Close socket connection on error
          if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
          }

          setIsLoading(false);
        });

        // Set up disconnect handler
        socketRef.current.on("disconnect", () => {
          console.log("Socket disconnected");
          // Only set loading to false if this wasn't triggered by an intentional disconnect
          if (isLoading && !socketRef.current) {
            setIsLoading(false);
          }
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

        // Ensure socket is closed on error
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
        }
      }
    },
    [currentThreadId]
  );

  const loadMoreThreads = useCallback(async () => {
    if (!hasMore || isLoading || isLoadingMoreRef.current || searchQuery)
      return;
    await loadThreads(false);
  }, [hasMore, isLoading, searchQuery]);

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
    searchQuery,
    setSearchQuery,
  };
}
