"use client"

import type React from "react"

import { useState, useCallback, useEffect } from "react"
import { useChat } from "@/hooks/use-chat"
import { useAuth } from "@/hooks/use-auth"
import { ChatMessage } from "@/components/chat-message"
import { ChatThreadList } from "@/components/chat-thread-list"
import { ModelSelector } from "@/components/model-selector"
import { FileUpload } from "@/components/file-upload"
import { ChatInput } from "@/components/chat-input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Globe, Brain, Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { readFileAsText } from "@/lib/utils"

export default function Home() {
  const {
    threads,
    currentThread,
    isLoading,
    error,
    sendMessage,
    createThread,
    setCurrentThread,
    loadMoreThreads,
    hasMore,
    searchQuery,
    setSearchQuery,
    deleteThread,
    duplicateThread,
    renameThread,
  } = useChat()

  const { user } = useAuth()
  const [message, setMessage] = useState("")
  const [selectedModel, setSelectedModel] = useState("")
  const [browseMode, setBrowseMode] = useState(false)
  const [reasoning, setReasoning] = useState(false)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isProcessingFiles, setIsProcessingFiles] = useState(false)
  const [isEditingMessage, setIsEditingMessage] = useState<string | null>(null)

  // Dialog states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [dialogAction, setDialogAction] = useState<"delete-thread" | "report-message">("delete-thread")
  const [reportedMessageId, setReportedMessageId] = useState<string | null>(null)

  // Reset states when dialog closes to prevent state inconsistency
  const resetDialogStates = useCallback(() => {
    setSelectedThreadId(null)
    setReportedMessageId(null)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!message.trim() && uploadedFiles.length === 0) || !selectedModel || !user) return

    if (isProcessingFiles) return

    try {
      setIsProcessingFiles(true)
      let content = message

      // If there are files, add their content to the message
      if (uploadedFiles.length > 0) {
        const fileContents = await Promise.all(
          uploadedFiles.map(async (file) => {

            try {
              const text = await readFileAsText(file)
              return `(${file.name})\n------------------\n${typeof text === "string" ? text : JSON.stringify(text, null, 2)}\n------------------\n`
            } catch (error) {
              return `(${file.name})\n------------------\nError reading file: ${error instanceof Error ? error.message : "Unknown error"}\n------------------\n`
            }
          }),
        )

        content = fileContents.join("\n") + (message ? "\n\n" + message : "")
      }

      setMessage("")
      setUploadedFiles([])
      setShowFileUpload(false)
      setIsEditingMessage(null)
      await sendMessage(content, selectedModel, browseMode, reasoning)
    } catch (error) {
      console.error("Error processing files:", error)
    } finally {
      setIsProcessingFiles(false)
    }
  }

  const handleFilesChange = (files: File[]) => {
    setUploadedFiles(files)
  }

  const handleRenameThread = (threadId: string, newTitle: string) => {
    if (threadId && newTitle.trim()) {
      renameThread(threadId, newTitle)
    }
  }

  const handleDuplicateThread = (threadId: string) => {
    duplicateThread(threadId)
  }

  const handleDeleteThread = (threadId: string) => {
    setSelectedThreadId(threadId)
    setDialogAction("delete-thread")
    setIsDeleteDialogOpen(true)
  }

  const handleReportMessage = (messageId: string) => {
    setReportedMessageId(messageId)
    setDialogAction("report-message")
    setIsDeleteDialogOpen(true)
  }

  const handleRegenerateMessage = () => {
    if (!currentThread || !currentThread.messages.length) return
    
    toast({
      title: "Regenerating response",
      description: "Please wait while we generate a new response",
    })
    
    // In a real app, you would call an API to regenerate the response
    // For now, we'll just show a toast
    setTimeout(() => {
      toast({
        title: "Response regenerated",
        description: "The AI has generated a new response",
      })
    }, 2000)
  }

  const handleEditMessage = (messageId: string) => {
    if (!currentThread) return
    
    const messageToEdit = currentThread.messages.find(msg => msg.id === messageId)
    if (!messageToEdit) return
    
    setMessage(messageToEdit.content || "")
    setIsEditingMessage(messageId)
    
    // Focus the input
    const inputElement = document.querySelector('textarea') as HTMLTextAreaElement
    if (inputElement) {
      inputElement.focus()
    }
    
    toast({
      title: "Edit mode",
      description: "Edit your message and send it again",
    })
  }

  const handlePlayMessage = (messageId: string) => {
    // In a real app, you would implement audio playback logic here
    toast({
      title: "Playing message",
      description: "Audio playback would start here in a real implementation",
    })
  }

  const confirmAction = async () => {
    if (dialogAction === "delete-thread" && selectedThreadId) {
      const threadId = selectedThreadId
      setIsDeleteDialogOpen(false)
      await deleteThread(threadId)
      resetDialogStates()
    } else if (dialogAction === "report-message" && reportedMessageId) {
      setIsDeleteDialogOpen(false)
      toast({
        title: "Message reported",
        description: "Thank you for your feedback. We'll review this message.",
      })
      resetDialogStates()
    }
  }

  const handleCommandExecute = (command: string) => {
    switch (command) {
      case "/clear":
        if (currentThread) {
          setDialogAction("delete-thread")
          setIsDeleteDialogOpen(true)
          setSelectedThreadId(currentThread.id)
        }
        setMessage("")
        break
      case "/help":
        toast({
          title: "Available Commands",
          description: "Try /clear, /generate, /summarize, /image, /code, or /ask",
        })
        break
      case "/generate":
        setMessage("/generate Write a creative story about ")
        break
      case "/summarize":
        setMessage("/summarize Please summarize the conversation so far")
        break
      case "/image":
        setMessage("/image Generate an image of ")
        break
      case "/code":
        setMessage("/code Write a function that ")
        break
      case "/ask":
        setMessage("/ask ")
        break
      default:
        // Just keep the command in the input
        break
    }
  }

  // When the page unmounts, ensure we clean up any pending states
  useEffect(() => {
    return () => {
      resetDialogStates()
    }
  }, [resetDialogStates])

  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen bg-background">
      <ChatThreadList
        threads={threads}
        currentThreadId={currentThread?.id ?? null}
        onThreadSelect={(id) => setCurrentThread(id)}
        onNewThread={createThread}
        onRenameThread={handleRenameThread}
        onDuplicateThread={handleDuplicateThread}
        onDeleteThread={handleDeleteThread}
        onLoadMore={loadMoreThreads}
        hasMore={hasMore}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="flex-1 flex flex-col">
        <header className="border-b p-4 flex items-center gap-4">
          <ModelSelector value={selectedModel} onChange={setSelectedModel} />
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <Label htmlFor="web-search" className="text-sm font-medium cursor-pointer">
                  Web Search
                </Label>
                <Switch
                  id="web-search"
                  checked={browseMode}
                  onCheckedChange={(checked) => {
                    setBrowseMode(checked)
                    if (!checked) {
                      setReasoning(false)
                    }
                  }}
                />
              </div>
            </div>

            {browseMode && (
              <div className="flex items-center gap-3">
                <Brain className="w-5 h-5 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <Label htmlFor="reasoning" className="text-sm font-medium cursor-pointer">
                    Reasoning
                  </Label>
                  <Switch id="reasoning" checked={reasoning} onCheckedChange={setReasoning} />
                </div>
              </div>
            )}
          </div>
        </header>

        <ScrollArea className="flex-1 p-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {currentThread?.messages.map((msg, index) => (
              <ChatMessage 
                key={msg.id} 
                message={msg} 
                isLast={index === currentThread.messages.length - 1}
                onRegenerate={msg.role === "assistant" ? handleRegenerateMessage : undefined}
                onEdit={msg.role === "user" ? handleEditMessage : undefined}
                onReport={handleReportMessage}
                onPlay={handlePlayMessage}
              />
            ))}
            {error && <div className="p-4 text-sm text-destructive bg-destructive/10 rounded-lg">{error}</div>}
          </div>
        </ScrollArea>

        <footer className="border-t p-4">
          <div className="max-w-3xl mx-auto">
            {showFileUpload && <FileUpload onFilesChange={handleFilesChange} />}

            <ChatInput
              message={message}
              onMessageChange={setMessage}
              onSubmit={handleSubmit}
              onToggleFileUpload={() => setShowFileUpload(!showFileUpload)}
              isLoading={isLoading}
              isDisabled={!user || !selectedModel}
              isProcessingFiles={isProcessingFiles}
              uploadedFilesCount={uploadedFiles.length}
              showFileUpload={showFileUpload}
              onClearFiles={() => {
                setUploadedFiles([])
                setShowFileUpload(false)
              }}
              placeholder={
                isEditingMessage
                  ? "Edit your message..."
                  : uploadedFiles.length > 0
                  ? `${uploadedFiles.length} file(s) attached. Add a message or send...`
                  : "Type your message..."
              }
              onCommandExecute={handleCommandExecute}
            />
          </div>
        </footer>
      </div>

      {/* Dialog for Delete Thread or Report Message */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open)
          if (!open) {
            resetDialogStates()
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialogAction === "delete-thread" ? "Delete Thread?" : "Report Message?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialogAction === "delete-thread" 
                ? "This action cannot be undone. This will permanently delete the chat and all its messages."
                : "Thank you for helping us maintain quality. Please confirm you want to report this message."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={resetDialogStates}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className={dialogAction === "delete-thread" 
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""}
            >
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {dialogAction === "delete-thread" ? "Delete" : "Report"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
