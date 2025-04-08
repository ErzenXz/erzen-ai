"use client"

import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import {
  Globe, Brain, Loader2, FolderRoot, ArrowLeft, Clock, MessageSquarePlus,
  FolderPlus, Code, BookOpen, Bot, Play, Check, ArrowRight
} from "lucide-react"
import { TextSelectionButton } from "@/components/page/main/text-selection-button"
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

  // Handle text selected with the "Edit with AI" button
  const handleEditWithAI = useCallback((selectedText: string) => {
    // If there's already text in the input, append the selected text
    if (message) {
      setMessage(message + "\n\n" + selectedText)
    } else {
      // Otherwise, just set the selected text as the message
      setMessage(selectedText)
    }

    // Focus the input
    const inputElement = document.querySelector('textarea') as HTMLTextAreaElement
    if (inputElement) {
      setTimeout(() => {
        inputElement.focus()
      }, 100)
    }

    toast({
      title: "Message text added",
      description: "Selected text from the message has been added to the chat input.",
    })
  }, [message])

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
  const allTemplateCategories = useMemo<TemplateCategory[]>(() => [
    {
      id: "create",
      label: "Create",
      color: "primary",
      bgColor: "bg-primary/10",
      hoverColor: "hover:text-primary",
      borderColor: "border-primary/30",
      icon: MessageSquarePlus,
      templates: [
        // Set 1
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
        // Set 2
        {
          title: "Create a product description for...",
          description: "Compelling copy for products or services",
          prompt: "Create an engaging product description for a new smartwatch"
        },
        {
          title: "Write a poem about...",
          description: "Express emotions through creative poetry",
          prompt: "Write a poem about the changing seasons"
        },
        {
          title: "Create a social media post for...",
          description: "Engaging content for any platform",
          prompt: "Create an Instagram post announcing a new eco-friendly product line"
        },
        {
          title: "Write a speech for...",
          description: "Compelling presentations for any occasion",
          prompt: "Write a 5-minute inspirational speech for a graduation ceremony"
        },
        // Set 3
        {
          title: "Create a business plan for...",
          description: "Structured plans for new ventures",
          prompt: "Create a one-page business plan for a mobile app startup"
        },
        {
          title: "Write a script for...",
          description: "Engaging scripts for videos or presentations",
          prompt: "Write a script for a 2-minute product demonstration video"
        },
        {
          title: "Generate a list of ideas for...",
          description: "Creative brainstorming for any project",
          prompt: "Generate 10 unique ideas for a children's birthday party"
        },
        {
          title: "Create a resume for...",
          description: "Professional CV tailored to specific roles",
          prompt: "Create a resume for a software developer with 3 years of experience"
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
        // Set 1
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
        // Set 2
        {
          title: "Find facts about...",
          description: "Research specific information on any topic",
          prompt: "Find interesting facts about deep sea creatures",
          enableBrowse: true
        },
        {
          title: "Analyze the impact of...",
          description: "Understand consequences and implications",
          prompt: "Analyze the impact of artificial intelligence on the job market",
          enableBrowse: true
        },
        {
          title: "Explore the history of...",
          description: "Discover historical context and development",
          prompt: "Explore the history of space exploration from 1950 to today",
          enableBrowse: true
        },
        {
          title: "Investigate solutions for...",
          description: "Find practical approaches to challenges",
          prompt: "Investigate sustainable solutions for urban transportation",
          enableBrowse: true
        },
        // Set 3
        {
          title: "Discover innovations in...",
          description: "Learn about cutting-edge developments",
          prompt: "Discover recent innovations in battery technology",
          enableBrowse: true
        },
        {
          title: "Understand the science behind...",
          description: "Get scientific explanations for phenomena",
          prompt: "Explain the science behind climate change and its effects"
        },
        {
          title: "Explore different perspectives on...",
          description: "See multiple viewpoints on complex issues",
          prompt: "Explore different perspectives on universal basic income",
          enableBrowse: true
        },
        {
          title: "Research the benefits of...",
          description: "Discover advantages and positive impacts",
          prompt: "Research the health benefits of meditation and mindfulness",
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
        // Set 1
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
        // Set 2
        {
          title: "Convert this code to...",
          description: "Translate between programming languages",
          prompt: "Convert this Python code to TypeScript"
        },
        {
          title: "Create a data structure for...",
          description: "Design efficient data structures",
          prompt: "Design an efficient data structure for a social media feed"
        },
        {
          title: "Write a test for...",
          description: "Generate unit or integration tests",
          prompt: "Write unit tests for this React component using Jest and React Testing Library"
        },
        {
          title: "Refactor this code to...",
          description: "Improve code quality and maintainability",
          prompt: "Refactor this code to use modern JavaScript features"
        },
        // Set 3
        {
          title: "Create an algorithm for...",
          description: "Develop efficient algorithms for specific tasks",
          prompt: "Create an algorithm to find the shortest path in a graph"
        },
        {
          title: "Explain this code snippet...",
          description: "Get detailed explanations of how code works",
          prompt: "Explain how this recursive function works step by step"
        },
        {
          title: "Design a database schema for...",
          description: "Create efficient database structures",
          prompt: "Design a database schema for an e-commerce application"
        },
        {
          title: "Implement a design pattern for...",
          description: "Apply software design patterns",
          prompt: "Implement the observer pattern for a notification system"
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
        // Set 1
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
        // Set 2
        {
          title: "Quiz me on...",
          description: "Test your knowledge with interactive quizzes",
          prompt: "Create a quiz to test my knowledge of world geography"
        },
        {
          title: "Summarize the key concepts of...",
          description: "Get concise overviews of complex subjects",
          prompt: "Summarize the key concepts of machine learning for beginners"
        },
        {
          title: "Create flashcards for...",
          description: "Generate study materials for any subject",
          prompt: "Create 10 flashcards for learning Spanish vocabulary"
        },
        {
          title: "Explain the difference between...",
          description: "Understand distinctions between similar concepts",
          prompt: "Explain the difference between REST and GraphQL APIs"
        },
        // Set 3
        {
          title: "Teach me how to...",
          description: "Learn new skills step by step",
          prompt: "Teach me how to analyze data using Python pandas"
        },
        {
          title: "Create a cheat sheet for...",
          description: "Quick reference guides for any topic",
          prompt: "Create a cheat sheet for CSS flexbox and grid"
        },
        {
          title: "Explain the history and evolution of...",
          description: "Understand how concepts have developed",
          prompt: "Explain the history and evolution of artificial intelligence"
        },
        {
          title: "What are best practices for...",
          description: "Learn industry standards and recommendations",
          prompt: "What are the best practices for secure web development?"
        }
      ]
    }
  ], []);

  // State to track the current template set for each category
  const [templateSets, setTemplateSets] = useState<Record<string, number>>({
    create: 0,
    explore: 0,
    code: 0,
    learn: 0
  });

  // Function to get a subset of templates for each category
  const getTemplateSubset = useCallback((categoryId: string, templates: Template[]) => {
    const setIndex = templateSets[categoryId];
    const templatesPerSet = 4; // Show 4 templates at a time

    const startIndex = setIndex * templatesPerSet;
    return templates.slice(startIndex, startIndex + templatesPerSet);
  }, [templateSets]);

  // Rotate templates when a category is selected
  const rotateTemplates = useCallback((categoryId: string) => {
    const category = allTemplateCategories.find(c => c.id === categoryId);
    if (!category) return;

    const templatesPerSet = 4;
    const totalSets = Math.ceil(category.templates.length / templatesPerSet);

    setTemplateSets(prev => ({
      ...prev,
      [categoryId]: (prev[categoryId] + 1) % totalSets
    }));
  }, [allTemplateCategories]);

  // Derived template categories with subsets of templates
  const templateCategories = useMemo(() => {
    return allTemplateCategories.map(category => ({
      ...category,
      templates: getTemplateSubset(category.id, category.templates)
    }));
  }, [allTemplateCategories, getTemplateSubset]);

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
            // Try to find Llama 4 Scout as the default model
            const llamaScout = availableModels.find(
              (model) => model.description.includes("Llama 4 Scout")
            )
            // Fallback to Gemini Flash 2.0 if Llama 4 Scout is not available
            const geminiFlash = availableModels.find(
              (model) => model.description === "Gemini Flash 2.0"
            )
            // Use Llama 4 Scout if available, otherwise Gemini Flash, otherwise first model
            setSelectedModel(llamaScout ? llamaScout.model :
              geminiFlash ? geminiFlash.model :
              availableModels[0].model)
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
        {/* Ultra-modern animated background */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          {/* Dynamic gradient background - theme aware */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background opacity-90 dark:from-primary/10 dark:via-background dark:to-background"></div>

          {/* Animated mesh grid - futuristic effect with theme awareness */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(100,116,139,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(100,116,139,0.05)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(64,76,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(64,76,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]">
            <div className="absolute inset-0 animate-pulse-soft [animation-duration:15s]"></div>
          </div>

          {/* Animated particles with glow */}
          <div className="absolute inset-0">
            {/* Particle clusters with glow effects */}
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className={`absolute rounded-full bg-gradient-to-r ${i % 3 === 0 ? 'from-primary/40 to-primary/10' : i % 3 === 1 ? 'from-blue-500/40 to-blue-500/10' : 'from-purple-500/40 to-purple-500/10'}`}
                style={{
                  width: `${Math.random() * 6 + 2}px`,
                  height: `${Math.random() * 6 + 2}px`,
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  boxShadow: `0 0 ${Math.random() * 10 + 5}px ${i % 3 === 0 ? 'rgba(var(--primary), 0.4)' : i % 3 === 1 ? 'rgba(59, 130, 246, 0.4)' : 'rgba(168, 85, 247, 0.4)'}`,
                  animation: `float ${Math.random() * 10 + 10}s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 5}s`,
                }}
              />
            ))}
          </div>

          {/* Animated light beams */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] animate-spin-slow [animation-duration:40s]">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-0.5 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
                  style={{ transform: `translate(-50%, -50%) rotate(${i * 45}deg)` }}
                />
              ))}
            </div>
          </div>

          {/* Glowing orbs with dynamic movement */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
            <div className="absolute top-1/4 left-1/4 h-[40vh] w-[40vh] rounded-full bg-primary/10 blur-[120px] animate-pulse-soft [animation-duration:10s]"></div>
            <div className="absolute bottom-1/4 right-1/4 h-[45vh] w-[45vh] rounded-full bg-blue-500/10 blur-[150px] animate-pulse-soft [animation-duration:15s] [animation-delay:2s]"></div>
            <div className="absolute top-2/3 left-1/3 h-[30vh] w-[30vh] rounded-full bg-purple-500/10 blur-[100px] animate-pulse-soft [animation-duration:12s] [animation-delay:1s]"></div>
          </div>
        </div>

        {/* Centered loading spinner only */}
        <div className="relative z-10 flex items-center justify-center h-full animate-fade-in [animation-duration:1s]">
          {/* Enhanced loading spinner */}
          <div className="relative">
            {/* Outer rotating rings */}
            <div className="absolute -inset-12 rounded-full border border-primary/20 animate-spin-slow [animation-duration:20s]"></div>
            <div className="absolute -inset-8 rounded-full border border-blue-500/20 animate-spin-slow [animation-duration:15s] [animation-direction:reverse]"></div>
            <div className="absolute -inset-4 rounded-full border border-purple-500/20 animate-spin-slow [animation-duration:10s]"></div>

            {/* Subtle glow effect */}
            <div className="absolute -inset-10 bg-gradient-to-br from-primary/20 via-blue-500/20 to-purple-500/20 rounded-full blur-xl opacity-80 animate-pulse-soft [animation-duration:4s]"></div>

            {/* Main spinner */}
            <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-background/80 to-background/60 backdrop-blur-xl border border-muted/30 shadow-lg flex items-center justify-center overflow-hidden">
              {/* Inner glow */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--primary),0.15)_0%,transparent_70%)] animate-pulse-soft [animation-duration:5s]"></div>

              {/* Spinning progress arc */}
              <div className="absolute inset-0">
                <svg className="w-full h-full animate-spin-slow [animation-duration:2s]" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" className="text-primary" strokeWidth="3" strokeDasharray="70 170" strokeLinecap="round" />
                </svg>
              </div>

              {/* Pulsing center */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-screen bg-background">
        {/* Text selection button that appears when text is selected */}
        <TextSelectionButton onEditWithAI={handleEditWithAI} />
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
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/30">
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
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-medium mr-3">
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
                    {/* Modern glass-morphism welcome card */}
                    <div className="relative w-full max-w-4xl mx-auto mb-12">
                      {/* Background glow effects */}
                      <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-br from-primary/20 via-blue-500/10 to-purple-500/20 blur-3xl rounded-full opacity-70"></div>
                      <div className="absolute -z-10 top-0 right-0 w-1/2 h-1/2 bg-gradient-to-br from-emerald-500/10 via-primary/5 to-pink-500/10 blur-2xl rounded-full opacity-50"></div>

                      {/* Welcome card with glass effect */}
                      <div className="relative backdrop-blur-sm bg-white/5 dark:bg-black/5 border border-white/10 dark:border-white/10 rounded-2xl p-8 overflow-hidden">
                        {/* Subtle animated gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_3s_infinite] will-change-transform"></div>

                        {/* Welcome content */}
                        <div className="flex flex-col items-center text-center">
                          <div className="relative mb-6">
                            <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-blue-500/20 to-purple-500/20 blur-xl rounded-full opacity-70"></div>
                            <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-white/20 via-white/10 to-transparent backdrop-blur-sm border border-white/10 flex items-center justify-center">
                              <FolderRoot className="w-10 h-10 text-primary" />
                            </div>
                          </div>

                          <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-primary via-blue-400 to-purple-500 bg-clip-text text-transparent">
                            Welcome to Erzen AI
                          </h2>

                          <p className="text-muted-foreground text-center max-w-md mb-6 font-light">
                            Create a new project or start a chat to begin working with AI
                          </p>

                          <div className="flex gap-4 mb-6">
                            <Button
                              onClick={() => setShowProjectDialog(true)}
                              className="bg-primary/90 hover:bg-primary text-white shadow-sm transition-all duration-200 px-5 py-2 h-auto"
                            >
                              <FolderPlus className="w-4 h-4 mr-2 opacity-80" />
                              Create Project
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => createThread()}
                              className="border-primary/20 text-primary hover:bg-primary/10 transition-all duration-200 px-5 py-2 h-auto"
                            >
                              <MessageSquarePlus className="w-4 h-4 mr-2 opacity-80" />
                              New Chat
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="w-full max-w-5xl">
                      <div className="relative py-8 px-10 bg-gradient-to-b from-white/10 to-white/5 dark:from-black/10 dark:to-black/5 backdrop-blur-md rounded-3xl border border-white/20 dark:border-white/10 mb-16 mt-8 shadow-[0_10px_50px_-12px_rgba(0,0,0,0.25)] overflow-hidden">
                        {/* Enhanced animated background elements */}
                        <div className="absolute -z-10 top-0 left-0 w-full h-full overflow-hidden">
                          {/* Main gradient blob */}
                          <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-gradient-to-br from-primary/15 via-blue-500/10 to-purple-500/15 blur-3xl rounded-full opacity-70 animate-pulse-soft [animation-duration:8s]"></div>

                          {/* Secondary gradient blobs */}
                          <div className="absolute -z-10 bottom-0 right-0 w-1/3 h-1/3 bg-gradient-to-br from-emerald-500/15 via-primary/10 to-pink-500/15 blur-2xl rounded-full opacity-50 animate-pulse-soft [animation-duration:10s] [animation-delay:1s]"></div>
                          <div className="absolute -z-10 top-0 left-0 w-1/4 h-1/4 bg-gradient-to-br from-blue-500/15 via-primary/10 to-purple-500/15 blur-2xl rounded-full opacity-50 animate-pulse-soft [animation-duration:12s] [animation-delay:2s]"></div>

                          {/* Animated shimmer effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_5s_infinite] will-change-transform"></div>

                          {/* Subtle noise texture overlay */}
                          <div className="absolute inset-0 bg-noise opacity-[0.03] mix-blend-soft-light"></div>

                          {/* Subtle border glow */}
                          <div className="absolute inset-0 rounded-3xl border border-white/30 dark:border-white/20 opacity-50 blur-[2px]"></div>
                        </div>

                        <h3 className="text-2xl font-medium text-center mb-10 flex flex-col items-center">
                          {/* Enhanced section title with animated underline */}
                          <span className="text-sm text-primary/90 uppercase tracking-wider mb-6 font-light flex items-center relative">
                            <span className="h-[1px] w-10 bg-gradient-to-r from-transparent to-primary/60 mr-3"></span>
                            <span className="relative">Let&apos;s get started
                              <span className="absolute -bottom-1.5 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-70"></span>
                            </span>
                            <span className="h-[1px] w-10 bg-gradient-to-r from-primary/60 to-transparent ml-3"></span>
                          </span>

                          {/* Enhanced greeting with 3D effect */}
                          <span className="relative">
                            <div className="absolute -z-10 -inset-10 bg-gradient-to-r from-primary/20 via-blue-500/20 to-purple-500/20 blur-xl rounded-full opacity-80 animate-pulse-soft [animation-duration:4s]"></div>
                            <span className="animate-typing-effect overflow-hidden whitespace-nowrap border-r-2 border-primary pr-1 drop-shadow-[0_2px_10px_rgba(var(--primary),0.3)] bg-gradient-to-r from-primary/90 via-blue-500/90 to-purple-500/90 bg-clip-text text-transparent text-4xl font-bold">
                              Howdy{user?.name ? `, ${user.name}` : ""}! How can I help you?
                            </span>
                          </span>
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Create Category */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge variant="outline" className="px-3 py-1.5 text-primary border-primary/30 bg-primary/5 rounded-full font-medium">
                              Create
                            </Badge>
                          </div>

                          <Card
                            className="group p-5 cursor-pointer border-primary/10 hover:border-primary/30 hover:shadow-sm transition-all duration-300 overflow-hidden relative"
                            onClick={() => {
                              createThread();
                              setMessage("Write a short story about a robot learning to love");
                            }}
                          >
                            {/* Subtle hover effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative z-10">
                              <p className="font-medium text-base mb-1.5">Write a short story about...</p>
                              <p className="text-sm text-muted-foreground">Generate creative stories in any genre or style</p>
                            </div>
                            <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <ArrowRight className="h-4 w-4 text-primary/70" />
                            </div>
                          </Card>

                          <Card
                            className="group p-5 cursor-pointer border-primary/10 hover:border-primary/30 hover:shadow-sm transition-all duration-300 overflow-hidden relative"
                            onClick={() => {
                              createThread();
                              setMessage("Write a blog post about the future of AI");
                            }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative z-10">
                              <p className="font-medium text-base mb-1.5">Write a blog post about...</p>
                              <p className="text-sm text-muted-foreground">Create well-structured articles on any topic</p>
                            </div>
                            <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <ArrowRight className="h-4 w-4 text-primary/70" />
                            </div>
                          </Card>

                          <Card
                            className="group p-5 cursor-pointer border-primary/10 hover:border-primary/30 hover:shadow-sm transition-all duration-300 overflow-hidden relative"
                            onClick={() => {
                              createThread();
                              setMessage("Generate 5 creative marketing slogans for a sustainable clothing brand");
                            }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative z-10">
                              <p className="font-medium text-base mb-1.5">Generate marketing ideas for...</p>
                              <p className="text-sm text-muted-foreground">Brainstorm creative marketing content</p>
                            </div>
                            <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <ArrowRight className="h-4 w-4 text-primary/70" />
                            </div>
                          </Card>
                        </div>

                        {/* Explore Category */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge variant="outline" className="px-3 py-1.5 text-blue-500 border-blue-500/30 bg-blue-500/5 rounded-full font-medium">
                              Explore
                            </Badge>
                          </div>

                          <Card
                            className="group p-5 cursor-pointer border-blue-500/10 hover:border-blue-500/30 hover:shadow-sm transition-all duration-300 overflow-hidden relative"
                            onClick={() => {
                              createThread();
                              setMessage("Explain quantum computing in simple terms");
                            }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-blue-500/10 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative z-10">
                              <p className="font-medium text-base mb-1.5">Explain a complex topic...</p>
                              <p className="text-sm text-muted-foreground">Get simple explanations for difficult concepts</p>
                            </div>
                            <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <ArrowRight className="h-4 w-4 text-blue-500/70" />
                            </div>
                          </Card>

                          <Card
                            className="group p-5 cursor-pointer border-blue-500/10 hover:border-blue-500/30 hover:shadow-sm transition-all duration-300 overflow-hidden relative"
                            onClick={() => {
                              createThread();
                              setBrowseMode(true);
                              setMessage("What are the latest developments in renewable energy?");
                            }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-blue-500/10 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative z-10">
                              <p className="font-medium text-base mb-1.5">Research current trends in...</p>
                              <p className="text-sm text-muted-foreground">Discover the latest information on any subject</p>
                            </div>
                            <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <ArrowRight className="h-4 w-4 text-blue-500/70" />
                            </div>
                          </Card>

                          <Card
                            className="group p-5 cursor-pointer border-blue-500/10 hover:border-blue-500/30 hover:shadow-sm transition-all duration-300 overflow-hidden relative"
                            onClick={() => {
                              createThread();
                              setMessage("Compare the pros and cons of React vs. Vue");
                            }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-blue-500/10 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative z-10">
                              <p className="font-medium text-base mb-1.5">Compare and contrast...</p>
                              <p className="text-sm text-muted-foreground">Get balanced analysis of different options</p>
                            </div>
                            <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <ArrowRight className="h-4 w-4 text-blue-500/70" />
                            </div>
                          </Card>
                        </div>

                        {/* Code Category */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge variant="outline" className="px-3 py-1.5 text-green-500 border-green-500/30 bg-green-500/5 rounded-full font-medium">
                              Code
                            </Badge>
                          </div>

                          <Card
                            className="group p-5 cursor-pointer border-green-500/10 hover:border-green-500/30 hover:shadow-sm transition-all duration-300 overflow-hidden relative"
                            onClick={() => {
                              createThread();
                              setMessage("Write a React component for a responsive image gallery");
                            }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-green-500/10 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative z-10">
                              <p className="font-medium text-base mb-1.5">Write a component for...</p>
                              <p className="text-sm text-muted-foreground">Generate code for specific UI components</p>
                            </div>
                            <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <ArrowRight className="h-4 w-4 text-green-500/70" />
                            </div>
                          </Card>

                          <Card
                            className="group p-5 cursor-pointer border-green-500/10 hover:border-green-500/30 hover:shadow-sm transition-all duration-300 overflow-hidden relative"
                            onClick={() => {
                              createThread();
                              setMessage("Debug this code: [paste your code here]");
                            }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-green-500/10 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative z-10">
                              <p className="font-medium text-base mb-1.5">Debug my code...</p>
                              <p className="text-sm text-muted-foreground">Find and fix issues in your code</p>
                            </div>
                            <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <ArrowRight className="h-4 w-4 text-green-500/70" />
                            </div>
                          </Card>

                          <Card
                            className="group p-5 cursor-pointer border-green-500/10 hover:border-green-500/30 hover:shadow-sm transition-all duration-300 overflow-hidden relative"
                            onClick={() => {
                              createThread();
                              setMessage("Explain how to implement authentication in a NextJS app");
                            }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-green-500/10 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative z-10">
                              <p className="font-medium text-base mb-1.5">Explain how to implement...</p>
                              <p className="text-sm text-muted-foreground">Get step-by-step coding instructions</p>
                            </div>
                            <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <ArrowRight className="h-4 w-4 text-green-500/70" />
                            </div>
                          </Card>
                        </div>

                        {/* Learn Category */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge variant="outline" className="px-3 py-1.5 text-amber-500 border-amber-500/30 bg-amber-500/5 rounded-full font-medium">
                              Learn
                            </Badge>
                          </div>

                          <Card
                            className="group p-5 cursor-pointer border-amber-500/10 hover:border-amber-500/30 hover:shadow-sm transition-all duration-300 overflow-hidden relative"
                            onClick={() => {
                              createThread();
                              setMessage("Create a study plan for learning machine learning in 3 months");
                            }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-amber-500/10 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative z-10">
                              <p className="font-medium text-base mb-1.5">Create a study plan for...</p>
                              <p className="text-sm text-muted-foreground">Get personalized learning roadmaps</p>
                            </div>
                            <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <ArrowRight className="h-4 w-4 text-amber-500/70" />
                            </div>
                          </Card>

                          <Card
                            className="group p-5 cursor-pointer border-amber-500/10 hover:border-amber-500/30 hover:shadow-sm transition-all duration-300 overflow-hidden relative"
                            onClick={() => {
                              createThread();
                              setMessage("What are the most important concepts to understand in modern JavaScript?");
                            }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-amber-500/10 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative z-10">
                              <p className="font-medium text-base mb-1.5">What should I know about...</p>
                              <p className="text-sm text-muted-foreground">Discover essential knowledge in any field</p>
                            </div>
                            <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <ArrowRight className="h-4 w-4 text-amber-500/70" />
                            </div>
                          </Card>

                          <Card
                            className="group p-5 cursor-pointer border-amber-500/10 hover:border-amber-500/30 hover:shadow-sm transition-all duration-300 overflow-hidden relative"
                            onClick={() => {
                              createThread();
                              setMessage("Explain TypeScript generics with practical examples");
                            }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-amber-500/10 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative z-10">
                              <p className="font-medium text-base mb-1.5">Explain with examples...</p>
                              <p className="text-sm text-muted-foreground">Learn concepts with practical demonstrations</p>
                            </div>
                            <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <ArrowRight className="h-4 w-4 text-amber-500/70" />
                            </div>
                          </Card>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show templates for a new chat thread */}
                {currentThread?.id === 'new' && currentThread.messages.length === 0 && !showProjectsGrid && !showAgentsGrid && (
                  <div className="py-8 max-w-5xl mx-auto">
                    <div className="relative py-10 px-12 bg-gradient-to-b from-white/10 to-white/5 dark:from-black/10 dark:to-black/5 backdrop-blur-md rounded-3xl border border-white/20 dark:border-white/10 mb-14 shadow-[0_10px_50px_-12px_rgba(0,0,0,0.25)] overflow-hidden">
                      {/* Ultra-modern gradient background effects */}
                      <div className="absolute -z-10 inset-0 overflow-hidden">
                        {/* Primary gradient blob with animation */}
                        <div className="absolute -z-10 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[180%] h-[180%] bg-gradient-to-br from-primary/20 via-blue-500/15 to-purple-500/20 blur-3xl rounded-full opacity-70 animate-pulse-soft [animation-duration:8s]"></div>

                        {/* Secondary animated gradient blobs */}
                        <div className="absolute -z-10 left-1/4 top-1/2 -translate-y-1/2 w-1/3 h-1/3 bg-gradient-to-br from-emerald-500/15 via-primary/10 to-pink-500/15 blur-2xl rounded-full opacity-60 animate-pulse-soft [animation-duration:10s]"></div>
                        <div className="absolute -z-10 right-1/4 bottom-1/3 w-1/4 h-1/4 bg-gradient-to-br from-blue-500/15 via-primary/10 to-purple-500/15 blur-2xl rounded-full opacity-50 animate-pulse-soft [animation-duration:12s] [animation-delay:1s]"></div>
                        <div className="absolute -z-10 right-1/3 top-1/4 w-1/5 h-1/5 bg-gradient-to-br from-purple-500/15 via-primary/10 to-blue-500/15 blur-2xl rounded-full opacity-40 animate-pulse-soft [animation-duration:14s] [animation-delay:2s]"></div>

                        {/* Enhanced shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_5s_infinite] will-change-transform"></div>

                        {/* Subtle noise texture overlay */}
                        <div className="absolute inset-0 bg-noise opacity-[0.03] mix-blend-soft-light"></div>

                        {/* Subtle border glow */}
                        <div className="absolute inset-0 rounded-3xl border border-white/30 dark:border-white/20 opacity-50 blur-[2px]"></div>

                        {/* Radial highlight */}
                        <div className="absolute -z-10 left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-1/2 h-1/2 bg-gradient-to-r from-white/5 to-transparent blur-3xl rounded-full opacity-60"></div>
                      </div>

                      {/* Enhanced animated greeting with user name */}
                      <div className="flex flex-col items-center">
                        {/* Decorative element */}
                        <div className="mb-6 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/40 to-blue-500/40 animate-pulse-soft [animation-duration:3s]"></div>
                          </div>
                        </div>

                        <div className="relative mb-6">
                          <div className="absolute -z-10 -inset-10 bg-gradient-to-r from-primary/20 via-blue-500/20 to-purple-500/20 blur-xl rounded-full opacity-80 animate-pulse-soft [animation-duration:4s]"></div>
                          <h2 className="text-3xl md:text-5xl font-bold mb-3">
                            <span className="relative inline-block">
                              <span className="animate-typing-effect overflow-hidden whitespace-nowrap border-r-2 border-primary pr-1 drop-shadow-[0_2px_10px_rgba(var(--primary),0.3)] bg-gradient-to-r from-primary/90 via-blue-500/90 to-purple-500/90 bg-clip-text text-transparent">
                                Howdy{user?.name ? `, ${user.name}` : ""}!
                              </span>
                            </span>
                          </h2>
                        </div>

                        <h3 className="text-2xl md:text-3xl font-medium mb-8 bg-gradient-to-r from-primary/90 via-blue-500/90 to-purple-500/90 bg-clip-text text-transparent drop-shadow-sm">How can I help you today?</h3>

                        {/* Enhanced decorative divider */}
                        <div className="relative">
                          <div className="h-[1px] w-40 bg-gradient-to-r from-transparent via-primary/40 to-transparent"></div>
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-10 bg-gradient-to-r from-primary/40 via-primary/60 to-primary/40 blur-[1px] opacity-70"></div>
                        </div>
                      </div>
                    </div>

                    {/* Premium category tabs with 3D effects - more compact */}
                    <div className="flex justify-center mb-8 max-w-md mx-auto relative">
                      {/* Background glow effect */}
                      <div className="absolute -z-10 inset-0 -m-2 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-2xl opacity-70 blur-lg"></div>

                      {/* Main tab container */}
                      <div className="flex w-full bg-gradient-to-b from-white/10 to-white/5 dark:from-black/10 dark:to-black/5 backdrop-blur-md p-1 rounded-xl shadow-md border border-white/20 dark:border-white/10 relative overflow-hidden">
                        {/* Subtle shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_8s_infinite] will-change-transform"></div>

                        {/* Tab buttons container */}
                        <div className="flex w-full relative z-10 gap-0.5">
                          {templateCategories.map((category) => {
                            const isSelected = selectedTemplateCategory === category.id;
                            return (
                              <button
                                key={category.id}
                                onClick={() => {
                                  setSelectedTemplateCategory(category.id as any);
                                  rotateTemplates(category.id);
                                }}
                                className={`relative group px-2 py-2 rounded-lg font-medium transition-all duration-300 text-xs flex-1 flex items-center justify-center gap-1.5
                                  ${isSelected
                                    ? `bg-gradient-to-b from-white/15 to-white/5 dark:from-black/20 dark:to-black/10 shadow-[0_2px_6px_-2px_rgba(0,0,0,0.1)] text-primary`
                                    : `text-muted-foreground hover:text-foreground hover:bg-white/5 dark:hover:bg-black/10`
                                  }
                                `}
                              >
                                {/* Selection highlight effects */}
                                {isSelected && (
                                  <div className="absolute inset-0 rounded-lg ring-1 ring-white/20 dark:ring-white/10"></div>
                                )}

                                {/* Icon with glow effect */}
                                <div className={`relative flex items-center justify-center h-5 w-5 rounded-full ${isSelected ? 'bg-primary/10' : 'bg-white/5 dark:bg-black/5'} transition-colors duration-300`}>
                                  {isSelected && <div className="absolute inset-0 rounded-full blur-[1px] bg-primary/20 opacity-70"></div>}
                                  <category.icon className={`w-3 h-3 ${isSelected ? 'text-primary' : 'opacity-70 group-hover:opacity-90'} transition-all duration-300`} />
                                </div>

                                {/* Label */}
                                <span className={`${isSelected ? 'font-semibold' : ''} transition-all duration-300`}>{category.label}</span>

                                {/* Bottom indicator */}
                                <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 transition-all duration-300 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent"
                                     style={{
                                       width: isSelected ? '40%' : '0%',
                                       opacity: isSelected ? 0.7 : 0
                                     }}>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>


                    {/* Simplified templates grid with system theme support */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                      {templateCategories.find(c => c.id === selectedTemplateCategory)?.templates.map((template, index) => {
                        const category = templateCategories.find(c => c.id === selectedTemplateCategory)!;

                        // Determine category-specific colors and styles using theme colors
                        const categoryColors = {
                          writing: { bg: 'bg-primary/5 dark:bg-primary/10', icon: 'text-primary' },
                          learning: { bg: 'bg-primary/5 dark:bg-primary/10', icon: 'text-primary' },
                          coding: { bg: 'bg-primary/5 dark:bg-primary/10', icon: 'text-primary' },
                          other: { bg: 'bg-primary/5 dark:bg-primary/10', icon: 'text-primary' }
                        };

                        const colorSet = categoryColors[category.id as keyof typeof categoryColors] || categoryColors.other;

                        return (
                          <Card
                            key={`template-${selectedTemplateCategory}-${index}`}
                            className={`group p-0 cursor-pointer transition-all duration-300 border-white/10 dark:border-white/5 hover:shadow-md overflow-hidden relative rounded-xl hover:scale-[1.01] hover:border-primary/20 ${colorSet.bg} backdrop-blur-sm`}
                            onClick={() => {
                              if (template.enableBrowse) {
                                setBrowseMode(true);
                              }
                              setMessage(template.prompt);
                            }}
                          >
                            {/* Simple hover effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                            <div className="relative z-10 flex flex-col h-full p-5">
                              {/* Template header with icon */}
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center">
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3 bg-white/20 dark:bg-black/20">
                                    <category.icon className={`w-4 h-4 ${colorSet.icon}`} />
                                  </div>
                                  <div>
                                    <p className={`font-semibold text-base transition-colors`}>
                                      {template.title}
                                    </p>
                                    {template.enableBrowse && (
                                      <div className="flex items-center mt-0.5">
                                        <Globe className="w-3 h-3 mr-1 text-primary/70" />
                                        <span className="text-xs text-primary/70">Web-enabled</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Template description */}
                              <p className="text-sm text-muted-foreground mb-4">{template.description}</p>

                              {/* Simple prompt preview */}
                              <div className="mt-auto pt-2 border-t border-white/5 dark:border-white/5 flex justify-between items-center">
                                <p className="text-xs text-muted-foreground truncate max-w-[80%]">{template.prompt.substring(0, 40)}...</p>

                                {/* Simple arrow indicator */}
                                <div className="flex items-center justify-center rounded-full p-1.5 bg-white/10 dark:bg-white/5 group-hover:bg-primary/10 transition-colors duration-300">
                                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                                </div>
                              </div>
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
