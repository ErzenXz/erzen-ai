"use client"

import * as React from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  MessageSquareText,
  Plus,
  Loader2,
  Search,
  CalendarDays,
  ChevronLeft
} from "lucide-react"
import { SingleProjectThread } from "@/lib/types"
import { useProject } from "@/hooks/use-project"
import { toast } from "@/hooks/use-toast"
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogFooter, DialogDescription
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

export function ProjectThreadsView() {
  const { currentProject, currentThread, loadThread, setCurrentThread } = useProject()
  const [threads, setThreads] = React.useState<SingleProjectThread[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [isLoadingThread, setIsLoadingThread] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [showNewThreadDialog, setShowNewThreadDialog] = React.useState(false)
  const [newThreadTitle, setNewThreadTitle] = React.useState("")
  const [threadMessages, setThreadMessages] = React.useState<any[]>([])
  const [agentInstruction, setAgentInstruction] = React.useState("")
  const [isProcessing, setIsProcessing] = React.useState(false)

  const fetchProjectThreads = React.useCallback(async () => {
    setIsLoading(true)
    try {
      // In a real implementation, you would fetch threads from the API
      // For now, we're just simulating it
      if (currentProject && 'threads' in currentProject) {
        // @ts-ignore - We know the shape might not match exactly
        setThreads(currentProject.threads || [])
      } else {
        // Create mock threads for demo purposes if none exist
        const mockThreads = [
          {
            id: "thread_1",
            title: "Getting started with the project",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            userId: "user_1",
            projectId: currentProject?.id || "",
          },
          {
            id: "thread_2",
            title: "API integration questions",
            createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            updatedAt: new Date(Date.now() - 86400000).toISOString(),
            userId: "user_1",
            projectId: currentProject?.id || "",
          },
          {
            id: "thread_3",
            title: "UI design feedback",
            createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
            updatedAt: new Date(Date.now() - 172800000).toISOString(),
            userId: "user_1",
            projectId: currentProject?.id || "",
          }
        ]
        setThreads(mockThreads)
      }
    } catch (error) {
      console.error("Error fetching project threads:", error)
      toast({
        title: "Failed to load threads",
        description: "Could not load threads for this project.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [currentProject])

  // Fetch threads when component mounts or project changes
  React.useEffect(() => {
    if (currentProject?.id) {
      fetchProjectThreads()
    }
  }, [currentProject?.id, fetchProjectThreads])

  const handleCreateThread = async () => {
    if (!newThreadTitle.trim() || !currentProject) {
      return
    }

    try {
      // In a real implementation, you would call an API to create a new thread
      const newThread: SingleProjectThread = {
        id: `thread_${Date.now()}`,
        title: newThreadTitle,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: "current-user-id", // This would come from auth context
        projectId: currentProject.id,
      }

      setThreads((prevThreads) => [newThread, ...prevThreads])
      setShowNewThreadDialog(false)
      setNewThreadTitle("")

      toast({
        title: "Thread created",
        description: "New thread was created successfully.",
      })

    } catch (error) {
      console.error("Error creating thread:", error)
      toast({
        title: "Error",
        description: "Failed to create new thread.",
        variant: "destructive",
      })
    }
  }

  const handleOpenThread = async (threadId: string) => {
    setIsLoadingThread(true)
    try {
      const thread = await loadThread(threadId)
      if (thread) {
        // In a real implementation, you would fetch messages for this thread
        // Simulate fetching messages
        await new Promise((resolve) => setTimeout(resolve, 300))
        
        // Create mock messages for demo purposes
        const mockMessages = [
          {
            id: `msg_${Date.now()}_1`,
            content: "Hello! How can I help with the project today?",
            role: "assistant",
            timestamp: new Date(Date.now() - 3600000), // 1 hour ago
            chatId: threadId
          },
          {
            id: `msg_${Date.now()}_2`,
            content: "I need help understanding how the authentication system works.",
            role: "user",
            timestamp: new Date(Date.now() - 3500000), // 58 minutes ago
            chatId: threadId
          },
          {
            id: `msg_${Date.now()}_3`,
            content: "The authentication system uses JWT tokens for authorization. When a user logs in, the server creates a token that contains their user ID and role, which is then sent back to the client. The client includes this token in the Authorization header for all subsequent requests.\n\nHere's a simplified example of how it works:\n\n```javascript\n// Login request\nasync function login(username, password) {\n  const response = await fetch('/api/auth/login', {\n    method: 'POST',\n    body: JSON.stringify({ username, password })\n  });\n  const { token } = await response.json();\n  localStorage.setItem('authToken', token);\n}\n\n// Authenticated request\nasync function fetchProtectedData() {\n  const token = localStorage.getItem('authToken');\n  const response = await fetch('/api/protected', {\n    headers: {\n      Authorization: `Bearer ${token}`\n    }\n  });\n  return response.json();\n}\n```\n\nDoes this help clarify how the authentication works?",
            role: "assistant",
            timestamp: new Date(Date.now() - 3400000), // 56 minutes ago
            chatId: threadId
          }
        ]
        
        setThreadMessages(mockMessages)
      }
    } catch (error) {
      console.error("Error opening thread:", error)
      toast({
        title: "Error",
        description: "Failed to load thread.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingThread(false)
    }
  }

  const handleBackToThreads = () => {
    setCurrentThread(null)
    setThreadMessages([])
  }

  const handleAgentSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!agentInstruction.trim()) {
      return;
    }

    setIsProcessing(true)

    // Simulate AI processing
    setTimeout(() => {
      // Add the user message to the thread
      const userMessage = {
        id: `msg_${Date.now()}_user`,
        content: agentInstruction,
        role: "user",
        timestamp: new Date(),
        chatId: currentThread?.id
      }
      
      setThreadMessages(prev => [...prev, userMessage])
      
      // Clear the input
      setAgentInstruction("")
      
      // Simulate AI response after a delay
      setTimeout(() => {
        const aiMessage = {
          id: `msg_${Date.now()}_ai`,
          content: `I'm processing your query about: "${agentInstruction}"`,
          role: "assistant",
          timestamp: new Date(),
          chatId: currentThread?.id
        }
        
        setThreadMessages(prev => [...prev, aiMessage])
        setIsProcessing(false)
      }, 1000)
    }, 500)
  }

  const filteredThreads = threads
    .filter(thread => thread.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  // If a thread is selected, show the thread view
  if (currentThread) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b flex items-center">
          <Button 
            variant="ghost" 
            size="sm"
            className="mr-2"
            onClick={handleBackToThreads}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h3 className="font-medium">{currentThread.title}</h3>
            <p className="text-xs text-muted-foreground">
              {new Date(currentThread.updatedAt).toLocaleDateString()} 
              {' '}
              {new Date(currentThread.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          {isLoadingThread ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-6 pb-4">
                {threadMessages.map((message) => (
                  <div 
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[80%] rounded-lg p-4 ${
                        message.role === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}
                    >
                      <div className="prose dark:prose-invert" 
                        dangerouslySetInnerHTML={{ __html: message.content.replace(/\n/g, '<br/>') }} 
                      />
                      <div className="mt-2 text-xs opacity-70">
                        {new Date(message.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Add the input box inside the thread view */}
          <div className="border-t p-3 flex-shrink-0">
            <form onSubmit={handleAgentSubmit} className="flex gap-2 w-full max-w-full">
              <Input
                placeholder="Ask AI about this project..."
                value={agentInstruction}
                onChange={(e) => setAgentInstruction(e.target.value)}
                className="flex-1 min-w-0 text-sm"
                disabled={isProcessing}
              />
              <Button 
                type="submit" 
                className="flex-shrink-0" 
                disabled={isProcessing || !agentInstruction.trim()}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <MessageSquareText className="h-4 w-4 mr-2" />
                )}
                Send
              </Button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search threads..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredThreads.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <MessageSquareText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No threads found</h3>
            <p className="text-muted-foreground mt-2">
              {searchQuery 
                ? "Try a different search term" 
                : "Create a new thread to start a conversation"}
            </p>
            <Button 
              variant="outline" 
              className="mt-6"
              onClick={() => setShowNewThreadDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Thread
            </Button>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredThreads.map((thread) => (
                <div
                  key={thread.id}
                  className="border rounded-lg hover:bg-accent cursor-pointer transition-colors flex flex-col"
                  onClick={() => handleOpenThread(thread.id)}
                >
                  <div className="p-4 border-b flex-1">
                    <h4 className="font-medium line-clamp-2">{thread.title}</h4>
                  </div>
                  <div className="p-3 flex items-center text-xs text-muted-foreground bg-muted/30">
                    <div className="flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>
                        {new Date(thread.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      )}

      {/* New Thread Dialog */}
      <Dialog open={showNewThreadDialog} onOpenChange={setShowNewThreadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Thread</DialogTitle>
            <DialogDescription>
              Enter a title for your new thread.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Thread title"
            value={newThreadTitle}
            onChange={(e) => setNewThreadTitle(e.target.value)}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewThreadDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateThread} 
              disabled={!newThreadTitle.trim()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}