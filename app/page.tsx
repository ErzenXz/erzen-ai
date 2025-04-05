"use client"

import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import {
  Globe, Brain, Loader2, FolderRoot, ArrowLeft, Clock, MessageSquarePlus,
  FolderPlus, Code, BookOpen, Bot, Play, Check, ArrowRight
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical } from "lucide-react"
import { AgentGrid } from "@/components/agent/agent-grid"
import { AgentCreationDialog } from "@/components/agent/agent-creation-dialog"
import { AgentRunDialog } from "@/components/agent/agent-run-dialog"
import type { Agent } from "@/lib/types"
import { useAgents } from "@/hooks/use-agents"
import { cn } from "@/lib/utils"
import { getTextInputCompletions, fetchModels } from "@/lib/api"

// Define types for template data
interface Template {
  title: string;
  description: string;
  prompt: string;
  enableBrowse?: boolean;
}

interface TemplateCategory {
  id: string;
  label: string;
  color: string;
  bgColor: string;
  hoverColor: string;
  borderColor: string;
  icon: React.ElementType;
  templates: Template[];
}

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
  const [models, setModels] = useState<any[]>([])
  const [isEditingMessage, setIsEditingMessage] = useState<string | null>(null)
  const [showProjectsGrid, setShowProjectsGrid] = useState(false)
  const [showProjectDialog, setShowProjectDialog] = useState(false)
  const [showAgentsGrid, setShowAgentsGrid] = useState(false)
  const [showAgentDialog, setShowAgentDialog] = useState(false)
  const [isEditingAgent, setIsEditingAgent] = useState(false)
  const [showAgentDetails, setShowAgentDetails] = useState(false)
  const [showAgentRunDialog, setShowAgentRunDialog] = useState(false)
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<"create" | "explore" | "code" | "learn">("create")

  // Dialog states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [dialogAction, setDialogAction] = useState<"delete-thread" | "report-message">("delete-thread")
  const [reportedMessageId, setReportedMessageId] = useState<string | null>(null)

  // Use the agents hook
  const {
    agents,
    currentAgent,
    isLoading: isLoadingAgents,
    error: agentError,
    loadAgents,
    getAgent,
    createAgent: createAgentApi,
    updateAgent: updateAgentApi,
    duplicateAgent: duplicateAgentApi,
    deleteAgent: deleteAgentApi,
    setCurrentAgent,
  } = useAgents()

  const [suggestedCompletions, setSuggestedCompletions] = useState<string[]>([])
  const [isLoadingCompletions, setIsLoadingCompletions] = useState(false)
  const [selectedCompletionIndex, setSelectedCompletionIndex] = useState(-1)
  const completionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Chat input floating state
  const [isInputHidden, setIsInputHidden] = useState(false)
  const lastScrollPosition = useRef(0)

  // Reset states when dialog closes to prevent state inconsistency
  const resetDialogStates = useCallback(() => {
    setSelectedThreadId(null)
    setReportedMessageId(null)
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
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
      setShowAgentsGrid(false)
      setShowAgentDetails(false)
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
  }, [message, uploadedFiles, selectedModel, user, isProcessingFiles, browseMode, reasoning, sendMessage, toast])

  const handleFilesChange = useCallback((files: File[]) => {
    setUploadedFiles(files)
  }, [])

  const handleRenameThread = useCallback((threadId: string, newTitle: string) => {
    if (threadId && newTitle.trim()) {
      renameThread(threadId, newTitle)
    }
  }, [renameThread])

  const handleDuplicateThread = useCallback((threadId: string) => {
    duplicateThread(threadId)
  }, [duplicateThread])

  const handleDeleteThread = useCallback((threadId: string) => {
    setSelectedThreadId(threadId)
    setDialogAction("delete-thread")
    setIsDeleteDialogOpen(true)
  }, [])

  const handleReportMessage = useCallback((messageId: string) => {
    setReportedMessageId(messageId)
    setDialogAction("report-message")
    setIsDeleteDialogOpen(true)
  }, [])

  const handleRegenerateMessage = useCallback(async () => {
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
  }, [currentThread?.messages.length, toast])

  const handleEditMessage = useCallback((messageId: string) => {
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
  }, [currentThread, toast])

  const handlePlayMessage = useCallback((messageId: string) => {
    // In a real app, you would implement audio playback logic here
    toast({
      title: "Playing message",
      description: "Audio playback would start here in a real implementation",
    })
  }, [toast])

  const confirmAction = useCallback(async () => {
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
  }, [dialogAction, selectedThreadId, reportedMessageId, deleteThread, resetDialogStates, toast])

  const handleCommandExecute = useCallback((command: string) => {
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
  }, [currentThread, toast])

  const handleProjectSelect = useCallback(async (projectId: string) => {
    // Hide the projects grid and select the project
    setShowProjectsGrid(false);
    setShowAgentsGrid(false);
    setShowAgentDetails(false);
    await selectProject(projectId);

    // Any messages or threads should also be cleared
    if (currentThread?.id) {
      setCurrentThread(null);
    }

    // Make sure we're showing the project workspace view
    if (currentProjectThreadId) {
      selectProjectThread(null);
    }
  }, [currentThread?.id, currentProjectThreadId, selectProject, selectProjectThread, setCurrentThread])

  const handleProjectThreadSelect = useCallback((threadId: string) => {
    selectProjectThread(threadId);
  }, [selectProjectThread])

  const handleBackToProjects = useCallback(() => {
    selectProject(null);
    setShowProjectsGrid(true);
    setShowAgentsGrid(false);
    setShowAgentDetails(false);
  }, [selectProject])

  const handleViewProjects = useCallback(() => {
    setShowProjectsGrid(true);
    setShowAgentsGrid(false);
    setShowAgentDetails(false);

    if (currentThread?.id && currentThread.id !== 'new') {
      setCurrentThread(null);
    }

    if (currentProjectId) {
      selectProject(null);
    }

    if (currentProjectThreadId) {
      selectProjectThread(null);
    }
  }, [currentProjectId, currentProjectThreadId, currentThread?.id, selectProject, selectProjectThread, setCurrentThread])

  const handleViewAgents = useCallback(() => {
    setShowAgentsGrid(true);
    setShowAgentDetails(false);
    setShowProjectsGrid(false);

    if (currentThread?.id && currentThread.id !== 'new') {
      setCurrentThread(null);
    }

    if (currentProjectId) {
      selectProject(null);
    }

    if (currentProjectThreadId) {
      selectProjectThread(null);
    }
  }, [currentProjectId, currentProjectThreadId, currentThread?.id, selectProject, selectProjectThread, setCurrentThread])

  const handleAgentSelect = useCallback(async (agentId: string) => {
    const agent = await getAgent(agentId);
    if (agent) {
      setShowAgentDetails(true);
      toast({
        title: "Agent Selected",
        description: `Selected agent: ${agent.name}`,
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to load agent details",
        variant: "destructive",
      });
    }
  }, [getAgent, toast])

  const handleBackToAgents = useCallback(() => {
    setShowAgentDetails(false);
    setCurrentAgent(null);
  }, [setCurrentAgent])

  const handleCreateAgent = useCallback(() => {
    setIsEditingAgent(false);
    setCurrentAgent(null);
    setShowAgentDialog(true);
  }, [setCurrentAgent])

  const handleEditAgent = useCallback(async (agentId: string) => {
    await getAgent(agentId);
    setIsEditingAgent(true);
    setShowAgentDialog(true);
  }, [getAgent])

  const handleDuplicateAgent = useCallback(async (agentId: string) => {
    await duplicateAgentApi(agentId);
  }, [duplicateAgentApi])

  const handleDeleteAgent = useCallback(async (agentId: string) => {
    await deleteAgentApi(agentId);
  }, [deleteAgentApi])

  const handleAgentCreated = useCallback(async (agentId: string) => {
    await loadAgents();
  }, [loadAgents])

  const handleRunAgent = useCallback(() => {
    if (currentAgent) {
      setShowAgentRunDialog(true);
    }
  }, [currentAgent])

  // Helper to get placeholder text
  const getInputPlaceholder = useCallback((): string => {
    if (!selectedModel) {
      return "Select a model to start...";
    }
    if (uploadedFiles.length > 0) {
      return `${uploadedFiles.length} file(s) attached. Add a message or send...`;
    }
    return "Type your message...";
  }, [selectedModel, uploadedFiles.length])

  // Reset states when dialog closes to prevent state inconsistency
  useEffect(() => {
    return () => {
      resetDialogStates();
    };
  }, [resetDialogStates]);

  // Template data organized by category
  const templateCategories = useMemo<TemplateCategory[]>(() => [
    {
      id: "create",
      label: "Create",
      color: "primary",
      bgColor: "bg-primary/10",
      hoverColor: "hover:text-primary",
      borderColor: "border-primary/30",
      icon: MessageSquarePlus,
      templates: [
        {
          title: "Write a short story about...",
          description: "Generate creative stories in any genre or style",
          prompt: "Write a short story about a robot learning to love"
        },
        {
          title: "Write a blog post about...",
          description: "Create well-structured articles on any topic",
          prompt: "Write a blog post about the future of AI"
        },
        {
          title: "Generate marketing ideas for...",
          description: "Brainstorm creative marketing content",
          prompt: "Generate 5 creative marketing slogans for a sustainable clothing brand"
        },
        {
          title: "Draft an email to...",
          description: "Professional communication for any situation",
          prompt: "Draft a professional email to schedule a meeting with a potential client"
        },
        {
          title: "Create a product description for...",
          description: "Compelling copy for products or services",
          prompt: "Create an engaging product description for a new smartwatch"
        }
      ]
    },
    {
      id: "explore",
      label: "Explore",
      color: "blue-500",
      bgColor: "bg-blue-500/10",
      hoverColor: "hover:text-blue-500",
      borderColor: "border-blue-500/30",
      icon: Globe,
      templates: [
        {
          title: "Explain a complex topic...",
          description: "Get simple explanations for difficult concepts",
          prompt: "Explain quantum computing in simple terms"
        },
        {
          title: "Research current trends in...",
          description: "Discover the latest information on any subject",
          prompt: "What are the latest developments in renewable energy?",
          enableBrowse: true
        },
        {
          title: "Compare and contrast...",
          description: "Get balanced analysis of different options",
          prompt: "Compare the pros and cons of React vs. Vue"
        },
        {
          title: "Summarize the key points of...",
          description: "Get concise summaries of complex topics",
          prompt: "Summarize the key points of the latest IPCC climate report"
        },
        {
          title: "Find facts about...",
          description: "Research specific information on any topic",
          prompt: "Find interesting facts about deep sea creatures",
          enableBrowse: true
        }
      ]
    },
    {
      id: "code",
      label: "Code",
      color: "green-500",
      bgColor: "bg-green-500/10",
      hoverColor: "hover:text-green-500",
      borderColor: "border-green-500/30",
      icon: Code,
      templates: [
        {
          title: "Write a component for...",
          description: "Generate code for specific UI components",
          prompt: "Write a React component for a responsive image gallery"
        },
        {
          title: "Debug my code...",
          description: "Find and fix issues in your code",
          prompt: "Debug this code: [paste your code here]"
        },
        {
          title: "Explain how to implement...",
          description: "Get step-by-step coding instructions",
          prompt: "Explain how to implement authentication in a NextJS app"
        },
        {
          title: "Optimize this function...",
          description: "Improve performance and readability",
          prompt: "Optimize this JavaScript function for better performance"
        },
        {
          title: "Convert this code to...",
          description: "Translate between programming languages",
          prompt: "Convert this Python code to TypeScript"
        }
      ]
    },
    {
      id: "learn",
      label: "Learn",
      color: "amber-500",
      bgColor: "bg-amber-500/10",
      hoverColor: "hover:text-amber-500",
      borderColor: "border-amber-500/30",
      icon: BookOpen,
      templates: [
        {
          title: "Create a study plan for...",
          description: "Get personalized learning roadmaps",
          prompt: "Create a study plan for learning machine learning in 3 months"
        },
        {
          title: "What should I know about...",
          description: "Discover essential knowledge in any field",
          prompt: "What are the most important concepts to understand in modern JavaScript?"
        },
        {
          title: "Explain with examples...",
          description: "Learn concepts with practical demonstrations",
          prompt: "Explain TypeScript generics with practical examples"
        },
        {
          title: "Recommend resources for learning...",
          description: "Get curated learning materials",
          prompt: "Recommend the best resources for learning data science from scratch"
        },
        {
          title: "Quiz me on...",
          description: "Test your knowledge with interactive quizzes",
          prompt: "Create a quiz to test my knowledge of world geography"
        }
      ]
    }
  ], []);

  // Load agents when agents view is shown
  useEffect(() => {
    if (showAgentsGrid && user) {
      loadAgents();
    }
  }, [showAgentsGrid, user, loadAgents]);

  // Handle text input changes with debounced completions
  const handleMessageChange = useCallback((newMessage: string) => {
    setMessage(newMessage)

    // Clear any existing timeout
    if (completionTimeoutRef.current) {
      clearTimeout(completionTimeoutRef.current)
    }

    // Reset completions if input is cleared
    if (!newMessage.trim()) {
      setSuggestedCompletions([])
      return
    }

    // Set a new timeout for completion suggestions (500ms delay)
    completionTimeoutRef.current = setTimeout(async () => {
      // Only fetch completions if the message is long enough and a model is selected
      if (newMessage.trim().length >= 5 && selectedModel) {
        setIsLoadingCompletions(true)
        try {
          // Pass the selected model to the function
          const completions = await getTextInputCompletions(newMessage, 25)
          console.log("Completions received:", completions)
          setSuggestedCompletions(completions)
        } catch (error) {
          console.error("Error fetching completions:", error)
        } finally {
          setIsLoadingCompletions(false)
        }
      } else {
        setSuggestedCompletions([])
      }
    }, 500)
  }, [selectedModel])

  // Select a completion suggestion
  const handleSelectCompletion = useCallback((completion: string) => {
    // Trim the message and completion to avoid extra spaces
    const trimmedMessage = message.trimEnd();

    // Check if the message already ends with a space
    const needsSpace = trimmedMessage.length > 0 && !trimmedMessage.endsWith(" ");

    // Add the completion with a space only if needed
    setMessage(trimmedMessage + (needsSpace ? " " : "") + completion);
    setSuggestedCompletions([]);
    setSelectedCompletionIndex(-1);
  }, [message])

  // Handle scroll to show/hide chat input
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollPosition = e.currentTarget.scrollTop
    const isScrollingDown = currentScrollPosition > lastScrollPosition.current

    // Only hide when scrolling down and not at the bottom
    const isAtBottom = e.currentTarget.scrollHeight - currentScrollPosition <= e.currentTarget.clientHeight + 100

    if (isScrollingDown && !isAtBottom && !isInputHidden) {
      setIsInputHidden(true)
    } else if ((!isScrollingDown || isAtBottom) && isInputHidden) {
      setIsInputHidden(false)
    }

    lastScrollPosition.current = currentScrollPosition
  }, [isInputHidden])

  // Reset input visibility when thread changes
  useEffect(() => {
    setIsInputHidden(false)
  }, [currentThread?.id])

  // Fetch available models when component mounts
  useEffect(() => {
    // Only fetch models if we don't have any yet
    if (models.length === 0) {
      const loadModels = async () => {
        try {
          const availableModels = await fetchModels()
          setModels(availableModels)

          // Set default model if none is selected
          if (!selectedModel && availableModels.length > 0) {
            // Try to find Gemini Flash 2.0 as default, or use the first model
            const geminiFlash = availableModels.find(
              (model) => model.description === "Gemini Flash 2.0"
            )
            setSelectedModel(geminiFlash ? geminiFlash.model : availableModels[0].model)
          }
        } catch (error) {
          console.error("Failed to load models:", error)
          toast({
            title: "Error",
            description: "Failed to load AI models. Please refresh the page.",
            variant: "destructive"
          })
        }
      }

      loadModels()
    }
  }, [models.length, selectedModel, toast])

  // Handle keyboard navigation for completions
  const handleCompletionKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (suggestedCompletions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedCompletionIndex(prev =>
        prev < suggestedCompletions.length - 1 ? prev + 1 : 0
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedCompletionIndex(prev =>
        prev > 0 ? prev - 1 : suggestedCompletions.length - 1
      )
    } else if (e.key === 'Tab' || e.key === 'Enter') {
      if (selectedCompletionIndex >= 0 && selectedCompletionIndex < suggestedCompletions.length) {
        e.preventDefault()
        handleSelectCompletion(suggestedCompletions[selectedCompletionIndex])
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setSuggestedCompletions([])
      setSelectedCompletionIndex(-1)
    }
  }, [suggestedCompletions, selectedCompletionIndex, handleSelectCompletion])

  // Reset completion state when component unmounts
  useEffect(() => {
    return () => {
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current)
      }
    }
  }, [])

  if (!user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background overflow-hidden relative">
        {/* Enhanced marble effect background */}
        <div className="absolute inset-0 -z-10">
          {/* Base marble texture - refined color gradients */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,_var(--tw-gradient-stops))] from-primary/40 via-primary/5 to-transparent animate-pulse [animation-duration:8s] will-change-opacity"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,_var(--tw-gradient-stops))] from-blue-500/30 via-blue-500/5 to-transparent animate-pulse [animation-duration:12s] [animation-delay:2s] will-change-opacity"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_10%,_var(--tw-gradient-stops))] from-purple-500/30 via-purple-600/5 to-transparent animate-pulse [animation-duration:10s] [animation-delay:1s] will-change-opacity"></div>

          {/* Realistic marble veining - subtle overlays */}
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(68,51,122,0.05)_25%,rgba(68,51,122,0.05)_50%,transparent_50%,transparent_75%,rgba(68,51,122,0.05)_75%)] bg-[length:100px_100px] animate-gradient-x [animation-duration:15s] transform will-change-transform"></div>
          <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_40%,rgba(236,72,153,0.07)_40%,rgba(236,72,153,0.07)_45%,transparent_45%)] bg-[length:150px_150px] animate-gradient-y [animation-duration:18s]"></div>
          <div className="absolute inset-0 bg-[linear-gradient(80deg,transparent_60%,rgba(16,185,129,0.05)_60%,rgba(16,185,129,0.05)_65%,transparent_65%)] bg-[length:120px_120px] animate-gradient-x [animation-duration:12s] [animation-delay:0.5s]"></div>

          {/* Optimized blur effect with subtle color diffusion */}
          <div className="absolute inset-0 backdrop-blur-[100px]"></div>
        </div>

        {/* Perfectly centered content with grid */}
        <div className="relative z-10 grid place-items-center w-full max-w-[90vw]">
          {/* Enhanced marble sphere with more realistic effects */}
          <div className="relative mb-16 p-1 rounded-full scale-[1.5]">
            {/* Multi-layered glow with color variation */}
            <div className="absolute -inset-8 bg-gradient-to-r from-primary/20 via-blue-500/20 to-purple-500/20 blur-xl rounded-full opacity-70 animate-pulse [animation-duration:5s] will-change-opacity"></div>
            <div className="absolute -inset-10 bg-gradient-to-br from-emerald-500/10 via-primary/5 to-pink-500/10 blur-2xl rounded-full opacity-50 animate-pulse [animation-duration:7s] [animation-delay:0.5s]"></div>

            {/* Enhanced marble sphere with realistic texture and depth */}
            <div className="relative h-48 w-48 rounded-full bg-gradient-to-br from-white/20 via-white/10 to-transparent backdrop-blur-sm border border-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.15)] flex items-center justify-center overflow-hidden group">
              {/* Main marble color with subtle swirl pattern */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,_var(--tw-gradient-stops))] from-white/30 via-primary/10 to-blue-500/10"></div>

              {/* Realistic marble veins */}
              <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_85%,rgba(255,255,255,0.2)_85%,rgba(255,255,255,0.2)_87%,transparent_87%)]"></div>
              <div className="absolute inset-0 bg-[linear-gradient(30deg,transparent_80%,rgba(255,255,255,0.1)_80%,rgba(255,255,255,0.1)_82%,transparent_82%)]"></div>
              <div className="absolute inset-0 bg-[linear-gradient(220deg,transparent_92%,rgba(255,255,255,0.15)_92%,rgba(255,255,255,0.15)_94%,transparent_94%)]"></div>

              {/* Optimized reflection highlights */}
              <div className="absolute top-0 left-0 h-1/2 w-1/2 bg-gradient-to-br from-white/30 to-transparent rounded-tl-full"></div>
              <div className="absolute -top-3 -left-3 h-1/4 w-1/4 bg-gradient-to-br from-white/40 to-transparent rounded-full blur-md"></div>
              <div className="absolute bottom-5 right-5 h-1/4 w-1/4 bg-gradient-to-tl from-white/15 to-transparent rounded-full"></div>

              {/* Secondary reflections */}
              <div className="absolute top-1/4 left-1/3 h-1/6 w-1/6 bg-gradient-to-br from-white/25 to-transparent rounded-full blur-sm"></div>
              <div className="absolute bottom-1/3 right-1/4 h-1/6 w-1/6 bg-white/10 rounded-full blur-sm"></div>

              {/* Logo with adaptive colors for light/dark mode */}
              <div className="relative transition-all transform scale-125 z-10">
                <Brain className="w-24 h-24 text-white/90 dark:text-white/90 drop-shadow-lg" />
              </div>

              {/* Optimized shine animation with hardware acceleration */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-all duration-1500 ease-in-out will-change-transform"></div>
            </div>
          </div>

          {/* Text content with adaptive colors for light/dark mode */}
          <div className="text-center relative -mt-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-blue-400 to-purple-500 bg-clip-text text-transparent drop-shadow-sm dark:from-primary dark:via-blue-400 dark:to-purple-400">
              Erzen AI
            </h1>
            <p className="mt-5 text-foreground/80 dark:text-foreground/80 backdrop-blur-sm px-6 py-3 rounded-full bg-white/5 dark:bg-black/5 border border-white/10 dark:border-white/10">
              Preparing your workspace...
            </p>

            {/* Loading animation dots */}
            <div className="mt-8 flex gap-2 justify-center">
              <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-r from-primary to-blue-400 animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-bounce"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-screen bg-background">
        <ChatThreadList
          threads={threads}
          currentThreadId={currentThread?.id ?? null}
          onThreadSelect={(id) => {
            setShowProjectsGrid(false);
            setShowAgentsGrid(false);
            setCurrentThread(id);
          }}
          onNewThread={() => {
            setShowProjectsGrid(false);
            setShowAgentsGrid(false);
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
          onViewAgents={handleViewAgents}
        />

        <div className="flex-1 flex flex-col">
          {/* Hide header in chat mode, show in other modes */}
          {(!currentThread?.id || showProjectsGrid || showAgentsGrid || currentProjectId) && (
            <header className="border-b p-4">
            {/* Chat mode header - simplified */}
            {!showProjectsGrid && !showAgentsGrid && !currentProjectId && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-semibold">Chat</h2>
                </div>
              </div>
            )}

            {/* Projects view header - simple title */}
            {showProjectsGrid && (
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Projects</h2>
              </div>
            )}

            {/* Agents view header */}
            {showAgentsGrid && !showAgentDetails && (
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Agents</h2>
                <Button
                  size="sm"
                  onClick={handleCreateAgent}
                  className="bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 hover:text-purple-600"
                >
                  <Bot className="h-4 w-4 mr-2" />
                  New Agent
                </Button>
              </div>
            )}

            {/* Agent details header */}
            {showAgentDetails && currentAgent && (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mr-2"
                    onClick={handleBackToAgents}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <h2 className="text-lg font-semibold">{currentAgent.name}</h2>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditAgent(currentAgent.id)}
                  >
                    Edit Agent
                  </Button>
                  <Button
                    size="sm"
                    className="bg-purple-500 hover:bg-purple-600 text-white"
                    onClick={handleRunAgent}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Run Agent
                  </Button>
                </div>
              </div>
            )}

            {/* Project threads view header - just back button and title */}
            {currentProjectId && !currentProjectThreadId && !showProjectsGrid && !showAgentsGrid && (
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
              </div>
            )}
          </header>
          )}

          {/* Show project workspace when a project is selected */}
          {currentProjectId && !currentProjectThreadId && !showProjectsGrid && !showAgentsGrid && !showAgentDetails ? (
            <ProjectProvider initialProjectId={currentProjectId}>
              <ProjectWorkspace />
            </ProjectProvider>
          ) : (
            <ScrollArea
              className={`flex-1 ${currentThread?.id && !showProjectsGrid && !showAgentsGrid && !currentProjectId ? 'pt-6' : 'p-4'}`}
              onScrollCapture={handleScroll}
            >
              <div className="max-w-5xl mx-auto">
                {/* Show projects grid if requested */}
                {showProjectsGrid && !showAgentsGrid && !showAgentDetails && (
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

                {/* Show agents grid if requested */}
                {showAgentsGrid && !showAgentDetails && !showProjectsGrid && (
                  <div className="max-w-5xl mx-auto">
                    {isLoadingAgents ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
                        <p className="text-muted-foreground">Loading agents...</p>
                      </div>
                    ) : agentError ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="p-4 rounded-lg bg-destructive/10 text-destructive mb-4">
                          <span className="font-medium">Error:</span> {agentError}
                        </div>
                        <Button variant="outline" onClick={loadAgents}>
                          Try Again
                        </Button>
                      </div>
                    ) : (
                      <AgentGrid
                        agents={agents}
                        onAgentSelect={handleAgentSelect}
                        onCreateAgent={handleCreateAgent}
                        onEditAgent={handleEditAgent}
                        onDuplicateAgent={handleDuplicateAgent}
                        onDeleteAgent={handleDeleteAgent}
                      />
                    )}
                  </div>
                )}

                {/* Show agent details if an agent is selected */}
                {showAgentDetails && currentAgent && showAgentsGrid && !showProjectsGrid && (
                  <div className="max-w-5xl mx-auto">
                    <div className="bg-purple-500/5 rounded-xl p-6 border border-purple-200/20 mb-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-300/20">
                          <Bot className="h-8 w-8 text-purple-500" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold">{currentAgent.name}</h3>
                          <p className="text-muted-foreground mt-1">
                            {currentAgent.description || "No description provided"}
                          </p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Badge variant="outline" className="bg-purple-500/5 text-purple-600 border-purple-200/30">
                              {currentAgent.steps?.length || 0} steps
                            </Badge>
                            <Badge variant="outline" className="bg-muted/50">
                              Created: {new Date(currentAgent.createdAt).toLocaleDateString()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Agent steps section */}
                    <div className="border rounded-lg p-4 mb-6">
                      <h3 className="text-lg font-medium mb-4">Workflow Steps</h3>

                      {!currentAgent.steps || currentAgent.steps.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          This agent doesn&apos;t have any steps defined yet.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {currentAgent.steps.sort((a, b) => a.order - b.order).map((step, index) => (
                            <div key={step.id} className="border rounded-lg p-4 bg-card">
                              <div className="flex items-start">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/10 text-purple-600 font-medium mr-3">
                                  {index + 1}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center mb-2">
                                    <h4 className="font-medium">{step.name}</h4>
                                    <Badge
                                      className={cn(
                                        "ml-2 border-none",
                                        step.type === "API_CALL" && "bg-blue-500/10 text-blue-600",
                                        step.type === "SET_VARIABLE" && "bg-green-500/10 text-green-600",
                                        step.type === "TRANSFORMATION" && "bg-amber-500/10 text-amber-600",
                                        step.type === "PROMPT" && "bg-purple-500/10 text-purple-600",
                                        step.type === "CODE" && "bg-slate-500/10 text-slate-600",
                                        step.type === "CONDITION" && "bg-red-500/10 text-red-600",
                                        step.type === "DATA_TRANSFORM" && "bg-teal-500/10 text-teal-600"
                                      )}
                                    >
                                      {step.type?.replace(/_/g, ' ')}
                                    </Badge>
                                  </div>

                                  {step.description && (
                                    <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
                                  )}

                                  {/* Display step configuration based on type */}
                                  <div className="mt-3 text-xs bg-muted/50 rounded-md p-3 font-mono">
                                    {step.type === "SET_VARIABLE" && (
                                      <div className="space-y-1">
                                        <div><span className="text-blue-600">Variable:</span> {step.config.variable}</div>
                                        <div><span className="text-blue-600">Expression:</span> {step.config.expression}</div>
                                      </div>
                                    )}

                                    {step.type === "API_CALL" && (
                                      <div className="space-y-1">
                                        <div><span className="text-blue-600">Method:</span> {step.config.method}</div>
                                        <div><span className="text-blue-600">Endpoint:</span> <span className="break-all">{step.config.endpoint}</span></div>
                                        <div><span className="text-blue-600">Output Variable:</span> {step.config.outputVariable}</div>
                                      </div>
                                    )}

                                    {step.type === "TRANSFORMATION" && step.config.transformation && (
                                      <div className="space-y-1">
                                        <div><span className="text-blue-600">Input:</span> {step.config.inputVariable}</div>
                                        <div><span className="text-blue-600">Output:</span> {step.config.outputVariable}</div>
                                        <div>
                                          <span className="text-blue-600">Transformation:</span>
                                          <div className="mt-1 pl-3 border-l-2 border-blue-500/20">
                                            {Object.entries(step.config.transformation as Record<string, any>).map(([key, value]) => (
                                              <div key={key} className="grid grid-cols-[auto_1fr] gap-2">
                                                <span className="text-green-600">{key}:</span>
                                                <span className="break-all">{String(value)}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {step.type === "PROMPT" && (
                                      <div className="space-y-1">
                                        <div><span className="text-blue-600">Prompt:</span> {step.config.prompt}</div>
                                        <div><span className="text-blue-600">Model:</span> {step.config.model}</div>
                                        {step.config.outputVariable && (
                                          <div><span className="text-blue-600">Output Variable:</span> {step.config.outputVariable}</div>
                                        )}
                                      </div>
                                    )}

                                    {/* Fallback for other step types */}
                                    {!["SET_VARIABLE", "API_CALL", "TRANSFORMATION", "PROMPT"].includes(step.type) && (
                                      <pre className="overflow-auto max-h-40">{JSON.stringify(step.config, null, 2)}</pre>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Variables section */}
                    <div className="border rounded-lg p-4 mb-6">
                      <h3 className="text-lg font-medium mb-4">Variables</h3>

                      {!currentAgent.variables || currentAgent.variables.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">
                          This agent doesn&apos;t have any variables defined.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {currentAgent.variables.map((variable) => (
                            <div key={variable.id} className="border rounded-lg p-3 bg-green-500/5">
                              <div className="flex justify-between items-start mb-1">
                                <h4 className="font-medium text-green-700">{variable.name}</h4>
                              </div>
                              {variable.description && (
                                <p className="text-sm text-muted-foreground mb-2">{variable.description}</p>
                              )}
                              {variable.defaultValue && (
                                <div className="text-xs text-muted-foreground bg-background rounded p-2 font-mono">
                                  Default: {variable.defaultValue}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Credentials section */}
                    <div className="border rounded-lg p-4">
                      <h3 className="text-lg font-medium mb-4">Credentials</h3>

                      {!currentAgent.credentials || currentAgent.credentials.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">
                          This agent doesn&apos;t have any credentials defined.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {currentAgent.credentials.map((credential) => (
                            <div key={credential.id} className="border rounded-lg p-3 bg-blue-500/5">
                              <div className="flex justify-between items-start">
                                <h4 className="font-medium text-blue-700">{credential.name}</h4>
                                <Badge className="bg-blue-500/10 text-blue-600 border-none">
                                  {credential.type}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground mt-2">
                                Added: {new Date(credential.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Empty state with welcome message when no content is selected */}
                {!showProjectsGrid && !showAgentsGrid && !currentProjectId && !currentThread?.id && (
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
                {currentThread?.id === 'new' && currentThread.messages.length === 0 && !showProjectsGrid && !showAgentsGrid && (
                  <div className="py-8">
                    <div className="relative mb-8 text-center">
                      <div className="absolute -z-10 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/5 blur-3xl rounded-full"></div>
                      <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">How can I help you?</h2>
                      <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Select a template or type your own message below</p>
                    </div>

                    {/* Category tabs */}
                    <div className="flex justify-center mb-8 bg-accent/30 backdrop-blur-sm p-1.5 rounded-xl max-w-lg mx-auto shadow-sm border border-border/50">
                      {templateCategories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => setSelectedTemplateCategory(category.id as any)}
                          className={`px-4 py-2.5 rounded-lg font-medium transition-all duration-200 relative text-sm flex-1 flex items-center justify-center gap-2
                            ${selectedTemplateCategory === category.id
                              ? `bg-background shadow-sm text-${category.color} dark:text-white dark:after:bg-${category.color}`
                              : `text-muted-foreground hover:text-foreground ${category.hoverColor} hover:bg-background/50`
                            }
                          `}
                        >
                          <category.icon className={`w-4 h-4 ${selectedTemplateCategory === category.id ? `text-${category.color}` : ''}`} />
                          <span>{category.label}</span>
                          {selectedTemplateCategory === category.id && (
                            <span className="absolute inset-0 rounded-lg ring-1 ring-border dark:ring-border/50"></span>
                          )}
                          {selectedTemplateCategory === category.id && (
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-gradient-to-r from-transparent via-current to-transparent"></span>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Templates grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                      {templateCategories.find(c => c.id === selectedTemplateCategory)?.templates.map((template, index) => {
                        const category = templateCategories.find(c => c.id === selectedTemplateCategory)!;
                        return (
                          <Card
                            key={index}
                            className={`p-5 cursor-pointer hover:${category.bgColor} transition-all duration-200 border-muted/30 hover:${category.borderColor} hover:shadow-sm group`}
                            onClick={() => {
                              if (template.enableBrowse) {
                                setBrowseMode(true);
                              }
                              setMessage(template.prompt);
                            }}
                          >
                            <div className="flex flex-col h-full">
                              <div className="flex items-start justify-between mb-1">
                                <p className={`font-medium text-base ${category.hoverColor} transition-colors`}>
                                  {template.title}
                                </p>
                                {template.enableBrowse && (
                                  <Badge variant="outline" className={`ml-2 shrink-0 text-xs px-2 py-0.5 text-${category.color} ${category.borderColor} ${category.bgColor}`}>
                                    <Globe className="w-3 h-3 mr-1" />
                                    Web
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{template.description}</p>
                            </div>
                          </Card>
                        );
                      })}
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
          {!showProjectsGrid && !showAgentsGrid && (!currentProjectId || currentProjectThreadId) && (currentThread?.id || !currentProjectId) && (
            <footer className={`border-t p-4 sticky bottom-0 bg-background/80 backdrop-blur-md shadow-soft z-10 transition-all duration-300 ease-in-out animate-apple-fade floating-chat-input ${isInputHidden ? 'hidden' : ''}`}>
              <div className="max-w-5xl mx-auto relative chat-input-container">
                {showFileUpload && <FileUpload onFilesChange={handleFilesChange} />}

                {/* Show completion suggestions if available */}
                {suggestedCompletions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {suggestedCompletions.map((completion, index) => (
                      <Button
                        key={index}
                        size="sm"
                        variant="outline"
                        className={`text-xs py-1 px-2 h-auto flex items-center gap-1 transition-all ${
                          index === selectedCompletionIndex
                            ? 'bg-primary/10 text-primary border-primary/30'
                            : 'bg-muted/50 hover:bg-primary/5 hover:text-primary'
                        }`}
                        onClick={() => handleSelectCompletion(completion)}
                      >
                        {index === selectedCompletionIndex && <Check className="w-3 h-3" />}
                        {completion}
                        <ArrowRight className="w-3 h-3 ml-1 opacity-60" />
                      </Button>
                    ))}
                    {isLoadingCompletions && (
                      <div className="text-xs text-muted-foreground flex items-center py-1">
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Loading...
                      </div>
                    )}
                  </div>
                )}

                <ChatInput
                  message={message}
                  onMessageChange={handleMessageChange}
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
                  onKeyDown={handleCompletionKeyDown}

                  // Model selector props
                  selectedModel={selectedModel}
                  onModelChange={setSelectedModel}
                  models={models}

                  // Web search and reasoning props
                  browseMode={browseMode}
                  onBrowseModeChange={setBrowseMode}
                  reasoning={reasoning}
                  onReasoningChange={setReasoning}
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

      {/* Agent Creation Dialog */}
      <AgentCreationDialog
        open={showAgentDialog}
        onOpenChange={setShowAgentDialog}
        onAgentCreated={handleAgentCreated}
        agent={currentAgent || undefined}
        isEditing={isEditingAgent}
      />

      {/* Agent Run Dialog */}
      {showAgentRunDialog && (
        <AgentRunDialog
          open={showAgentRunDialog}
          onOpenChange={(open) => {
            setShowAgentRunDialog(open);
            if (!open) {
              // Give a small delay before fully unmounting
              // to prevent state issues during unmounting
              setTimeout(() => {
                // cleanup if needed
              }, 100);
            }
          }}
          agent={currentAgent || undefined}
        />
      )}
    </>
  )
}
