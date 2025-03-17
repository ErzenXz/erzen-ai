"use client"

import * as React from "react"
import {
  FileIcon,
  FolderIcon,
  FolderOpenIcon,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Plus,
  Trash,
  Edit,
  Download,
  FileJson,
  FileText,
  FileCode,
  FileImage,
  FileCog,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { ProjectFile } from "@/lib/types"

interface FileTreeProps {
  files: ProjectFile[]
  activeFile?: string
  onSelectFile: (filePath: string) => void
  onCreateFile?: (parentPath: string) => void
  onCreateFolder?: (parentPath: string) => void
  onDeleteFile?: (filePath: string) => void
  onRenameFile?: (filePath: string) => void
}

interface TreeNode {
  id: string
  name: string
  path: string
  isFolder: boolean
  children: TreeNode[]
  parent: string | null
  language?: string
  content?: string
}

export function FileTree({
  files,
  activeFile,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onDeleteFile,
  onRenameFile,
}: FileTreeProps) {
  // Build tree data structure from flat files array
  const buildFileTree = React.useCallback((files: ProjectFile[]): TreeNode[] => {
    const root: TreeNode[] = []
    const nodes: Record<string, TreeNode> = {}

    // First pass: create all nodes
    files.forEach((file) => {
      const parts = file.path.split("/")
      const name = parts[parts.length - 1]
      const parentPath = parts.slice(0, parts.length - 1).join("/")

      nodes[file.path] = {
        id: file.id,
        name: name,
        path: file.path,
        isFolder: file.path.endsWith("/"),
        children: [],
        parent: parentPath || null,
        language: file.name.split(".").pop(),
        content: "",
      }
    })

    // Second pass: build the tree
    Object.values(nodes).forEach((node) => {
      if (node.parent === null) {
        root.push(node)
      } else if (nodes[node.parent]) {
        nodes[node.parent].children.push(node)
      } else {
        // If parent doesn't exist, create folders for each level
        const parts = node.parent.split("/")
        let currentPath = ""

        for (const part of parts) {
          const prevPath = currentPath
          currentPath = currentPath ? `${currentPath}/${part}` : part

          if (!nodes[currentPath]) {
            nodes[currentPath] = {
              id: currentPath,
              name: part,
              path: currentPath,
              isFolder: true,
              children: [],
              parent: prevPath || null,
            }

            if (prevPath && nodes[prevPath]) {
              nodes[prevPath].children.push(nodes[currentPath])
            } else if (!prevPath) {
              root.push(nodes[currentPath])
            }
          }
        }

        nodes[node.parent].children.push(node)
      }
    })

    // Sort: folders first, then files alphabetically
    const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
      return nodes
        .sort((a, b) => {
          if (a.isFolder && !b.isFolder) return -1
          if (!a.isFolder && b.isFolder) return 1
          return a.name.localeCompare(b.name)
        })
        .map((node) => {
          if (node.children.length) {
            node.children = sortNodes(node.children)
          }
          return node
        })
    }

    return sortNodes(root)
  }, [])

  const treeData = React.useMemo(() => buildFileTree(files), [files, buildFileTree])

  const [expandedFolders, setExpandedFolders] = React.useState<Set<string>>(new Set())
  const [autoExpandedPaths, setAutoExpandedPaths] = React.useState<Set<string>>(new Set())

  // Auto-expand parent folders of active file
  React.useEffect(() => {
    if (activeFile && !autoExpandedPaths.has(activeFile)) {
      const parts = activeFile.split("/")
      const toExpand = new Set<string>(expandedFolders)

      // Build parent paths and add them to expanded set
      let currentPath = ""
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i]
        toExpand.add(currentPath)
      }

      if (toExpand.size !== expandedFolders.size) {
        setExpandedFolders(toExpand)
      }

      // Track that we've auto-expanded for this path
      setAutoExpandedPaths((prev) => new Set(prev).add(activeFile))
    }
  }, [activeFile, expandedFolders, autoExpandedPaths])

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(path)) {
        newSet.delete(path)
      } else {
        newSet.add(path)
      }
      return newSet
    })
  }

  const getFileIcon = (file: TreeNode) => {
    if (file.isFolder) {
      return expandedFolders.has(file.path) ? (
        <FolderOpenIcon className="h-4 w-4 text-yellow-400" />
      ) : (
        <FolderIcon className="h-4 w-4 text-yellow-400" />
      )
    }

    // Get file extension
    const ext = file.name.split(".").pop()?.toLowerCase()

    switch (ext) {
      case "json":
      return <FileJson className="h-4 w-4 text-orange-400" />
      case "md":
      case "txt":
      return <FileText className="h-4 w-4 text-blue-300" />
      case "js":
      case "jsx":
      case "ts":
      case "tsx":
      return <FileCode className="h-4 w-4 text-blue-500" />
      case "html":
      case "htm":
      return <FileCode className="h-4 w-4 text-red-500" />
      case "css":
      case "scss":
      case "sass":
      return <FileCog className="h-4 w-4 text-purple-400" />
      case "png":
      case "jpg":
      case "jpeg":
      case "gif":
      case "webp":
      case "svg":
      return <FileImage className="h-4 w-4 text-green-400" />
      case "pdf":
      return <FileText className="h-4 w-4 text-red-400" />
      case "py":
      return <FileCode className="h-4 w-4 text-yellow-600" />
      case "rb":
      return <FileCode className="h-4 w-4 text-red-600" />
      case "php":
      return <FileCode className="h-4 w-4 text-purple-600" />
      case "go":
      return <FileCode className="h-4 w-4 text-cyan-500" />
      case "yaml":
      case "yml":
      return <FileCog className="h-4 w-4 text-green-600" />
      case "sh":
      case "bash":
      return <FileText className="h-4 w-4 text-green-500" />
      default:
      return <FileIcon className="h-4 w-4 text-blue-400" />
    }
  }

  const renderTree = (nodes: TreeNode[], level = 0) => {
    return nodes.map((node) => (
      <React.Fragment key={node.path}>
        <div
          className={cn(
            "flex items-center py-1.5 px-2 hover:bg-accent/40 rounded-sm group transition-colors",
            activeFile === node.path && "bg-primary/10 text-primary font-medium",
            !node.isFolder && "cursor-pointer",
          )}
          style={{ paddingLeft: `${level * 12 + 4}px` }}
        >
          <button
            className={cn("mr-1 w-4 h-4 flex items-center justify-center", node.isFolder ? "visible" : "invisible")}
            onClick={() => node.isFolder && toggleFolder(node.path)}
          >
            {node.isFolder &&
              (expandedFolders.has(node.path) ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              ))}
          </button>

          <div
            className="flex items-center gap-2 flex-1 min-w-0"
            onClick={() => !node.isFolder && onSelectFile(node.path)}
          >
            {getFileIcon(node)}
            <span className="truncate text-sm">{node.name}</span>
          </div>

          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
            {node.isFolder ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onCreateFile?.(node.path)}>
                    <FileIcon className="mr-2 h-4 w-4" />
                    <span>New File</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onCreateFolder?.(node.path)}>
                    <FolderIcon className="mr-2 h-4 w-4" />
                    <span>New Folder</span>
                  </DropdownMenuItem>
                  {node.path !== "" && (
                    <>
                      <DropdownMenuItem onClick={() => onRenameFile?.(node.path)}>
                        <Edit className="mr-2 h-4 w-4" />
                        <span>Rename</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDeleteFile?.(node.path)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onRenameFile?.(node.path)}>
                    <Edit className="mr-2 h-4 w-4" />
                    <span>Rename</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download className="mr-2 h-4 w-4" />
                    <span>Download</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDeleteFile?.(node.path)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        {node.isFolder &&
          expandedFolders.has(node.path) &&
          node.children.length > 0 &&
          renderTree(node.children, level + 1)}
      </React.Fragment>
    ))
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between p-2 border-b bg-muted/30">
        <h3 className="text-sm font-semibold">Files</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onCreateFile?.("")}>
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add File</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {treeData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <FileIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium mb-2">No files yet</p>
              <p className="text-xs text-muted-foreground mb-6 max-w-[200px]">Create your first file to start coding</p>
              <Button onClick={() => onCreateFile?.("")}>
                <Plus className="h-4 w-4 mr-2" />
                Create File
              </Button>
            </div>
          ) : (
            renderTree(treeData)
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

