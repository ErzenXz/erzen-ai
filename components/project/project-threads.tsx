"use client"

import * as React from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageSquareText, Plus, Loader2, Search, CalendarDays, ChevronLeft, Clock, User, ArrowLeft, FileCode, CheckCircle2, Brain, Sparkles } from "lucide-react"
import type { SingleProjectThread, Message } from "@/lib/types"
import { useProject } from "@/hooks/use-project"
import { toast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { fetchThreadMessages, processAgentInstruction } from "@/lib/api"

interface AgentAction {
  type: string
  filePath: string
  content: string
  fileType: string
  commitMsg?: string
}

// Helper function to parse agent messages
const parseAgentMessage = (content: string) => {
  try {
    const data = JSON.parse(content)
    if (data.agent === "execution-agent" && data.response?.actions) {
      return data.response.actions.map((action: AgentAction) => ({
        type: action.type,
        filePath: action.filePath,
        content: action.content,
        fileType: action.fileType,
        commitMsg: action.commitMsg
      }))
    }
    return null
  } catch {
    return null
  }
}

export function ProjectThreadsView() {
  const { projectThreads, selectProjectThread, currentThread, currentProject } = useProject()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [isCreatingThread, setIsCreatingThread] = useState(false)

  // Load thread messages when a thread is selected
  useEffect(() => {
    const loadThreadMessages = async () => {
      if (currentThread) {
        setIsLoading(true)
        try {
          const threadMessages = await fetchThreadMessages(currentThread.id)
          setMessages(threadMessages)
        } catch (error) {
          console.error("Failed to load thread messages:", error)
        } finally {
          setIsLoading(false)
        }
      } else {
        setMessages([])
      }
    }

    loadThreadMessages()
  }, [currentThread])

  const handleCreateThread = async (instruction: string) => {
    if (!currentProject?.id) return

    setIsCreatingThread(true)
    try {
      const response = await processAgentInstruction(currentProject.id, instruction)
      
      // If the response contains a threadId, it means a new thread was created
      if (response.threadId) {
        // Select the new thread
        selectProjectThread(response.threadId)
        
        // If there are messages in the response, add them to our messages state
        if (response.messages) {
          setMessages(response.messages)
        }

        toast({
          title: "New Thread Created",
          description: "Your conversation has started",
        })
      }
    } catch (error) {
      console.error("Failed to create thread:", error)
      toast({
        title: "Error",
        description: "Failed to create new thread. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreatingThread(false)
      setInputValue("")
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return
    handleCreateThread(inputValue.trim())
  }

  const renderMessage = (message: Message) => {
    const agentActions = parseAgentMessage(message.content)
    
    if (message.role === "system" && agentActions) {
      return (
        <div className="space-y-3">
          {agentActions.map((action: AgentAction, index: number) => (
            <div key={index} className="bg-primary/5 rounded-lg p-4 text-sm border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="font-medium">{action.type.charAt(0).toUpperCase() + action.type.slice(1)}</span>
                <span className="text-muted-foreground">-</span>
                <span className="font-mono text-xs bg-primary/10 px-2 py-0.5 rounded">{action.filePath}</span>
              </div>
              {action.commitMsg && (
                <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/20"></span>
                  {action.commitMsg}
                </div>
              )}
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className="text-sm whitespace-pre-wrap">{message.content}</div>
    )
  }

  // Filter messages to only show user and execution agent messages
  const filteredMessages = messages.filter(message => 
    message.role === "user" || 
    (message.role === "system" && parseAgentMessage(message.content))
  )

  if (currentThread) {
    return (
      <div className="h-full flex flex-col">
        <div className="border-b p-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => selectProjectThread(null)}
              className="hover:bg-primary/5 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Threads
            </Button>
            <h2 className="text-lg font-semibold">{currentThread.title}</h2>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6 max-w-4xl mx-auto">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No messages in this thread yet
              </div>
            ) : (
              filteredMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role !== "user" && (
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                        <Brain className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                  )}
                  
                  <div
                    className={`relative flex flex-col max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground ml-12"
                        : "bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50 mr-12 shadow-sm"
                    }`}
                  >
                    <div className="text-sm font-medium mb-1 flex items-center gap-2">
                      {message.role === "user" ? (
                        <>
                          <User className="h-3.5 w-3.5" />
                          You
                        </>
                      ) : (
                        <>
                          <Brain className="h-3.5 w-3.5 text-primary" />
                          Agent
                        </>
                      )}
                    </div>
                    {renderMessage(message)}
                  </div>

                  {message.role === "user" && (
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/90 flex items-center justify-center ring-1 ring-primary/20">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* AI Assistant Input */}
        <div className="border-t p-4 bg-muted/20">
          <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-4xl mx-auto">
            <div className="flex-1 min-w-0">
              <Input
                type="text"
                placeholder="Ask AI to help with your code... (e.g., 'Create a login form')"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full text-sm"
              />
            </div>
            <Button type="submit" className="flex-shrink-0" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <MessageSquareText className="h-4 w-4 mr-2" />
                  Send
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-[1400px] mx-auto">
            {projectThreads.map((thread) => (
              <Card
                key={thread.id}
                className="hover:bg-accent/50 transition-colors cursor-pointer group"
                onClick={() => selectProjectThread(thread.id)}
              >
                <CardHeader className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{thread.title}</CardTitle>
                      <CardDescription className="text-xs mt-1 flex items-center gap-1.5">
                        <CalendarDays className="h-3 w-3" />
                        {new Date(thread.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <MessageSquareText className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}

            {/* New Thread Card */}
            <Card
              className="hover:bg-accent/50 transition-colors cursor-pointer border-dashed group"
              onClick={() => {
                // Open dialog for new thread
                setInputValue("")
                setIsCreatingThread(true)
              }}
            >
              <CardHeader className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      New Thread
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">Start a new conversation</CardDescription>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Plus className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>
      </ScrollArea>

      {/* New Thread Dialog */}
      <Dialog open={isCreatingThread} onOpenChange={setIsCreatingThread}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>New Thread</DialogTitle>
            <DialogDescription>
              What would you like help with? The AI will assist you with your request.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="e.g., Create a login form, Fix a bug in my code..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreatingThread(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!inputValue.trim() || isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Thread
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AI Assistant Input */}
      <div className="border-t p-4 bg-muted/20">
        <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-4xl mx-auto">
          <div className="flex-1 min-w-0">
            <Input
              type="text"
              placeholder="Ask AI to help with your code... (e.g., 'Create a login form')"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full text-sm"
            />
          </div>
          <Button type="submit" className="flex-shrink-0" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <MessageSquareText className="h-4 w-4 mr-2" />
                Send
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}

