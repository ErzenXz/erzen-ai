"use client"

import React, { useState, useCallback, useEffect, useRef } from "react"
import { MessageSquarePlus, Bot, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAppChat } from "@/hooks/use-chat"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { ChatMessage } from "@/components/page/main/chat-message"
import { ChatThreadList } from "@/components/page/sidebar/chat-thread-list"
import { ModelSelector } from "@/components/page/main/model-selector"
import { ChatInput } from "@/components/page/main/chat-input/chat-input"
import { ScrollArea } from "@/components/ui/scroll-area"
import Link from 'next/link';
import {
  updateThreadMessage,
  retryThreadMessage,
  branchThreadAtMessage,
} from "@/lib/api"
import type { Message } from "@/lib/types"

export default function ChatPage() {
  const {
    threads,
    currentThread,
    messages,
    append,
    isLoading,
    input,
    setInput,
    stop,
    setMessages,
    setCurrentThread,
    deleteThread,
    duplicateThread,
    renameThread,
    loadMoreThreads,
    hasMore,
    createThread,
    reload,
  } = useAppChat()

  const { userId, isSignedIn, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [selectedModel, setSelectedModel] = useState("llama3-8b-8192")
  const [isEditingMessage, setIsEditingMessage] = useState<string | null>(null)
  const [reportedMessageId, setReportedMessageId] = useState<string | null>(
    null
  )
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!input.trim() || !userId) return
      await append({ role: 'user', content: input }, { body: { model: selectedModel } })
      setInput("")
    },
    [input, userId, append, setInput, selectedModel]
  )

  const handleUpdateMessage = useCallback(
    async (msg: Message, content: string) => {
      if (!currentThread) return
      await updateThreadMessage(currentThread.id, msg.id, { content })
      reload()
    },
    [currentThread, reload]
  )

  const handleRetryMessage = useCallback(
    async (msg: Message) => {
      if (!currentThread) return
      await retryThreadMessage(currentThread.id, msg.id)
      reload()
    },
    [currentThread, reload]
  )

  const handleBranchMessage = useCallback(
    async (messageId: string) => {
      if (!currentThread) return
      const newThread = await branchThreadAtMessage(
        currentThread.id,
        messageId
      )
      setCurrentThread(newThread.id)
    },
    [currentThread, setCurrentThread]
  )

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight
    }
  }, [currentThread?.messages])

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin" />
      </div>
    )
  }

  if (!isSignedIn) {
    // Redirect to Clerk's sign-in page (catch-all route)
    if (typeof window !== "undefined") {
      router.push("/sign-in")
    }
    return null
  }

  return (
    <div className="h-screen w-screen flex bg-background text-foreground overflow-hidden">
      <aside className="w-80 border-r border-border flex flex-col">
        <div className="p-4">
          <Button onClick={() => createThread()} className="w-full">
            <MessageSquarePlus className="mr-2" /> New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <ChatThreadList
            threads={threads}
            currentThreadId={currentThread?.id ?? null}
            onThreadSelect={setCurrentThread}
            onDeleteThread={deleteThread}
            onDuplicateThread={duplicateThread}
            onRenameThread={renameThread}
            onLoadMore={loadMoreThreads}
            hasMore={hasMore}
            onNewThread={createThread}
            projects={[]}
          />
        </ScrollArea>
      </aside>
      <main className="flex-1 flex flex-col">
        <header className="border-b border-border p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">
            {currentThread
              ? threads.find((t) => t.id === currentThread.id)?.title ?? "Chat"
              : "ErzenAI"}
          </h1>
          <ModelSelector
            value={selectedModel}
            onChange={setSelectedModel}
          />
        </header>
        <div className="flex-1 flex flex-col overflow-hidden">
          {currentThread ? (
            <ScrollArea className="flex-1" ref={chatContainerRef}>
              <div className="container mx-auto px-4 py-8">
                {currentThread.messages.map((msg: Message) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                  />
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Bot size={48} className="mx-auto text-muted-foreground" />
                <h2 className="mt-4 text-2xl font-bold">
                  Welcome to ErzenAI
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Start a new conversation or select one from the sidebar.
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-border">
          <ChatInput
            message={input}
            onMessageChange={setInput}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            isDisabled={isLoading}
            isProcessingFiles={false}
            uploadedFilesCount={0}
            showFileUpload={false}
            onClearFiles={() => {}}
            onToggleFileUpload={() => {}}
          />
        </div>
      </main>
    </div>
  )
} 