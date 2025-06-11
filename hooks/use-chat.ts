"use client";

import { useChat, Message } from "ai/react";
import { useState, useCallback, useEffect } from "react";
import { ChatThread, Project } from "@/lib/types";
import axios from "axios";
import { nanoid } from "nanoid";

// A new, simplified hook that wraps the Vercel AI SDK's useChat hook
// and adds the application-specific logic for managing threads and projects.
export function useAppChat(): any {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectThreads, setProjectThreads] = useState<ChatThread[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProjectThreadId, setCurrentProjectThreadId] = useState<
    string | null
  >(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Core chat functionality is now handled by the Vercel AI SDK
  const {
    messages,
    setMessages,
    append,
    reload,
    stop,
    isLoading: isAiLoading,
    input,
    setInput,
  } = useChat({
    api: "/api/chat", // The endpoint for the AI chat logic
    id: currentThreadId ?? undefined,
    onFinish: (message: Message) => {
      // When a response is finished, we want to make sure the thread list is up-to-date
      // with the new title, if one was generated.
      loadThreads(true);
    },
    // The Vercel hook will automatically save new messages to the backend
    // via POST /api/chat. Our endpoint there saves it to the DB.
  }) as any;

  const loadThreads = useCallback(
    async (forceRefresh: boolean = false) => {
      // No need to fetch if we already have threads, unless forcing a refresh
      if (threads.length > 0 && !forceRefresh) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const response = await axios.get<ChatThread[]>("/api/threads");
        setThreads(response.data);
        if (response.data.length > 0 && !currentThreadId) {
          // Select the most recent thread by default
          setCurrentThreadId(response.data[0].id);
        }
      } catch (err) {
        setError("Failed to load threads");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    },
    [threads.length, currentThreadId]
  );

  useEffect(() => {
    loadThreads();
  }, []);

  // When the current thread changes, update the messages in the useChat hook
  useEffect(() => {
    if (currentThreadId) {
      const currentThread = threads.find((t) => t.id === currentThreadId);
      if (currentThread) {
        setMessages(currentThread.messages as Message[]);
      }
    } else {
      // If no thread is selected, clear messages.
      setMessages([]);
    }
  }, [currentThreadId, threads, setMessages]);

  const createThread = useCallback(async () => {
    const newThread: ChatThread = {
      id: nanoid(), // temporary client-side ID
      title: "New Chat",
      userId: "", // Will be set on the server
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setThreads((prev) => [newThread, ...prev]);
    setCurrentThreadId(newThread.id);
    setMessages([]); // Start with a clean slate
  }, [setMessages]);

  const deleteThread = useCallback(
    async (threadId: string) => {
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
      if (currentThreadId === threadId) {
        setCurrentThreadId(threads.length > 1 ? threads[0].id : null);
      }
      await axios.delete(`/api/threads/${threadId}`);
    },
    [setThreads, threads, currentThreadId]
  );

  const duplicateThread = useCallback(
    async (threadId: string) => {
      const response = await axios.post<ChatThread>(
        `/api/threads/${threadId}/duplicate`
      );
      const newThread = response.data;
      setThreads((prev) => [newThread, ...prev]);
      setCurrentThreadId(newThread.id);
    },
    [setThreads]
  );

  const renameThread = useCallback(
    async (threadId: string, title: string) => {
      const response = await axios.patch<ChatThread>(
        `/api/threads/${threadId}/rename`,
        { title }
      );
      const updatedThread = response.data;
      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? updatedThread : t))
      );
    },
    [setThreads]
  );

  const currentThread = currentThreadId
    ? threads.find((t) => t.id === currentThreadId)
    : null;

  const loadMoreThreads = useCallback(async () => {
    // For now, no pagination implemented
    return;
  }, []);

  const hasMore = false;

  // --- Project selection helpers (stub implementations) ---
  const selectProject = useCallback(async (projectId: string | null) => {
    setCurrentProjectId(projectId);
    // In a real implementation, you would load project-specific threads here.
    // We'll just reset projectThreads for now.
    if (projectId === null) {
      setProjectThreads([]);
    } else {
      // TODO: fetch project threads from API if needed.
      setProjectThreads([]);
    }
  }, []);

  const selectProjectThread = useCallback((threadId: string | null) => {
    setCurrentProjectThreadId(threadId);
  }, []);

  // --- Chat sending helper (very thin wrapper around append) ---
  const sendMessage = useCallback(
    async (
      content: string,
      _model: string,
      _browseMode?: boolean,
      _reasoning?: boolean,
      _research?: boolean
    ) => {
      await append({ role: "user", content });
    },
    [append]
  );

  return {
    threads,
    projects,
    projectThreads,
    currentThread: currentThread ? { ...currentThread, messages } : null,
    messages,
    setMessages,
    isLoading: isLoading || isAiLoading,
    error,
    append,
    reload,
    stop,
    createThread,
    setCurrentThread: setCurrentThreadId,
    deleteThread,
    duplicateThread,
    renameThread,
    loadMoreThreads,
    hasMore,
    input,
    setInput,
    sendMessage,
    searchQuery,
    setSearchQuery,
    currentProjectId,
    selectProject,
    selectProjectThread,
    currentProjectThreadId,
  };
}
