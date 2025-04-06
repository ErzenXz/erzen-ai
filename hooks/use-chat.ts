"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { nanoid } from "nanoid";
import {
  Message,
  ChatThread,
  Project,
  SingleProjectThread,
  SingleProject,
} from "@/lib/types";
import {
  fetchThreads,
  fetchThreadMessages,
  refreshToken,
  deleteThread as apiDeleteThread,
  duplicateThread as apiDuplicateThread,
  renameThread as apiRenameThread,
  fetchProjects,
  fetchProject,
} from "@/lib/api";
import { io, Socket } from "socket.io-client";

// Helper to check if code is running in browser environment
const isBrowser = typeof window !== "undefined";
import { db } from "@/lib/db";

export function useChat() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectThreads, setProjectThreads] = useState<ChatThread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProjectThreadId, setCurrentProjectThreadId] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const messageMapRef = useRef<Map<string, Message[]>>(new Map());
  const currentThreadIdRef = useRef<string | null>(null);
  const currentProjectIdRef = useRef<string | null>(null);
  const currentProjectThreadIdRef = useRef<string | null>(null);
  const projectMessagesRef = useRef<Map<string, Message[]>>(new Map());
  const lastLoadedPageRef = useRef<number>(0);
  const isLoadingMoreRef = useRef<boolean>(false);

  useEffect(() => {
    // Load initial projects and threads
    loadProjects();
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

  // Handle project selection
  useEffect(() => {
    if (currentProjectId) {
      currentProjectIdRef.current = currentProjectId;
      loadProjectThreads(currentProjectId);
    } else {
      setProjectThreads([]);
    }
  }, [currentProjectId]);

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
      loadProjects();
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
          const updatedThreads = Array.from(threadMap.values()).sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );

          console.log(
            `Updated threads: ${updatedThreads.length} threads total`
          );
          return updatedThreads;
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
    // If we're viewing a project thread
    if (currentProjectThreadId && currentProjectId) {
      const projectThread = projectThreads.find(
        (t) => t.id === currentProjectThreadId
      );
      if (projectThread) {
        return {
          ...projectThread,
          messages: messageMapRef.current.get(projectThread.id) || [],
          projectId: currentProjectId,
        };
      }
    }

    // Regular thread or new chat
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
  }, [
    currentThreadId,
    threads,
    currentProjectThreadId,
    currentProjectId,
    projectThreads,
  ]);

  const createThread = useCallback(() => {
    setCurrentThreadId(null);
    setCurrentProjectId(null);
    setCurrentProjectThreadId(null);
    currentThreadIdRef.current = null;
    currentProjectIdRef.current = null;
    currentProjectThreadIdRef.current = null;
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
          thinking: false,
          thinkingContent: "",
        };

        // Capture the thread ID early
        let threadId = currentThreadId ?? "new";

        // If we're in a project thread, use that
        if (currentProjectThreadId && currentProjectId) {
          threadId = currentProjectThreadId;
        }

        const currentMessages = messageMapRef.current.get(threadId) || [];
        const updatedMessages = [
          ...currentMessages,
          userMessage,
          assistantMessage,
        ];
        messageMapRef.current.set(threadId, updatedMessages);

        // Force re-render by updating threads state
        if (currentProjectThreadId && currentProjectId) {
          setProjectThreads((prev) => [...prev]);
        } else {
          setThreads((prev) => [...prev]);
        }

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
              projectId: currentProjectId || undefined,
            };

            // Save the new thread in IndexedDB
            db.saveThread(newThread);

            // Update threads list with the new thread
            if (currentProjectId) {
              setProjectThreads((prev) => {
                const exists = prev.some((t) => t.id === newThreadId);
                if (exists) return prev;
                return [newThread, ...prev];
              });
            } else {
              setThreads((prev) => {
                const exists = prev.some((t) => t.id === newThreadId);
                if (exists) return prev;
                return [newThread, ...prev];
              });
            }

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
            const lastMessage = updatedMessages[updatedMessages.length - 1];

            // Process streaming content to detect thinking blocks
            let mainContent = fullResponse;
            let thinkingContent = lastMessage.thinkingContent || "";

            // Regular expression to find all thinking tags
            const thinkRegex = /<think>([\s\S]*?)(?:<\/think>|$)/gi;
            const reasoningRegex = /<reasoning>([\s\S]*?)(?:<\/reasoning>|$)/gi;

            // Extract thinking content from matched tags
            let extractedThinking = "";
            let match;

            // Handle <think> tags
            while ((match = thinkRegex.exec(fullResponse)) !== null) {
              if (match[1]) {
                extractedThinking +=
                  (extractedThinking ? "\n\n" : "") + match[1].trim();
                // Remove the matched thinking block from main content
                const fullMatch = match[0];
                const matchIndex = fullResponse.indexOf(fullMatch, match.index);
                if (matchIndex !== -1) {
                  mainContent =
                    mainContent.substring(0, matchIndex) +
                    mainContent.substring(matchIndex + fullMatch.length);
                }
              }
            }

            // Handle <reasoning> tags
            while ((match = reasoningRegex.exec(fullResponse)) !== null) {
              if (match[1]) {
                extractedThinking +=
                  (extractedThinking ? "\n\n" : "") + match[1].trim();
                // Remove the matched reasoning block from main content
                const fullMatch = match[0];
                const matchIndex = fullResponse.indexOf(fullMatch, match.index);
                if (matchIndex !== -1) {
                  mainContent =
                    mainContent.substring(0, matchIndex) +
                    mainContent.substring(matchIndex + fullMatch.length);
                }
              }
            }

            // Check for incomplete thinking blocks - open tags without closing tags
            const openThinkTag = /<think>/i.exec(mainContent);
            const openReasonTag = /<reasoning>/i.exec(mainContent);

            if (openThinkTag || openReasonTag) {
              const tag = openThinkTag ? "think" : "reasoning";
              const tagPos = openThinkTag
                ? openThinkTag.index
                : openReasonTag!.index;

              // Extract content after the opening tag
              const partialThinking = mainContent.substring(
                tagPos + tag.length + 2
              );
              if (partialThinking) {
                extractedThinking +=
                  (extractedThinking ? "\n\n" : "") + partialThinking.trim();
              }

              // Keep only content before the tag
              mainContent = mainContent.substring(0, tagPos).trim();
            }

            // Update thinking content
            if (extractedThinking) {
              thinkingContent = extractedThinking;
            }

            // Normalize whitespace in main content
            mainContent = mainContent.replace(/[ \t\r]+/g, " ").trim();

            // Update the message with potentially modified content
            updatedMessages[updatedMessages.length - 1] = {
              ...lastMessage,
              content: mainContent,
              thinking: thinkingContent.length > 0,
              thinkingContent: thinkingContent || lastMessage.thinkingContent,
            };

            messageMapRef.current.set(activeThreadId, updatedMessages);

            // Force re-render based on thread type
            if (currentProjectId && currentProjectThreadId) {
              setProjectThreads((prev) => [...prev]);
            } else {
              setThreads((prev) => [...prev]);
            }
          }
        });

        // Add handler for the chatThinking event
        socketRef.current.on("chatThinking", (data) => {
          const activeThreadId =
            threadId === "new" ? newThreadId ?? "new" : threadId;
          const currentMessages =
            messageMapRef.current.get(activeThreadId) || [];

          if (currentMessages.length > 0) {
            const updatedMessages = [...currentMessages];
            const lastMessage = updatedMessages[updatedMessages.length - 1];
            updatedMessages[updatedMessages.length - 1] = {
              ...lastMessage,
              thinking: true,
              thinkingContent:
                (lastMessage.thinkingContent ?? "") + data.content ||
                "thinking",
            };
            messageMapRef.current.set(activeThreadId, updatedMessages);

            // Force re-render based on thread type
            if (currentProjectId && currentProjectThreadId) {
              setProjectThreads((prev) => [...prev]);
            } else {
              setThreads((prev) => [...prev]);
            }
          }
        });

        socketRef.current.on("chatComplete", async (data) => {
          if (data?.chatId && threadId === "new" && !newThreadId) {
            newThreadId = data.chatId;

            // Update currentThreadId and ref
            if (currentProjectId) {
              setCurrentProjectThreadId(newThreadId);
              currentProjectThreadIdRef.current = newThreadId;
            } else {
              setCurrentThreadId(newThreadId);
              currentThreadIdRef.current = newThreadId;
            }

            const newThread = {
              id: newThreadId!,
              title: content.slice(0, 50) + (content.length > 50 ? "..." : ""),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              userId: "",
              messages: [],
              projectId: currentProjectId || undefined,
            };

            // Save the new thread in IndexedDB
            await db.saveThread(newThread);

            if (currentProjectId) {
              setProjectThreads((prev) => {
                const exists = prev.some((t) => t.id === newThreadId);
                if (exists) return prev;
                return [newThread, ...prev];
              });
            } else {
              setThreads((prev) => {
                const exists = prev.some((t) => t.id === newThreadId);
                if (exists) return prev;
                return [newThread, ...prev];
              });
            }

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
          projectId: currentProjectId || undefined,
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
    [currentThreadId, currentProjectId, currentProjectThreadId]
  );

  const loadMoreThreads = useCallback(async () => {
    if (!hasMore || isLoading || isLoadingMoreRef.current || searchQuery) {
      console.log("Skipping loadMoreThreads:", {
        hasMore,
        isLoading,
        isLoadingMore: isLoadingMoreRef.current,
        searchQuery,
      });
      return;
    }

    console.log("Loading more threads, current page:", page);
    await loadThreads(false);
    console.log("Loaded more threads, new page:", page);
  }, [hasMore, isLoading, searchQuery, page]);

  const deleteThreadById = useCallback(
    async (threadId: string) => {
      try {
        setIsLoading(true);
        setError(null);

        // Delete from API
        await apiDeleteThread(threadId);

        // Delete from local DB
        await db.deleteThread(threadId);

        // Delete from message map
        messageMapRef.current.delete(threadId);

        // Remove from threads state
        if (currentProjectId && projectThreads.some((t) => t.id === threadId)) {
          setProjectThreads((prevThreads) =>
            prevThreads.filter((thread) => thread.id !== threadId)
          );

          // If the deleted thread was the current one, reset project thread ID
          if (currentProjectThreadId === threadId) {
            setCurrentProjectThreadId(null);
            currentProjectThreadIdRef.current = null;
          }
        } else {
          setThreads((prevThreads) =>
            prevThreads.filter((thread) => thread.id !== threadId)
          );

          // If the deleted thread was the current one, create a new thread
          if (currentThreadId === threadId) {
            createThread();
          }
        }
      } catch (err) {
        console.error(`Failed to delete thread ${threadId}:`, err);
        setError("Failed to delete thread");
      } finally {
        setIsLoading(false);
      }
    },
    [
      currentThreadId,
      currentProjectId,
      currentProjectThreadId,
      createThread,
      projectThreads,
    ]
  );

  const duplicateThreadById = useCallback(
    async (threadId: string) => {
      try {
        setIsLoading(true);
        setError(null);

        // Duplicate on API
        const newThread = await apiDuplicateThread(threadId);

        // Save to local DB
        await db.saveThread(newThread);

        // Copy messages from the original thread to the new thread
        const originalMessages = messageMapRef.current.get(threadId) || [];
        const duplicatedMessages = originalMessages.map((msg) => ({
          ...msg,
          id: nanoid(),
          chatId: newThread.id,
        }));

        // Save the duplicated messages
        if (duplicatedMessages.length > 0) {
          await db.saveMessages(duplicatedMessages);
          messageMapRef.current.set(newThread.id, duplicatedMessages);
        }

        // Add new thread to state based on whether it's a project thread
        if (currentProjectId && projectThreads.some((t) => t.id === threadId)) {
          setProjectThreads((prevThreads) => [newThread, ...prevThreads]);

          // Switch to the new thread
          setCurrentProjectThreadId(newThread.id);
          currentProjectThreadIdRef.current = newThread.id;
        } else {
          setThreads((prevThreads) => [newThread, ...prevThreads]);

          // Switch to the new thread
          setCurrentThreadId(newThread.id);
          currentThreadIdRef.current = newThread.id;
        }
      } catch (err) {
        console.error(`Failed to duplicate thread ${threadId}:`, err);
        setError("Failed to duplicate thread");
      } finally {
        setIsLoading(false);
      }
    },
    [currentProjectId, projectThreads]
  );

  const renameThreadById = useCallback(
    async (threadId: string, newTitle: string) => {
      try {
        setError(null);

        // First update the UI optimistically for better user experience
        if (currentProjectId && projectThreads.some((t) => t.id === threadId)) {
          setProjectThreads((prevThreads) =>
            prevThreads.map((thread) =>
              thread.id === threadId ? { ...thread, title: newTitle } : thread
            )
          );
        } else {
          setThreads((prevThreads) =>
            prevThreads.map((thread) =>
              thread.id === threadId ? { ...thread, title: newTitle } : thread
            )
          );
        }

        // Then make the API call
        const updatedThread = await apiRenameThread(threadId, newTitle);

        // Update in local DB once the API call completes
        await db.saveThread(updatedThread);
      } catch (err) {
        console.error(`Failed to rename thread ${threadId}:`, err);
        setError("Failed to rename thread");

        // Revert the optimistic update if the API call failed
        // This requires refetching threads to ensure data consistency
        if (currentProjectId) {
          loadProjectThreads(currentProjectId);
        } else {
          loadThreads(true);
        }
      }
    },
    [currentProjectId, projectThreads]
  );

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const projects = await fetchProjects();

      // Sort projects by last updated
      const sortedProjects = projects.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      setProjects(sortedProjects);
      return sortedProjects;
    } catch (err) {
      console.error("Failed to load projects:", err);
      setError("Failed to load projects");
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjectData = async (
    projectId: string
  ): Promise<SingleProject | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const projectData = await fetchProject(projectId);

      return projectData;
    } catch (err) {
      console.error(`Failed to load project ${projectId}:`, err);
      setError("Failed to load project");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjectThreads = async (projectId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Load project data which includes threads
      const projectData = await loadProjectData(projectId);

      if (projectData && projectData.threads) {
        // Convert to ChatThread format
        const threads: ChatThread[] = projectData.threads.map(
          (thread: SingleProjectThread) => ({
            id: thread.id,
            title: thread.title,
            createdAt: thread.createdAt,
            updatedAt: thread.updatedAt,
            userId: thread.userId,
            projectId: thread.projectId,
            messages: [],
          })
        );

        // Sort threads by updatedAt
        const sortedThreads = threads.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );

        setProjectThreads(sortedThreads);
      }
    } catch (err) {
      console.error(`Failed to load threads for project ${projectId}:`, err);
      setError("Failed to load project threads");
    } finally {
      setIsLoading(false);
    }
  };

  const selectProject = useCallback((projectId: string | null) => {
    setCurrentThreadId(null);
    currentThreadIdRef.current = null;
    setCurrentProjectId(projectId);
    currentProjectIdRef.current = projectId;
    setCurrentProjectThreadId(null);
    currentProjectThreadIdRef.current = null;

    // Only load project threads if we have a valid project ID
    if (projectId) {
      loadProjectThreads(projectId);
    } else {
      setProjectThreads([]);
    }
  }, []);

  const selectProjectThread = useCallback((threadId: string | null) => {
    if (threadId) {
      setCurrentProjectThreadId(threadId);
      currentProjectThreadIdRef.current = threadId;
      loadThreadMessages(threadId);
    } else {
      setCurrentProjectThreadId(null);
      currentProjectThreadIdRef.current = null;
    }
  }, []);

  return {
    threads,
    projectThreads,
    currentThread: getCurrentThread(),
    isLoading,
    error,
    sendMessage,
    createThread,
    deleteThread: deleteThreadById,
    duplicateThread: duplicateThreadById,
    renameThread: renameThreadById,
    setCurrentThread: setCurrentThreadId,
    loadMoreThreads,
    hasMore,
    searchQuery,
    setSearchQuery,
    projects,
    currentProjectId,
    selectProject,
    selectProjectThread,
    currentProjectThreadId,
  };
}
