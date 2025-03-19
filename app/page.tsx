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
import { ProjectGrid } from "@/components/project/project-grid"
import { ProjectProvider } from "@/hooks/use-project"
import { ProjectCreationDialog } from "@/components/project/project-creation-dialog"
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
  const [showProjectsGrid, setShowProjectsGrid] = useState(false)
  const [showProjectDialog, setShowProjectDialog] = useState(false)

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

  const handleProjectSelect = async (projectId: string) => {
    // Hide the projects grid and select the project
    setShowProjectsGrid(false);
    await selectProject(projectId);
    
    // Any messages or threads should also be cleared
    if (currentThread?.id) {
      setCurrentThread(null);
    }
    
    // Make sure we're showing the project workspace view
    if (currentProjectThreadId) {
      selectProjectThread(null);
    }
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
    <>
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
          onProjectSelect={handleProjectSelect}
          onNewProject={() => setShowProjectDialog(true)}
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
                </div>
              </div>
            )}
            
            {/* Projects view header - simple title */}
            {showProjectsGrid && (
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Projects</h2>
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
                    <ProjectGrid 
                      projects={projects}
                      onProjectSelect={handleProjectSelect}
                      onCreateProject={() => {
                        // Handle creating a new project
                        toast({
                          title: "Create Project",
                          description: "Project creation feature coming soon",
                        })
                      }}
                      onToggleStar={(projectId, starred) => {
                        // Handle starring projects
                        toast({
                          title: starred ? "Project Starred" : "Project Unstarred",
                          description: `Project has been ${starred ? "starred" : "unstarred"}`,
                        })
                      }}
                    />
                  </div>
                )}
                
                {/* Empty state with welcome message when no content is selected */}
                {!showProjectsGrid && !currentProjectId && !currentThread?.id && (
                  <div className="flex flex-col items-center justify-center h-full py-8">
                    <div className="relative">
                      <div className="absolute -z-10 inset-0 bg-primary/5 blur-3xl rounded-full"></div>
                      <div className="bg-gradient-to-b from-primary/20 to-primary/5 h-24 w-24 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FolderRoot className="w-10 h-10 text-primary" />
                      </div>
                    </div>
                    <h2 className="text-3xl font-bold mb-3">Welcome to Erzen AI</h2>
                    <p className="text-muted-foreground text-center max-w-md mb-2">
                      Create a new project or start a chat to begin working with AI
                    </p>
                    <div className="flex gap-3 mb-10">
                      <Button onClick={() => setShowProjectDialog(true)}>
                        <FolderPlus className="w-4 h-4 mr-2" />
                        Create Project
                      </Button>
                      <Button variant="outline" onClick={() => createThread()}>
                        <MessageSquarePlus className="w-4 h-4 mr-2" />
                        New Chat
                      </Button>
                    </div>
                    
                    <div className="w-full max-w-4xl">
                      <h3 className="text-xl font-semibold text-center mb-6">How can I help you?</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Create Category */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="px-3 py-1 text-primary border-primary/30 bg-primary/5">
                              Create
                            </Badge>
                          </div>
                          
                          <Card className="p-4 cursor-pointer hover:bg-accent/50 transition-colors border-primary/10 hover:border-primary/30" 
                            onClick={() => {
                              createThread();
                              setMessage("Write a short story about a robot learning to love");
                            }}>
                            <p className="font-medium">Write a short story about...</p>
                            <p className="text-sm text-muted-foreground">Generate creative stories in any genre or style</p>
                          </Card>
                          
                          <Card className="p-4 cursor-pointer hover:bg-accent/50 transition-colors border-primary/10 hover:border-primary/30" 
                            onClick={() => {
                              createThread();
                              setMessage("Write a blog post about the future of AI");
                            }}>
                            <p className="font-medium">Write a blog post about...</p>
                            <p className="text-sm text-muted-foreground">Create well-structured articles on any topic</p>
                          </Card>
                          
                          <Card className="p-4 cursor-pointer hover:bg-accent/50 transition-colors border-primary/10 hover:border-primary/30" 
                            onClick={() => {
                              createThread();
                              setMessage("Generate 5 creative marketing slogans for a sustainable clothing brand");
                            }}>
                            <p className="font-medium">Generate marketing ideas for...</p>
                            <p className="text-sm text-muted-foreground">Brainstorm creative marketing content</p>
                          </Card>
                        </div>
                        
                        {/* Explore Category */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="px-3 py-1 text-blue-500 border-blue-500/30 bg-blue-500/5">
                              Explore
                            </Badge>
                          </div>
                          
                          <Card className="p-4 cursor-pointer hover:bg-accent/50 transition-colors border-blue-500/10 hover:border-blue-500/30" 
                            onClick={() => {
                              createThread();
                              setMessage("Explain quantum computing in simple terms");
                            }}>
                            <p className="font-medium">Explain a complex topic...</p>
                            <p className="text-sm text-muted-foreground">Get simple explanations for difficult concepts</p>
                          </Card>
                          
                          <Card className="p-4 cursor-pointer hover:bg-accent/50 transition-colors border-blue-500/10 hover:border-blue-500/30" 
                            onClick={() => {
                              createThread();
                              setBrowseMode(true);
                              setMessage("What are the latest developments in renewable energy?");
                            }}>
                            <p className="font-medium">Research current trends in...</p>
                            <p className="text-sm text-muted-foreground">Discover the latest information on any subject</p>
                          </Card>
                          
                          <Card className="p-4 cursor-pointer hover:bg-accent/50 transition-colors border-blue-500/10 hover:border-blue-500/30" 
                            onClick={() => {
                              createThread();
                              setMessage("Compare the pros and cons of React vs. Vue");
                            }}>
                            <p className="font-medium">Compare and contrast...</p>
                            <p className="text-sm text-muted-foreground">Get balanced analysis of different options</p>
                          </Card>
                        </div>
                        
                        {/* Code Category */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="px-3 py-1 text-green-500 border-green-500/30 bg-green-500/5">
                              Code
                            </Badge>
                          </div>
                          
                          <Card className="p-4 cursor-pointer hover:bg-accent/50 transition-colors border-green-500/10 hover:border-green-500/30" 
                            onClick={() => {
                              createThread();
                              setMessage("Write a React component for a responsive image gallery");
                            }}>
                            <p className="font-medium">Write a component for...</p>
                            <p className="text-sm text-muted-foreground">Generate code for specific UI components</p>
                          </Card>
                          
                          <Card className="p-4 cursor-pointer hover:bg-accent/50 transition-colors border-green-500/10 hover:border-green-500/30" 
                            onClick={() => {
                              createThread();
                              setMessage("Debug this code: [paste your code here]");
                            }}>
                            <p className="font-medium">Debug my code...</p>
                            <p className="text-sm text-muted-foreground">Find and fix issues in your code</p>
                          </Card>
                          
                          <Card className="p-4 cursor-pointer hover:bg-accent/50 transition-colors border-green-500/10 hover:border-green-500/30" 
                            onClick={() => {
                              createThread();
                              setMessage("Explain how to implement authentication in a NextJS app");
                            }}>
                            <p className="font-medium">Explain how to implement...</p>
                            <p className="text-sm text-muted-foreground">Get step-by-step coding instructions</p>
                          </Card>
                        </div>
                        
                        {/* Learn Category */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="px-3 py-1 text-amber-500 border-amber-500/30 bg-amber-500/5">
                              Learn
                            </Badge>
                          </div>
                          
                          <Card className="p-4 cursor-pointer hover:bg-accent/50 transition-colors border-amber-500/10 hover:border-amber-500/30" 
                            onClick={() => {
                              createThread();
                              setMessage("Create a study plan for learning machine learning in 3 months");
                            }}>
                            <p className="font-medium">Create a study plan for...</p>
                            <p className="text-sm text-muted-foreground">Get personalized learning roadmaps</p>
                          </Card>
                          
                          <Card className="p-4 cursor-pointer hover:bg-accent/50 transition-colors border-amber-500/10 hover:border-amber-500/30" 
                            onClick={() => {
                              createThread();
                              setMessage("What are the most important concepts to understand in modern JavaScript?");
                            }}>
                            <p className="font-medium">What should I know about...</p>
                            <p className="text-sm text-muted-foreground">Discover essential knowledge in any field</p>
                          </Card>
                          
                          <Card className="p-4 cursor-pointer hover:bg-accent/50 transition-colors border-amber-500/10 hover:border-amber-500/30" 
                            onClick={() => {
                              createThread();
                              setMessage("Explain TypeScript generics with practical examples");
                            }}>
                            <p className="font-medium">Explain with examples...</p>
                            <p className="text-sm text-muted-foreground">Learn concepts with practical demonstrations</p>
                          </Card>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show templates for a new chat thread */}
                {currentThread?.id === 'new' && currentThread.messages.length === 0 && (
                  <div className="py-8">
                    <div className="relative mb-12 text-center">
                      <div className="absolute -z-10 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/5 blur-3xl rounded-full"></div>
                      <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">How can I help you?</h2>
                      <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Select a template or type your own message below</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Create Category */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="outline" className="px-4 py-1.5 text-lg font-medium text-primary border-primary/30 bg-primary/5 rounded-lg">
                            Create
                          </Badge>
                          <div className="h-px flex-1 bg-primary/10"></div>
                        </div>
                        
                        <Card className="p-5 cursor-pointer hover:bg-accent/50 transition-all duration-200 border-primary/10 hover:border-primary/30 hover:shadow-sm group" 
                          onClick={() => {
                            setMessage("Write a short story about a robot learning to love");
                          }}>
                          <p className="font-medium text-base group-hover:text-primary transition-colors">Write a short story about...</p>
                          <p className="text-sm text-muted-foreground mt-1">Generate creative stories in any genre or style</p>
                        </Card>
                        
                        <Card className="p-5 cursor-pointer hover:bg-accent/50 transition-all duration-200 border-primary/10 hover:border-primary/30 hover:shadow-sm group" 
                          onClick={() => {
                            setMessage("Write a blog post about the future of AI");
                          }}>
                          <p className="font-medium text-base group-hover:text-primary transition-colors">Write a blog post about...</p>
                          <p className="text-sm text-muted-foreground mt-1">Create well-structured articles on any topic</p>
                        </Card>
                        
                        <Card className="p-5 cursor-pointer hover:bg-accent/50 transition-all duration-200 border-primary/10 hover:border-primary/30 hover:shadow-sm group" 
                          onClick={() => {
                            setMessage("Generate 5 creative marketing slogans for a sustainable clothing brand");
                          }}>
                          <p className="font-medium text-base group-hover:text-primary transition-colors">Generate marketing ideas for...</p>
                          <p className="text-sm text-muted-foreground mt-1">Brainstorm creative marketing content</p>
                        </Card>
                      </div>
                      
                      {/* Explore Category */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="outline" className="px-4 py-1.5 text-lg font-medium text-blue-500 border-blue-500/30 bg-blue-500/5 rounded-lg">
                            Explore
                          </Badge>
                          <div className="h-px flex-1 bg-blue-500/10"></div>
                        </div>
                        
                        <Card className="p-5 cursor-pointer hover:bg-accent/50 transition-all duration-200 border-blue-500/10 hover:border-blue-500/30 hover:shadow-sm group" 
                          onClick={() => {
                            setMessage("Explain quantum computing in simple terms");
                          }}>
                          <p className="font-medium text-base group-hover:text-blue-500 transition-colors">Explain a complex topic...</p>
                          <p className="text-sm text-muted-foreground mt-1">Get simple explanations for difficult concepts</p>
                        </Card>
                        
                        <Card className="p-5 cursor-pointer hover:bg-accent/50 transition-all duration-200 border-blue-500/10 hover:border-blue-500/30 hover:shadow-sm group" 
                          onClick={() => {
                            setBrowseMode(true);
                            setMessage("What are the latest developments in renewable energy?");
                          }}>
                          <p className="font-medium text-base group-hover:text-blue-500 transition-colors">Research current trends in...</p>
                          <p className="text-sm text-muted-foreground mt-1">Discover the latest information on any subject</p>
                        </Card>
                        
                        <Card className="p-5 cursor-pointer hover:bg-accent/50 transition-all duration-200 border-blue-500/10 hover:border-blue-500/30 hover:shadow-sm group" 
                          onClick={() => {
                            setMessage("Compare the pros and cons of React vs. Vue");
                          }}>
                          <p className="font-medium text-base group-hover:text-blue-500 transition-colors">Compare and contrast...</p>
                          <p className="text-sm text-muted-foreground mt-1">Get balanced analysis of different options</p>
                        </Card>
                      </div>
                      
                      {/* Code Category */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="outline" className="px-4 py-1.5 text-lg font-medium text-green-500 border-green-500/30 bg-green-500/5 rounded-lg">
                            Code
                          </Badge>
                          <div className="h-px flex-1 bg-green-500/10"></div>
                        </div>
                        
                        <Card className="p-5 cursor-pointer hover:bg-accent/50 transition-all duration-200 border-green-500/10 hover:border-green-500/30 hover:shadow-sm group" 
                          onClick={() => {
                            setMessage("Write a React component for a responsive image gallery");
                          }}>
                          <p className="font-medium text-base group-hover:text-green-500 transition-colors">Write a component for...</p>
                          <p className="text-sm text-muted-foreground mt-1">Generate code for specific UI components</p>
                        </Card>
                        
                        <Card className="p-5 cursor-pointer hover:bg-accent/50 transition-all duration-200 border-green-500/10 hover:border-green-500/30 hover:shadow-sm group" 
                          onClick={() => {
                            setMessage("Debug this code: [paste your code here]");
                          }}>
                          <p className="font-medium text-base group-hover:text-green-500 transition-colors">Debug my code...</p>
                          <p className="text-sm text-muted-foreground mt-1">Find and fix issues in your code</p>
                        </Card>
                        
                        <Card className="p-5 cursor-pointer hover:bg-accent/50 transition-all duration-200 border-green-500/10 hover:border-green-500/30 hover:shadow-sm group" 
                          onClick={() => {
                            setMessage("Explain how to implement authentication in a NextJS app");
                          }}>
                          <p className="font-medium text-base group-hover:text-green-500 transition-colors">Explain how to implement...</p>
                          <p className="text-sm text-muted-foreground mt-1">Get step-by-step coding instructions</p>
                        </Card>
                      </div>
                      
                      {/* Learn Category */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="outline" className="px-4 py-1.5 text-lg font-medium text-amber-500 border-amber-500/30 bg-amber-500/5 rounded-lg">
                            Learn
                          </Badge>
                          <div className="h-px flex-1 bg-amber-500/10"></div>
                        </div>
                        
                        <Card className="p-5 cursor-pointer hover:bg-accent/50 transition-all duration-200 border-amber-500/10 hover:border-amber-500/30 hover:shadow-sm group" 
                          onClick={() => {
                            setMessage("Create a study plan for learning machine learning in 3 months");
                          }}>
                          <p className="font-medium text-base group-hover:text-amber-500 transition-colors">Create a study plan for...</p>
                          <p className="text-sm text-muted-foreground mt-1">Get personalized learning roadmaps</p>
                        </Card>
                        
                        <Card className="p-5 cursor-pointer hover:bg-accent/50 transition-all duration-200 border-amber-500/10 hover:border-amber-500/30 hover:shadow-sm group" 
                          onClick={() => {
                            setMessage("What are the most important concepts to understand in modern JavaScript?");
                          }}>
                          <p className="font-medium text-base group-hover:text-amber-500 transition-colors">What should I know about...</p>
                          <p className="text-sm text-muted-foreground mt-1">Discover essential knowledge in any field</p>
                        </Card>
                        
                        <Card className="p-5 cursor-pointer hover:bg-accent/50 transition-all duration-200 border-amber-500/10 hover:border-amber-500/30 hover:shadow-sm group" 
                          onClick={() => {
                            setMessage("Explain TypeScript generics with practical examples");
                          }}>
                          <p className="font-medium text-base group-hover:text-amber-500 transition-colors">Explain with examples...</p>
                          <p className="text-sm text-muted-foreground mt-1">Learn concepts with practical demonstrations</p>
                        </Card>
                      </div>
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
                    
                    {error && <div className="p-4 text-sm text-destructive bg-destructive/10 rounded-lg">{error}</div>}
                  </div>
                )} 
              </div>
            </ScrollArea>
          )}
          
          {/* Chat input footer - only show when in chat mode */}
          {!showProjectsGrid && (!currentProjectId || currentProjectThreadId) && (currentThread?.id || !currentProjectId) && (
            <footer className="border-t p-4">
              <div className="max-w-5xl mx-auto">
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
                      : getInputPlaceholder()
                  }
                  onCommandExecute={handleCommandExecute}
                />
              </div>
            </footer>
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

      {/* Project Creation Dialog */}
      <ProjectProvider>
        <ProjectCreationDialog 
          open={showProjectDialog} 
          onOpenChange={setShowProjectDialog}
          onProjectCreated={(projectId) => {
            // Close the dialog
            setShowProjectDialog(false);
            
            // Select the new project
            handleProjectSelect(projectId);
            
            toast({
              title: "Project created",
              description: "Your new project has been created successfully.",
            });
          }}
        />
      </ProjectProvider>
    </>
  )
}
