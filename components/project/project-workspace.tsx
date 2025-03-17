"use client"

import * as React from "react"
import { FileTree } from "@/components/project/file-tree"
import { CodeEditor } from "@/components/project/code-editor"
import { ProjectThreadsView } from "@/components/project/project-threads"
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

export function ProjectWorkspace() {
  const { currentProject, projectFiles, saveFile, loadFile, currentThread } = useProject()
  const [activeFilePath, setActiveFilePath] = React.useState<string | undefined>()
  const [fileContent, setFileContent] = React.useState("")
  const [agentInstruction, setAgentInstruction] = React.useState("")
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  // Add a state for the active tab
  const [activeTab, setActiveTab] = React.useState<"editor" | "threads">("editor")

  // State for new thread dialog
  const [showNewThreadDialog, setShowNewThreadDialog] = React.useState(false)
  const [newThreadTitle, setNewThreadTitle] = React.useState("")

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

      await createProjectFile(currentProject?.id ?? "", {
        name: newFileName,
        path,
        content: "",
        commitMsg: `Created ${newFileName}`,
      })

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
      const pathParts = activeFilePath.split("/")
      const oldName = pathParts.pop() ?? ""
      const parentPath = pathParts.join("/")

      const newFilePath = parentPath ? `${parentPath}/${newPath}` : newPath

      // Use updateProjectFile since there's no direct rename API
      await updateProjectFile(currentProject?.id ?? "", activeFilePath, {
        commitMsg: `Renamed ${oldName} to ${newPath}`,
      })

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
      // Mark the file as deleted using updateProjectFile since there's no direct delete API
      await updateProjectFile(currentProject?.id ?? "", activeFilePath, {
        commitMsg: `Deleted ${activeFilePath}`,
      })

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
      const file = projectFiles.find((f) => f.path === activeFilePath)
      if (!file) {
        throw new Error("File not found")
      }
      const versions = await fetchProjectFileVersions(currentProject?.id ?? "", file.id)
      setFileVersions(versions)
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
      await revertProjectFileVersion(currentProject?.id ?? "", activeFilePath, {
        version: Number.parseInt(versionId),
        commitMsg: `Reverted to version ${versionId}`,
      })

      // Reload the file content
      const loadedFile = await loadFile(activeFilePath)
      if (loadedFile) {
        setFileContent(loadedFile.content ?? "")
        setOriginalContent(loadedFile.content ?? "")
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

  const handleAgentSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!agentInstruction.trim()) {
      return
    }

    setIsProcessing(true)

    // Simulate AI processing
    setTimeout(() => {
      toast({
        title: "AI agent processing",
        description: "Your instruction is being processed.",
      })
      setIsProcessing(false)
      // Clear instruction after processing
      setAgentInstruction("")
    }, 2000)
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

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      return
    }

    try {
      const path = currentParentPath ? `${currentParentPath}/${newFolderName}` : newFolderName

      // Create a .gitkeep file in the folder to ensure it exists
      await createProjectFile(currentProject?.id ?? "", {
        name: ".gitkeep",
        path: `${path}/.gitkeep`,
        content: "",
        commitMsg: `Created folder ${newFolderName}`,
      })

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

  // Get project stats for the tabs
  const fileCount = projectFiles?.length || 0

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="border-b bg-muted/20">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold truncate max-w-[200px]">{currentProject.name}</h2>
            <Badge variant="outline" className="text-xs bg-primary/5 text-primary">
              {fileCount} files
            </Badge>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(value) => handleSwitchTab(value as "editor" | "threads")}
            className="mx-auto"
          >
            <TabsList className="grid w-[220px] grid-cols-2">
              <TabsTrigger value="editor" className="flex items-center gap-1.5 px-3">
                <FileSymlink className="h-3.5 w-3.5" />
                Editor
              </TabsTrigger>
              <TabsTrigger value="threads" className="flex items-center gap-1.5 px-3">
                <MessageSquare className="h-3.5 w-3.5" />
                Threads
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add Collaborator</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <GitBranch className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Version Control</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
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
            <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="border-r">
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

            <ResizableHandle withHandle className="bg-border" />

            <ResizablePanel defaultSize={80} className="flex flex-col">
              {activeFilePath ? (
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between border-b p-2 bg-muted/30">
                    <div className="flex items-center gap-2 text-sm">
                      <FileCode className="w-4 h-4 text-blue-500" />
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
                    <div className="flex items-center gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs">
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
                          className="h-8"
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
                    <CodeEditor
                      value={fileContent}
                      language={getFileLanguage(activeFilePath)}
                      onChange={setFileContent}
                    />
                  </div>

                  {/* AI Assistant Input */}
                  <div className="border-t p-3 px-4 bg-muted/20">
                    <form onSubmit={handleAgentSubmit} className="flex gap-2 w-full max-w-5xl mx-auto">
                      <div className="relative flex-1 min-w-0">
                        <Input
                          placeholder="Ask AI to help with your code... (e.g., 'Create a login form')"
                          value={agentInstruction}
                          onChange={(e) => setAgentInstruction(e.target.value)}
                          className="flex-1 min-w-0 text-sm border-primary/20 focus-visible:ring-primary/30 pl-9 pr-4 py-2 h-10"
                        />
                        <Sparkles className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary/60" />
                      </div>
                      <Button
                        type="submit"
                        className="flex-shrink-0 bg-primary/90 hover:bg-primary transition-colors"
                        disabled={isProcessing || !agentInstruction.trim()}
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <MessageSquareText className="h-4 w-4 mr-2" />
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
                      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 to-primary/10 blur-3xl rounded-full opacity-50"></div>
                      <div className="bg-muted/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                        <FileX className="h-10 w-10 text-muted-foreground" />
                      </div>
                    </div>
                    <h3 className="text-xl font-medium mb-3">No file selected</h3>
                    <p className="text-muted-foreground mb-6">
                      Select a file from the file tree or create a new one to start coding in this project
                    </p>
                    <div className="flex justify-center gap-3">
                      <Button
                        onClick={() => handleShowNewFileDialog("")}
                        className="bg-primary/90 hover:bg-primary transition-colors"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        New File
                      </Button>
                      <Button variant="outline" onClick={() => handleShowNewFolderDialog("")}>
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
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Create New Thread</DialogTitle>
            <DialogDescription>Enter a title for your new thread.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Thread title"
            value={newThreadTitle}
            onChange={(e) => setNewThreadTitle(e.target.value)}
            autoFocus
            className="mt-2"
          />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowNewThreadDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateThread} disabled={!newThreadTitle.trim()}>
              Create Thread
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New File Dialog */}
      <Dialog open={showNewFileDialog} onOpenChange={setShowNewFileDialog}>
        <DialogContent className="sm:max-w-[450px]">
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
            className="mt-2"
          />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowNewFileDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFile} disabled={!newFileName.trim()}>
              Create File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent className="sm:max-w-[450px]">
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
            className="mt-2"
          />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
            <DialogDescription>Enter a new name for this file</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="New name"
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            autoFocus
            className="mt-2"
          />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameFile} disabled={!newPath.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold">{activeFilePath}</span>? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteFile}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={showVersionsDialog} onOpenChange={setShowVersionsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
            <DialogDescription>Select a version to view or restore</DialogDescription>
          </DialogHeader>

          {isLoadingVersions ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : fileVersions.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No version history available for this file</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] border rounded-md">
              <div className="space-y-0.5 p-1">
                {fileVersions.map((version) => (
                  <div
                    key={version.id}
                    className="flex items-center justify-between p-3 rounded-md hover:bg-accent/70 group transition-colors"
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
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Undo2 className="h-3.5 w-3.5 mr-2" />
                        Restore
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
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
            <Button variant="outline" onClick={() => setShowVersionsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

