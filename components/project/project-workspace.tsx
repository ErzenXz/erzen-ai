"use client"

import * as React from "react"
import { FileTree } from "@/components/project/file-tree"
import { CodeEditor, ThemeOption, editorThemes } from "@/components/project/code-editor"
import { ProjectThreadsView } from "@/components/project/project-threads"
import { FilePreview } from "@/components/project/file-preview"
import { ProjectPreview } from "@/components/project/project-preview"
import {
  FileX,
  Save,
  Settings,
  UserPlus,
  GitBranch,
  MessageSquareText,
  History,
  Plus,
  FolderPlus,
  Loader2,
  Copy,
  Download,
  FileCode,
  Code,
  MessageSquare,
  FileSymlink,
  Check,
  ChevronDown,
  MoreHorizontal,
  Sparkles,
  Trash,
  Undo2,
  Command as LucideCommand,
  ArrowRight,
  Github,
  ZoomIn,
  Eye,
  EyeOff,
  Terminal,
  Cpu,
  Palette,
  Sun,
  Moon,
  Play,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useProject } from "@/hooks/use-project"
import { toast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu"
import { TabsList, TabsTrigger, Tabs } from "@/components/ui/tabs"
import { fetchProjectFileVersions, revertProjectFileVersion, createProjectFile, updateProjectFile } from "@/lib/api"
import type { CurrentVersion } from "@/lib/types"
import { useTheme } from "next-themes"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Command as CommandUI,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"

export function ProjectWorkspace() {
  const { 
    currentProject, 
    projectFiles, 
    saveFile, 
    loadFile, 
    currentThread, 
    fetchFileVersions, 
    revertToVersion, 
    processAIInstruction, 
    createFile, 
    renameFile, 
    deleteFile,
    isLoading: projectIsLoading 
  } = useProject()
  const { theme, setTheme } = useTheme()
  const [activeFilePath, setActiveFilePath] = React.useState<string | undefined>()
  const [fileContent, setFileContent] = React.useState("")
  const [agentInstruction, setAgentInstruction] = React.useState("")
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)

  // Add a state for the active tab
  const [activeTab, setActiveTab] = React.useState<"editor" | "threads">("editor")

  // Create a new boolean state for preview mode
  const [isPreviewMode, setIsPreviewMode] = React.useState(false)

  // State for new thread dialog
  const [showNewThreadDialog, setShowNewThreadDialog] = React.useState(false)
  const [newThreadTitle, setNewThreadTitle] = React.useState("")

  // File management dialogs
  const [showNewFileDialog, setShowNewFileDialog] = React.useState(false)
  const [showNewFolderDialog, setShowNewFolderDialog] = React.useState(false)
  const [showRenameDialog, setShowRenameDialog] = React.useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [showVersionsDialog, setShowVersionsDialog] = React.useState(false)

  // Form states
  const [newFileName, setNewFileName] = React.useState("")
  const [newFolderName, setNewFolderName] = React.useState("")
  const [newPath, setNewPath] = React.useState("")
  const [currentParentPath, setCurrentParentPath] = React.useState("")
  const [fileVersions, setFileVersions] = React.useState<CurrentVersion[]>([])
  const [isLoadingVersions, setIsLoadingVersions] = React.useState(false)

  // Unsaved changes tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false)
  const [originalContent, setOriginalContent] = React.useState("")
  
  // Theme state
  const [selectedEditorTheme, setSelectedEditorTheme] = React.useState<ThemeOption>(
    editorThemes.find(t => t.value === "black") || editorThemes[0]
  )
  const [showThemeMenu, setShowThemeMenu] = React.useState(false)

  // Load file content when active file changes
  React.useEffect(() => {
    const loadFileContent = async () => {
      if (activeFilePath) {
        const file = projectFiles.find((f) => f.path === activeFilePath)
        if (file?.content !== undefined) {
          setFileContent(file.content)
          setOriginalContent(file.content)
          setHasUnsavedChanges(false)
        } else if (activeFilePath) {
          try {
            const loadedFile = await loadFile(activeFilePath)
            if (loadedFile) {
              setFileContent(loadedFile.content ?? "")
              setOriginalContent(loadedFile.content ?? "")
              setHasUnsavedChanges(false)
            }
          } catch (error) {
            console.error("Failed to load file:", error)
            toast({
              title: "Error loading file",
              description: "Could not load file content. Please try again.",
              variant: "destructive",
            })
          }
        }
      } else {
        setFileContent("")
        setOriginalContent("")
        setHasUnsavedChanges(false)
      }
    }

    loadFileContent()
  }, [activeFilePath, projectFiles, loadFile])

  // Track unsaved changes
  React.useEffect(() => {
    if (originalContent !== fileContent) {
      setHasUnsavedChanges(true)
    } else {
      setHasUnsavedChanges(false)
    }
  }, [fileContent, originalContent])

  const handleFileSave = async () => {
    if (!activeFilePath) {
      return
    }

    setIsSaving(true)
    try {
      await saveFile(activeFilePath, fileContent)
      setOriginalContent(fileContent)
      setHasUnsavedChanges(false)
      toast({
        title: "File saved",
        description: `${activeFilePath} saved successfully.`,
      })
    } catch (error) {
      toast({
        title: "Error saving file",
        description: "Failed to save file. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateFile = async () => {
    if (!newFileName.trim()) {
      return
    }

    try {
      const path = currentParentPath ? `${currentParentPath}/${newFileName}` : newFileName

      // Use the createFile function from useProject
      await createFile(path, "", getFileLanguage(path));

      toast({
        title: "File created",
        description: `${newFileName} created successfully.`,
      })

      setShowNewFileDialog(false)
      setActiveFilePath(path)
    } catch (error) {
      toast({
        title: "Error creating file",
        description: "Failed to create file. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleShowNewFileDialog = (parentPath: string) => {
    setCurrentParentPath(parentPath)
    setNewFileName("")
    setShowNewFileDialog(true)
  }

  const handleShowNewFolderDialog = (parentPath: string) => {
    setCurrentParentPath(parentPath)
    setNewFolderName("")
    setShowNewFolderDialog(true)
  }

  const handleShowRenameDialog = (filePath: string) => {
    const pathParts = filePath.split("/")
    const fileName = pathParts.pop() ?? ""
    const parentPath = pathParts.join("/")

    setCurrentParentPath(parentPath)
    setActiveFilePath(filePath)
    setNewPath(fileName)
    setShowRenameDialog(true)
  }

  const handleShowDeleteDialog = (filePath: string) => {
    setActiveFilePath(filePath)
    setShowDeleteDialog(true)
  }

  const handleRenameFile = async () => {
    if (!activeFilePath || !newPath.trim()) {
      return
    }

    try {
      // Get parent directory from current path
      const pathParts = activeFilePath.split("/")
      pathParts.pop() // Remove the filename
      const parentPath = pathParts.join("/")
      
      // Construct new path
      const newFilePath = parentPath ? `${parentPath}/${newPath}` : newPath
      
      // Use renameFile from useProject
      await renameFile(activeFilePath, newFilePath)

      toast({
        title: "File renamed",
        description: `File renamed successfully to ${newPath}.`,
      })

      setShowRenameDialog(false)
      setActiveFilePath(newFilePath)
    } catch (error) {
      toast({
        title: "Error renaming file",
        description: "Failed to rename file. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteFile = async () => {
    if (!activeFilePath) {
      return
    }

    try {
      // Use deleteFile from useProject
      await deleteFile(activeFilePath)

      toast({
        title: "File deleted",
        description: `${activeFilePath} deleted successfully.`,
      })

      setActiveFilePath(undefined)
      setFileContent("")
      setShowDeleteDialog(false)
    } catch (error) {
      toast({
        title: "Error deleting file",
        description: "Failed to delete file. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleShowVersionHistory = async () => {
    if (!activeFilePath) {
      return
    }

    setIsLoadingVersions(true)
    setShowVersionsDialog(true)

    try {
      // Use the new fetchFileVersions function from useProject hook
      const versions = await fetchFileVersions(activeFilePath);
      setFileVersions(versions);
    } catch (error) {
      toast({
        title: "Error loading versions",
        description: "Failed to load file version history.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingVersions(false)
    }
  }

  const handleRevertVersion = async (versionId: string) => {
    if (!activeFilePath) return

    try {
      // Use the new revertToVersion function from useProject hook
      await revertToVersion(activeFilePath, Number.parseInt(versionId));
      
      // Refresh the file content (will be handled by revertToVersion)
      const file = projectFiles.find((f) => f.path === activeFilePath);
      if (file) {
        setFileContent(file.content ?? "");
        setOriginalContent(file.content ?? "");
        setHasUnsavedChanges(false);
      }

      toast({
        title: "Version restored",
        description: "File reverted to selected version.",
      })

      setShowVersionsDialog(false)
    } catch (error) {
      toast({
        title: "Error reverting version",
        description: "Failed to revert to selected version.",
        variant: "destructive",
      })
    }
  }

  const handleAgentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agentInstruction.trim()) {
      return
    }

    setIsProcessing(true)

    try {
      const response = await processAIInstruction(agentInstruction, currentThread?.id)

      if (response.threadId && !currentThread) {
        // If a new thread was created, select it and switch to the threads tab
        // selectProjectThread(response.threadId)
        setActiveTab("threads")
      } else if (currentThread) {
        // If we're in an existing thread, reload the thread to get new messages
        // reloadThread(currentThread.id)
      }

      toast({
        title: "AI processing complete",
        description: "Your instruction has been processed.",
      })
    } catch (error) {
      console.error("Error processing AI instruction:", error)
      toast({
        title: "Error",
        description: "Failed to process your instruction. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setAgentInstruction("")
    }
  }

  // Get file language based on file extension
  const getFileLanguage = (filePath = ""): string => {
    const ext = filePath.split(".").pop()?.toLowerCase() ?? ""

    const mapping: Record<string, string> = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      html: "html",
      css: "css",
      json: "json",
      md: "markdown",
      py: "python",
      rb: "ruby",
      go: "go",
      java: "java",
      php: "php",
      rs: "rust",
      c: "c",
      cpp: "cpp",
      cs: "csharp",
      swift: "swift",
      sh: "shell",
      yml: "yaml",
      yaml: "yaml",
      sql: "sql",
    }

    return mapping[ext] ?? "plaintext"
  }

  // Get file extension from path
  const getFileExtension = (filePath = ""): string => {
    return filePath.split(".").pop()?.toLowerCase() ?? ""
  }

  // Check if the file type can be rendered in the project preview
  const canUseProjectPreview = (filePath = ""): boolean => {
    const ext = getFileExtension(filePath)
    // These file types work well in the ProjectPreview
    return ['html', 'htm', 'js', 'jsx', 'ts', 'tsx'].includes(ext)
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      return
    }

    try {
      const path = currentParentPath ? `${currentParentPath}/${newFolderName}` : newFolderName

      // Create a .gitkeep file in the folder to ensure it exists
      await createFile(`${path}/.gitkeep`, "", "plaintext");

      toast({
        title: "Folder created",
        description: `${newFolderName} created successfully.`,
      })

      setShowNewFolderDialog(false)
    } catch (error) {
      toast({
        title: "Error creating folder",
        description: "Failed to create folder. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSwitchTab = (tab: "editor" | "threads") => {
    setActiveTab(tab)
    // If user has unsaved changes when switching tabs, show a warning
    if (tab !== "editor" && hasUnsavedChanges) {
      toast({
        title: "Unsaved changes",
        description: "You have unsaved changes in your editor.",
      })
    }
  }

  // Handle creating a new thread
  const handleCreateThread = async () => {
    if (!newThreadTitle.trim() || !currentProject) {
      return
    }

    try {
      // In a real implementation, you would call an API to create a new thread
      toast({
        title: "Thread created",
        description: `New thread "${newThreadTitle}" was created successfully.`,
      })
      setShowNewThreadDialog(false)
      setNewThreadTitle("")
    } catch (error) {
      console.error("Error creating thread:", error)
      toast({
        title: "Error",
        description: "Failed to create new thread.",
        variant: "destructive",
      })
    }
  }

  // Handle theme selection
  const handleSelectTheme = (theme: ThemeOption) => {
    setSelectedEditorTheme(theme)
    setShowThemeMenu(false)
    if (theme.value !== 'system' && theme.value !== 'light' && theme.value !== 'dark') {
      // Only set the theme in next-themes if it's a basic theme
      return
    }
    setTheme(theme.value)
  }

  // Toggle preview mode on/off
  const togglePreviewMode = () => {
    setIsPreviewMode(prev => !prev)
  }

  // Connect the component loading state to the project loading state
  React.useEffect(() => {
    setIsLoading(projectIsLoading);
  }, [projectIsLoading]);

  if (!currentProject) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">No Project Selected</h2>
          <p className="text-muted-foreground">Select or create a project to start coding</p>
        </div>
      </div>
    )
  }

  // Show loading state while project data is being prepared
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background/60 backdrop-blur-sm">
        <div className="text-center flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute -inset-10 bg-primary/5 blur-xl rounded-full"></div>
            <div className="relative flex items-center justify-center w-20 h-20 rounded-xl bg-primary/10 backdrop-blur-sm">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-medium mb-1">Loading {currentProject.name}</h3>
            <p className="text-muted-foreground text-sm">Preparing your workspace...</p>
          </div>
        </div>
      </div>
    )
  }

  // Get project stats for the tabs
  const fileCount = projectFiles?.length || 0

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="border-b bg-muted/10 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary"></div>
              <h2 className="text-lg font-semibold truncate max-w-[200px]">{currentProject.name}</h2>
            </div>
            <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
              {fileCount} files
            </Badge>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(value) => handleSwitchTab(value as "editor" | "threads")}
            className="mx-auto"
          >
            <TabsList className="grid w-[320px] grid-cols-2 p-1 bg-muted/20 backdrop-blur-sm">
              <TabsTrigger value="editor" className="flex items-center gap-1.5 px-3 rounded-md data-[state=active]:bg-background/80">
                <FileSymlink className="h-3.5 w-3.5" />
                Code Editor
              </TabsTrigger>
              <TabsTrigger value="threads" className="flex items-center gap-1.5 px-3 rounded-md data-[state=active]:bg-background/80">
                <MessageSquare className="h-3.5 w-3.5" />
                AI Threads
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Popover open={showThemeMenu} onOpenChange={setShowThemeMenu}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <Palette className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-48" side="bottom" align="center">
                      <CommandUI>
                        <CommandInput placeholder="Search themes..." />
                        <CommandList>
                          <CommandEmpty>No theme found.</CommandEmpty>
                          <CommandGroup>
                            {editorThemes.map((theme) => (
                              <CommandItem
                                key={theme.value}
                                value={theme.value}
                                onSelect={() => handleSelectTheme(theme)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedEditorTheme.value === theme.value ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {theme.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </CommandUI>
                    </PopoverContent>
                  </Popover>
                </TooltipTrigger>
                <TooltipContent>Editor Theme</TooltipContent>
              </Tooltip>

              {activeFilePath && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant={isPreviewMode ? "default" : "ghost"}
                      size="icon" 
                      className="h-8 w-8 rounded-full"
                      onClick={togglePreviewMode}
                    >
                      {isPreviewMode ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isPreviewMode ? "Exit Preview" : "Preview"}</TooltipContent>
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                    <Terminal className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Terminal</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                    <Github className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>GitHub Repository</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add Collaborator</TooltipContent>
              </Tooltip>
              <div className="h-4 w-px bg-border/50 mx-1"></div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                    <Settings className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Project Settings</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === "editor" ? (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="border-r bg-background">
              <div className="p-2 border-b bg-muted/10 flex items-center justify-between">
                <div className="text-xs font-medium text-muted-foreground">Project Files</div>
                <div className="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md">
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">New File</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md">
                          <FolderPlus className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">New Folder</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              <FileTree
                files={projectFiles}
                activeFile={activeFilePath}
                onSelectFile={setActiveFilePath}
                onCreateFile={handleShowNewFileDialog}
                onCreateFolder={handleShowNewFolderDialog}
                onDeleteFile={handleShowDeleteDialog}
                onRenameFile={handleShowRenameDialog}
              />
            </ResizablePanel>

            <ResizableHandle withHandle className="bg-transparent before:bg-border" />

            <ResizablePanel defaultSize={80} className="flex flex-col">
              {activeFilePath ? (
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between border-b p-2 bg-muted/10 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex items-center justify-center h-5 w-5 rounded-md bg-blue-500/10">
                        <FileCode className="w-3.5 h-3.5 text-blue-500" />
                      </div>
                      <span className="font-medium truncate max-w-[260px] md:max-w-[400px] lg:max-w-[500px]">
                        {activeFilePath}
                      </span>
                      {hasUnsavedChanges && (
                        <Badge
                          variant="outline"
                          className="text-xs font-normal bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                        >
                          Unsaved
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-xs rounded-md">
                            <Code className="h-3.5 w-3.5" />
                            <span>Actions</span>
                            <ChevronDown className="h-3 w-3 opacity-50" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuLabel>File Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={handleFileSave}
                            disabled={!hasUnsavedChanges || isSaving}
                            className={hasUnsavedChanges ? "text-primary font-medium" : ""}
                          >
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : hasUnsavedChanges ? (
                              <Save className="h-4 w-4 mr-2 text-primary" />
                            ) : (
                              <Check className="h-4 w-4 mr-2" />
                            )}
                            {isSaving ? "Saving..." : hasUnsavedChanges ? "Save" : "Saved"}
                            <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleShowVersionHistory}>
                            <History className="h-4 w-4 mr-2" />
                            Version History
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleShowRenameDialog(activeFilePath)}>
                            <Settings className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleShowDeleteDialog(activeFilePath)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {hasUnsavedChanges && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={handleFileSave}
                          disabled={isSaving}
                          className="h-7 px-3 rounded-md bg-primary/80 hover:bg-primary"
                        >
                          {isSaving ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Save className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          {isSaving ? "Saving..." : "Save"}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 relative">
                    {isPreviewMode ? (
                      canUseProjectPreview(activeFilePath || '') ? (
                        <ProjectPreview
                          projectFiles={projectFiles}
                          activeFilePath={activeFilePath}
                        />
                      ) : (
                        <FilePreview
                          content={fileContent}
                          fileType={getFileExtension(activeFilePath || '')}
                        />
                      )
                    ) : (
                      <CodeEditor
                        value={fileContent}
                        language={getFileLanguage(activeFilePath)}
                        onChange={setFileContent}
                        theme={selectedEditorTheme.monacoTheme}
                      />
                    )}
                  </div>

                  {/* AI Assistant Input */}
                  <div className="border-t p-3 px-4 bg-muted/5 backdrop-blur-sm">
                    <form onSubmit={handleAgentSubmit} className="flex gap-2 w-full max-w-5xl mx-auto">
                      <div className="relative flex-1 min-w-0">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-md bg-primary/10">
                          <Cpu className="h-3 w-3 text-primary" />
                        </div>
                        <Input
                          placeholder="Ask AI to help with your code... (e.g., 'Create a login form')"
                          value={agentInstruction}
                          onChange={(e) => setAgentInstruction(e.target.value)}
                          className="flex-1 min-w-0 text-sm border-primary/10 focus-visible:ring-primary/20 pl-9 pr-16 py-2 h-10 rounded-xl shadow-sm"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <kbd className="hidden md:inline-flex items-center gap-1 px-2 border rounded text-xs font-mono text-muted-foreground bg-muted/30">
                            <LucideCommand className="h-3 w-3" />
                            <span>Enter</span>
                          </kbd>
                        </div>
                      </div>
                      <Button
                        type="submit"
                        className="flex-shrink-0 bg-primary/80 hover:bg-primary transition-colors shadow-md rounded-xl"
                        disabled={isProcessing || !agentInstruction.trim()}
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <ArrowRight className="h-4 w-4 mr-2" />
                        )}
                        {isProcessing ? "Processing..." : "Send"}
                      </Button>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <div className="text-center max-w-md px-6">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 to-primary/20 blur-3xl rounded-full opacity-50"></div>
                      <div className="bg-gradient-to-br from-muted/20 to-muted/40 backdrop-blur-md w-20 h-20 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-primary/5">
                        <FileX className="h-10 w-10 text-primary/70" />
                      </div>
                    </div>
                    <h3 className="text-xl font-medium mb-3">No file selected</h3>
                    <p className="text-muted-foreground mb-6">
                      Select a file from the file tree or create a new one to start coding in this project
                    </p>
                    <div className="flex justify-center gap-3">
                      <Button
                        onClick={() => handleShowNewFileDialog("")}
                        className="rounded-xl bg-primary/80 hover:bg-primary transition-colors shadow-md"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        New File
                      </Button>
                      <Button variant="outline" onClick={() => handleShowNewFolderDialog("")} className="rounded-xl">
                        <FolderPlus className="h-4 w-4 mr-2" />
                        New Folder
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="h-full flex flex-col">
            <ProjectThreadsView />
          </div>
        )}
      </div>

      {/* New Thread Dialog */}
      <Dialog open={showNewThreadDialog} onOpenChange={setShowNewThreadDialog}>
        <DialogContent className="sm:max-w-[450px] rounded-xl border-muted/30 shadow-lg">
          <DialogHeader>
            <DialogTitle>Create New Thread</DialogTitle>
            <DialogDescription>Enter a title for your new thread.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Thread title"
            value={newThreadTitle}
            onChange={(e) => setNewThreadTitle(e.target.value)}
            autoFocus
            className="mt-2 rounded-lg"
          />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowNewThreadDialog(false)} className="rounded-lg">
              Cancel
            </Button>
            <Button onClick={handleCreateThread} disabled={!newThreadTitle.trim()} className="rounded-lg">
              Create Thread
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New File Dialog */}
      <Dialog open={showNewFileDialog} onOpenChange={setShowNewFileDialog}>
        <DialogContent className="sm:max-w-[450px] rounded-xl border-muted/30 shadow-lg">
          <DialogHeader>
            <DialogTitle>Create New File</DialogTitle>
            <DialogDescription>
              Enter a file name to create in <span className="font-semibold">{currentParentPath || "root"}</span>
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="File name (e.g., app.js, index.html)"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            autoFocus
            className="mt-2 rounded-lg"
          />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowNewFileDialog(false)} className="rounded-lg">
              Cancel
            </Button>
            <Button onClick={handleCreateFile} disabled={!newFileName.trim()} className="rounded-lg">
              Create File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent className="sm:max-w-[450px] rounded-xl border-muted/30 shadow-lg">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a folder name to create in <span className="font-semibold">{currentParentPath || "root"}</span>
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Folder name (e.g., src, components)"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            autoFocus
            className="mt-2 rounded-lg"
          />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowNewFolderDialog(false)} className="rounded-lg">
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()} className="rounded-lg">
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="sm:max-w-[450px] rounded-xl border-muted/30 shadow-lg">
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
            <DialogDescription>Enter a new name for this file</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="New name"
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            autoFocus
            className="mt-2 rounded-lg"
          />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowRenameDialog(false)} className="rounded-lg">
              Cancel
            </Button>
            <Button onClick={handleRenameFile} disabled={!newPath.trim()} className="rounded-lg">
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[450px] rounded-xl border-muted/30 shadow-lg">
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold">{activeFilePath}</span>? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="rounded-lg">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteFile} className="rounded-lg">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={showVersionsDialog} onOpenChange={setShowVersionsDialog}>
        <DialogContent className="max-w-2xl rounded-xl border-muted/30 shadow-lg">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
            <DialogDescription>Select a version to view or restore</DialogDescription>
          </DialogHeader>

          {isLoadingVersions ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : fileVersions.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No version history available for this file</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] border rounded-lg bg-muted/5">
              <div className="space-y-0.5 p-1">
                {fileVersions.map((version) => (
                  <div
                    key={version.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 group transition-colors"
                  >
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium">{new Date(version.createdAt).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {version.authorId ? `By ${version.authorId}` : "Automatic save"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevertVersion(version.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                      >
                        <Undo2 className="h-3.5 w-3.5 mr-2" />
                        Restore
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowVersionsDialog(false)} className="rounded-lg">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

