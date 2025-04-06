"use client"

import * as React from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MessageSquareText, Plus, Loader2,  CalendarDays, User, ArrowLeft, CheckCircle2, InfinityIcon } from "lucide-react"
import type { Message } from "@/lib/types"
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
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { fetchThreadMessages, processAgentInstruction } from "@/lib/api"
import { Badge } from "@/components/ui/badge"

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
          // Sort messages by createdAt timestamp, oldest first
          const sortedMessages = [...threadMessages].sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeA - timeB;
          })
          setMessages(sortedMessages)
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
            <div key={index} className="bg-background/40 rounded-lg p-4 text-sm border border-primary/10 backdrop-blur-sm hover:border-primary/20 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                </div>
                <span className="font-semibold text-foreground/90">{action.type.charAt(0).toUpperCase() + action.type.slice(1)}</span>
                <span className="text-muted-foreground">-</span>
                <span className="font-mono text-xs bg-primary/10 px-2 py-0.5 rounded-md text-primary/90 truncate max-w-[160px] sm:max-w-[300px]">{action.filePath}</span>
              </div>
              {action.commitMsg && (
                <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5 pl-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/30"></span>
                  <span className="break-words">{action.commitMsg}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className="text-sm whitespace-pre-wrap leading-relaxed break-words">{message.content}</div>
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
        <div className="border-b p-4 bg-muted/5 backdrop-blur-sm">
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => selectProjectThread(null)}
                className="hover:bg-primary/5 transition-colors rounded-lg"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Threads
              </Button>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground truncate max-w-[240px] sm:max-w-md">{currentThread.title}</h2>
                <Badge className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors rounded-full px-2 py-0.5 text-xs">Active</Badge>
              </div>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-8 max-w-5xl mx-auto">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/5 blur-xl rounded-full"></div>
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent relative"></div>
                </div>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-4">
                  <MessageSquareText className="h-8 w-8 text-muted-foreground opacity-70" />
                </div>
                <h3 className="text-lg font-medium mb-2">No messages in this thread yet</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  Start the conversation by sending a message or instruction below
                </p>
              </div>
            ) : (
              filteredMessages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex items-start gap-4 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role !== "user" && (
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center ring-1 ring-primary/20 shadow-sm">
                        <InfinityIcon className="h-5 w-5 text-primary drop-shadow-sm" />
                      </div>
                    </div>
                  )}
                  
                  <div
                    className={`relative flex flex-col max-w-[85%] rounded-2xl px-5 py-4 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground ml-12 shadow-sm"
                        : "bg-gradient-to-br from-muted/30 to-muted/10 backdrop-blur-sm border border-border/40 mr-12 shadow-sm"
                    }`}
                  >
                    <div className="text-sm font-medium mb-2 flex items-center gap-2">
                      {message.role === "user" ? (
                        <>
                          <User className="h-3.5 w-3.5" />
                          <span>You</span>
                          {message.createdAt && (
                            <>
                              <span className="mx-1.5 text-primary-foreground/50">•</span>
                              <span className="text-xs opacity-70">{new Date(message.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="font-semibold">Agent</span>
                          {message.createdAt && (
                            <>
                              <span className="mx-1.5 opacity-50">•</span>
                              <span className="text-xs opacity-70">{new Date(message.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </>
                          )}
                        </>
                      )}
                    </div>
                    {renderMessage(message)}
                  </div>

                  {message.role === "user" && (
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
                        <User className="h-5 w-5 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* AI Assistant Input */}
        <div className="border-t p-4 bg-muted/5 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-5xl mx-auto">
            <div className="flex-1 min-w-0">
              <Input
                type="text"
                placeholder="Ask AI to help with your code... (e.g., 'Create a login form')"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full text-sm bg-background/70 focus-visible:ring-primary/20 border-muted rounded-xl pl-4 pr-4 py-2 h-10 shadow-sm"
              />
            </div>
            <Button 
              type="submit" 
              className="flex-shrink-0 rounded-xl bg-primary/90 hover:bg-primary shadow-sm transition-all duration-150 hover:shadow" 
              disabled={isLoading}
            >
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
                className="hover:bg-accent/50 transition-all duration-200 cursor-pointer group hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5"
                onClick={() => selectProjectThread(thread.id)}
              >
                <CardHeader className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate group-hover:text-primary transition-colors line-clamp-1">{thread.title}</CardTitle>
                      <CardDescription className="text-xs mt-1 flex items-center gap-1.5">
                        <CalendarDays className="h-3 w-3" />
                        {new Date(thread.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <MessageSquareText className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}

            {/* New Thread Card */}
            <Card
              className="hover:bg-accent/50 transition-all duration-200 cursor-pointer border-dashed group hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5 bg-muted/5"
              onClick={() => {
                // Open dialog for new thread
                setInputValue("")
                setIsCreatingThread(true)
              }}
            >
              <CardHeader className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base flex items-center gap-2 group-hover:text-primary transition-colors">
                      <Plus className="h-4 w-4" />
                      New Thread
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">Start a new conversation</CardDescription>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
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
        <DialogContent className="sm:max-w-[425px] rounded-xl border-muted/30 shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">New Thread</DialogTitle>
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
                className="w-full rounded-lg border-muted"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreatingThread(false)}
                className="rounded-lg"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!inputValue.trim() || isLoading}
                className="rounded-lg bg-primary/90 hover:bg-primary"
              >
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
      <div className="border-t p-4 bg-muted/5 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-4xl mx-auto">
          <div className="flex-1 min-w-0">
            <Input
              type="text"
              placeholder="Ask AI to help with your code... (e.g., 'Create a login form')"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full text-sm bg-background/70 focus-visible:ring-primary/20 border-muted rounded-xl pl-4 pr-4 py-2 h-10 shadow-sm"
            />
          </div>
          <Button 
            type="submit" 
            className="flex-shrink-0 rounded-xl bg-primary/90 hover:bg-primary shadow-sm transition-all duration-150 hover:shadow" 
            disabled={isLoading}
          >
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

