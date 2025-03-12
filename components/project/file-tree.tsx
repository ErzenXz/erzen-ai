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
        isFolder: file.isFolder,
        children: [],
        parent: parentPath || null,
        language: file.language,
        content: file.content,
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

  const renderFileIcon = (file: TreeNode) => {
    if (file.isFolder) {
      return expandedFolders.has(file.path) ? (
        <FolderOpenIcon className="h-4 w-4 text-yellow-400" />
      ) : (
        <FolderIcon className="h-4 w-4 text-yellow-400" />
      )
    }

    // Specific file type icons could be added here based on extension
    return <FileIcon className="h-4 w-4 text-blue-400" />
  }

  const renderTree = (nodes: TreeNode[], level = 0) => {
    return nodes.map((node) => (
      <React.Fragment key={node.path}>
        <div
          className={cn(
            "flex items-center py-1 px-2 hover:bg-secondary/40 rounded-sm group",
            activeFile === node.path && "bg-secondary text-secondary-foreground",
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
            {renderFileIcon(node)}
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
    <div className="flex flex-col h-full border-r">
      <div className="flex items-center justify-between p-2 border-b">
        <h3 className="text-sm font-medium">Files</h3>
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
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <FileIcon className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No files yet</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => onCreateFile?.("")}>
                <Plus className="h-4 w-4 mr-2" />
                Create First File
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

