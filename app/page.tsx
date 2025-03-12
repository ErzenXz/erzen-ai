"use client"

import { useState, useCallback, useEffect } from "react"
import { 
  Globe, Brain, Loader2, FolderRoot, ArrowLeft, Clock, MessageSquarePlus, 
  FolderPlus 
} from "lucide-react"
import { readFileAsText } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ProjectWorkspace } from "@/components/project/project-workspace"
import { ProjectProvider } from "@/hooks/use-project"
import { useChat } from "@/hooks/use-chat"
import { useAuth } from "@/hooks/use-auth"
import { ChatMessage } from "@/components/page/main/chat-message"
import { ChatThreadList } from "@/components/page/sidebar/chat-thread-list"
import { ModelSelector } from "@/components/page/main/model-selector"
import { FileUpload } from "@/components/page/main/chat-input/file-upload"
import { ChatInput } from "@/components/page/main/chat-input/chat-input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { basename } from "path"
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

export default function Home() {
  const {
    threads,
    projectThreads,
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
    projects,
    currentProjectId,
    selectProject,
    selectProjectThread,
    currentProjectThreadId
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
  const [showAllProjects, setShowAllProjects] = useState(false)
  const [showProjectsGrid, setShowProjectsGrid] = useState(false)

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
    e.preventDefault();
    
    // Use blocks for early returns
    if ((!message.trim() && uploadedFiles.length === 0) || !selectedModel || !user) {
      return;
    }
    
    if (isProcessingFiles) {
      return;
    }

    try {
      setIsProcessingFiles(true)
      let content = message

      // If there are files, add their content to the message
      if (uploadedFiles.length > 0) {
        const fileContents = await Promise.all(
          uploadedFiles.map(async (file) => {

            try {
              const text = await readFileAsText(file);
              if (!text) { return "No content" }
              return `(${file.name})\n------------------\n${typeof text === "string" ? text : JSON.stringify(text, null, 2)}\n------------------\n`
            } catch (error) {
              return `(${file.name})\n------------------\nError reading file: ${error instanceof Error ? error.message : "Unknown error"}\n------------------\n`
            }
          }),
        )

        content = fileContents.join(" ") + (message ? "\n\n" + message : "")
      }

      setMessage("")
      setUploadedFiles([])
      setShowFileUpload(false)
      setIsEditingMessage(null)
      await sendMessage(content, selectedModel, browseMode, reasoning)
      toast({
        title: "Message Sent",
        description: "Your message was sent successfully",
      })
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

  const handleRegenerateMessage = async () => {
    if (!currentThread?.messages.length) {
      return
    }

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

  const handleProjectSelect = (projectId: string) => {
    setShowProjectsGrid(false);
    selectProject(projectId);
  }
  
  const handleProjectThreadSelect = (threadId: string) => {
    selectProjectThread(threadId);
  }
  
  const handleBackToProjects = () => {
    selectProject(null);
    setShowProjectsGrid(true);
  }
  
  const handleViewProjects = () => {
    setShowProjectsGrid(true);
    
    if (currentThread?.id && currentThread.id !== 'new') {
      setCurrentThread(null);
    }
    
    if (currentProjectId) {
      selectProject(null);
    }
    
    if (currentProjectThreadId) {
      selectProjectThread(null);
    }
  }

  // Show limited number of projects in grid view
  const displayProjects = showAllProjects ? projects : projects.slice(0, 7);

  // Helper to get placeholder text
  const getInputPlaceholder = (): string => {
    if (!selectedModel) {
      return "Select a model to start...";
    }
    if (uploadedFiles.length > 0) {
      return `${uploadedFiles.length} file(s) attached. Add a message or send...`;
    }
    return "Type your message...";
  }

  // Reset states when dialog closes to prevent state inconsistency
  useEffect(() => {
    return () => {
      resetDialogStates();
    };
  }, [resetDialogStates]);

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <ChatThreadList
        threads={threads}
        currentThreadId={currentThread?.id ?? null}
        onThreadSelect={(id) => {
          setShowProjectsGrid(false);
          setCurrentThread(id);
        }}
        onNewThread={() => {
          setShowProjectsGrid(false);
          createThread();
        }}
        onRenameThread={handleRenameThread}
        onDuplicateThread={handleDuplicateThread}
        onDeleteThread={handleDeleteThread}
        onLoadMore={loadMoreThreads}
        hasMore={hasMore}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        projects={projects}
        onViewProjects={handleViewProjects}
      />

      <div className="flex-1 flex flex-col">
        <header className="border-b p-4">
          {/* Chat mode header with model selector */}
          {!showProjectsGrid && !currentProjectId && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
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
                          setBrowseMode(checked);
                          if (!checked) {
                            setReasoning(false);
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Projects view header - simple title */}
          {showProjectsGrid && (
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Projects</h2>
              <Button variant="outline" onClick={() => setShowAllProjects(!showAllProjects)}>
                {showAllProjects ? 'Show Less' : 'Show All'} 
                {!showAllProjects && projects.length > 7 && <span className="ml-1 opacity-60">({projects.length - 7} more)</span>}
              </Button>
            </div>
          )}

          {/* Project threads view header - just back button and title */}
          {currentProjectId && !currentProjectThreadId && !showProjectsGrid && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={handleBackToProjects} 
                  className="hover:bg-primary/5 transition-colors">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Projects
                </Button>
                <h2 className="text-lg font-semibold">
                  {projects.find(p => p.id === currentProjectId)?.name}
                </h2>
              </div>
              <Button size="sm" onClick={() => {}} className="bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary">
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                New Thread
              </Button>
            </div>
          )}

          {/* Project workspace header */}
          {currentProjectId && currentProjectThreadId && (
            <div className="flex items-center justify-between">
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
                <h2 className="text-lg font-semibold">
                  {projectThreads.find(t => t.id === currentProjectThreadId)?.title ?? "Untitled Thread"}
                </h2>
              </div>
              <ModelSelector value={selectedModel} onChange={setSelectedModel} />
            </div>
          )}
        </header>

        {/* Show project workspace when a project is selected */}
        {currentProjectId && !currentProjectThreadId && !showProjectsGrid ? (
          <ProjectProvider initialProjectId={currentProjectId}>
            <ProjectWorkspace />
          </ProjectProvider>
        ) : (
          <ScrollArea className="flex-1 p-4">
            <div className="max-w-5xl mx-auto">
              {/* Show projects grid if requested */}
              {showProjectsGrid && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                    {displayProjects.map((project) => (
                      <Card 
                        key={project.id} 
                        className="hover:bg-accent/50 transition-colors hover:shadow-md cursor-pointer overflow-hidden border group"
                        onClick={() => handleProjectSelect(project.id)}
                      >
                        <div className="bg-primary/5 h-2 group-hover:bg-primary/20 transition-colors"></div>
                        <div className="p-5 flex flex-col gap-2 h-full">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center transition-all group-hover:scale-110 group-hover:bg-primary/15">
                              <FolderRoot className="text-primary w-6 h-6" />
                            </div>
                            <div className="font-medium text-lg truncate">{project.name}</div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-2 min-h-[2.5rem]">
                            {project.description || "No description provided for this project"}
                          </p>
                          
                          <div className="mt-auto pt-4 flex flex-col gap-3">
                            <div className="flex gap-2">
                              <Badge variant="outline" className="bg-primary/5 text-primary text-xs hover:bg-primary/10">
                                {project._count?.threads ?? 0} threads
                              </Badge>
                              <Badge variant="outline" className="bg-muted/50 text-xs">
                                {project._count?.files ?? 0} files
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              Updated {new Date(project.updatedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}

                    <Card 
                      className="hover:bg-accent/50 transition-colors cursor-pointer border-dashed border-2 hover:border-primary/30"
                      onClick={() => {}}
                    >
                      <div className="flex items-center justify-center h-full p-6">
                        <div className="text-center">
                          <div className="bg-primary/10 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-3">
                            <FolderPlus className="h-6 w-6 text-primary" />
                          </div>
                          <p className="font-medium mb-1">Create New Project</p>
                          <p className="text-sm text-muted-foreground">Start a new AI-assisted project</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              )}
              
              {/* Empty state with welcome message when no content is selected */}
              {!showProjectsGrid && !currentProjectId && !currentThread?.id && (
                <div className="flex flex-col items-center justify-center h-full py-20">
                  <div className="relative">
                    <div className="absolute -z-10 inset-0 bg-primary/5 blur-3xl rounded-full"></div>
                    <div className="bg-gradient-to-b from-primary/20 to-primary/5 h-24 w-24 rounded-full flex items-center justify-center mx-auto mb-6">
                      <FolderRoot className="w-10 h-10 text-primary" />
                    </div>
                  </div>
                  <h2 className="text-3xl font-bold mb-3">Welcome to Erzen AI</h2>
                  <p className="text-muted-foreground text-center max-w-md mb-8">
                    Create a new project or start a chat to begin working with AI
                  </p>
                  <div className="flex gap-3">
                    <Button onClick={() => {}}>
                      <FolderPlus className="w-4 h-4 mr-2" />
                      Create Project
                    </Button>
                    <Button variant="outline" onClick={() => createThread()}>
                      <MessageSquarePlus className="w-4 h-4 mr-2" />
                      New Chat
                    </Button>
                  </div>
                </div>
              )}

              {/* Show thread messages */}
              {(currentThread?.id || currentProjectThreadId) && (
                <div className="space-y-4">
                  {currentProjectId && currentProjectThreadId && (
                    <Button variant="ghost" size="sm" onClick={() => {
                      // Use null instead of empty string to avoid triggering API call
                      selectProjectThread(null);
                    }} >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Project Threads
                    </Button>
                  )}
                  
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

                </div>
              )} 
            </div>
          </ScrollArea>
        )}
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
