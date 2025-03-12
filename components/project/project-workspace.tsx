"use client"

import * as React from "react"
import { FileTree } from "@/components/project/file-tree"
import { CodeEditor } from "@/components/project/code-editor"
import { 
  FileX, Save, Settings, UserPlus, GitBranch, MessageSquareText, 
  History, Plus, FolderPlus, Loader2, Copy, Download, 
  FileCode, Code
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
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogFooter, DialogDescription
} from "@/components/ui/dialog"
import { 
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuLabel, DropdownMenuItem, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { fetchProjectFileVersions, revertProjectFileVersion, createProjectFile, updateProjectFile } from "@/lib/api"
import { CurrentVersion } from "@/lib/types"


export function ProjectWorkspace() {
  const { currentProject, projectFiles, saveFile, loadFile } = useProject()
  const [activeFilePath, setActiveFilePath] = React.useState<string | undefined>()
  const [fileContent, setFileContent] = React.useState("")
  const [agentInstruction, setAgentInstruction] = React.useState("")
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [selectedTab, setSelectedTab] = React.useState<string>("editor")
  
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
        if (file && file.content !== undefined) {
          setFileContent(file.content)
          setOriginalContent(file.content)
          setHasUnsavedChanges(false)
        } else if (activeFilePath) {
          try {
            const loadedFile = await loadFile(activeFilePath)
            if (loadedFile) {
              setFileContent(loadedFile.content || "")
              setOriginalContent(loadedFile.content || "")
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
      return;
    }

    setIsSaving(true);
    try {
      await saveFile(activeFilePath, fileContent);
      setOriginalContent(fileContent);
      setHasUnsavedChanges(false);
      toast({
        title: "File saved",
        description: `${activeFilePath} saved successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error saving file",
        description: "Failed to save file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  const handleCreateFile = async () => {
    if (!newFileName.trim()) {
      return;
    }
    
    try {
      const path = currentParentPath 
        ? `${currentParentPath}/${newFileName}` 
        : newFileName;
      
      await createProjectFile(currentProject?.id ?? "", {
        name: newFileName,
        path,
        content: "",
        commitMsg: `Created ${newFileName}`
      });
      
      toast({
        title: "File created",
        description: `${newFileName} created successfully.`,
      });
      
      setShowNewFileDialog(false);
      setActiveFilePath(path);
    } catch (error) {
      toast({
        title: "Error creating file",
        description: "Failed to create file. Please try again.",
        variant: "destructive",
      });
    }
  };

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
      return;
    }

    try {
      const pathParts = activeFilePath.split("/")
      const oldName = pathParts.pop() ?? ""
      const parentPath = pathParts.join("/")
      
      const newFilePath = parentPath 
        ? `${parentPath}/${newPath}` 
        : newPath
      
      // Use updateProjectFile since there's no direct rename API
      await updateProjectFile(currentProject?.id ?? "", activeFilePath, {
        commitMsg: `Renamed ${oldName} to ${newPath}`
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
        commitMsg: `Deleted ${activeFilePath}`
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
      return;
    }
    
    setIsLoadingVersions(true)
    setShowVersionsDialog(true)
    
    try {
      const file = projectFiles.find(f => f.path === activeFilePath)
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
        version: parseInt(versionId),
        commitMsg: `Reverted to version ${versionId}`
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
      return;
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
  const getFileLanguage = (filePath: string = ""): string => {
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
      return;
    }
    
    try {
      const path = currentParentPath 
        ? `${currentParentPath}/${newFolderName}` 
        : newFolderName;
      
      // Create a .gitkeep file in the folder to ensure it exists
      await createProjectFile(currentProject?.id ?? "", {
        name: ".gitkeep",
        path: `${path}/.gitkeep`,
        content: "",
        commitMsg: `Created folder ${newFolderName}`
      });
      
      toast({
        title: "Folder created",
        description: `${newFolderName} created successfully.`,
      });
      
      setShowNewFolderDialog(false);
    } catch (error) {
      toast({
        title: "Error creating folder",
        description: "Failed to create folder. Please try again.",
        variant: "destructive",
      });
    }
  };

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

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between border-b p-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{currentProject.name}</h2>
          <Badge variant="outline" className="text-xs">
            {projectFiles?.length || 0} files
          </Badge>
        </div>
        <div className="flex items-center gap-1">
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

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
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

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={80}>
          <div className="flex flex-col h-full">
            {activeFilePath ? (
              <>
                <div className="flex items-center justify-between border-b p-2">
                  <div className="flex items-center gap-2 text-sm">
                    <FileCode className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{activeFilePath}</span>
                    {hasUnsavedChanges && (
                      <Badge variant="outline" className="text-xs font-normal">Unsaved</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-1">
                          <Code className="h-4 w-4" />
                          <span>Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>File Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleFileSave} disabled={!hasUnsavedChanges || isSaving}>
                          <Save className="h-4 w-4 mr-2" />
                          {isSaving ? "Saving..." : "Save"}
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
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {hasUnsavedChanges && (
                      <Button 
                        variant={hasUnsavedChanges ? "default" : "ghost"}
                        size="sm" 
                        onClick={handleFileSave}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5 mr-2" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="flex-1 overflow-hidden">
                  <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="editor">Editor</TabsTrigger>
                      <TabsTrigger value="preview">Preview</TabsTrigger>
                    </TabsList>

                    <div className="h-[calc(100%-40px)]"> {/* Adjust height to account for TabsList */}
                      <TabsContent value="editor" className="h-full mt-0">
                        <CodeEditor
                          value={fileContent}
                          language={getFileLanguage(activeFilePath)}
                          onChange={setFileContent}
                        />
                      </TabsContent>
                      <TabsContent value="preview" className="h-full mt-0">
                        <div className="h-full bg-white dark:bg-gray-900 p-4 overflow-auto">
                          <div className="rounded-md border p-4">
                            {getFileLanguage(activeFilePath) === "markdown" ? (
                              <div className="prose dark:prose-invert max-w-none">
                                <p className="text-center text-muted-foreground">
                                  Markdown preview would render here
                                </p>
                              </div>
                            ) : getFileLanguage(activeFilePath).includes("html") ? (
                              <div className="relative border rounded-md h-[calc(100vh-220px)] bg-white">
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <p className="text-center text-muted-foreground">
                                    HTML preview would render here
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-center text-muted-foreground">
                                Preview not available for this file type
                              </p>
                            )}
                          </div>
                        </div>
                      </TabsContent>
                    </div>
                  </Tabs>
                </div>
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <div className="text-center">
                  <FileX className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No file selected</h3>
                  <p className="text-muted-foreground mt-2">Select a file from the file tree or create a new one</p>
                  <div className="flex justify-center gap-2 mt-6">
                    <Button variant="outline" onClick={() => handleShowNewFileDialog("")}>
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
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <div className="border-t p-3">
        <form onSubmit={handleAgentSubmit} className="flex gap-2">
          <Input
            placeholder="Ask AI to help with your code... (e.g., 'Create a login form')"
            value={agentInstruction}
            onChange={(e) => setAgentInstruction(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={isProcessing || !agentInstruction.trim()}>
            {isProcessing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <MessageSquareText className="h-4 w-4 mr-2" />
            )}
          </Button>
        </form>
      </div>

      {/* New File Dialog */}
      <Dialog open={showNewFileDialog} onOpenChange={setShowNewFileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New File</DialogTitle>
            <DialogDescription>
              Enter a file name to create in {currentParentPath ?? "the project root"}.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="File name (e.g., app.js, index.html)"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFileDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFile} disabled={!newFileName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a folder name to create in {currentParentPath ?? "the project root"}.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Folder name (e.g., src, components)"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
            <DialogDescription>
              Enter a new name for this file.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="New name"
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            autoFocus
          />
          <DialogFooter>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {activeFilePath}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
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
            <DialogDescription>
              Select a version to view or restore.
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingVersions ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : fileVersions.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-muted-foreground">No version history available for this file.</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] border rounded-md p-2">
              <div className="space-y-1">
                {fileVersions.map((version) => (
                  <div 
                    key={version.id} 
                    className="flex items-center justify-between p-2 rounded-md hover:bg-accent"
                  >
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium">
                        {new Date(version.createdAt).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {version.authorId ? `By ${version.authorId}` : "Automatic save"}
                      </p>
                    </div>
                    <div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleRevertVersion(version.id)}
                      >
                        <History className="h-3.5 w-3.5 mr-2" />
                        Restore
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVersionsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

