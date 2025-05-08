"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Clock,
  FolderRoot,
  Search,
  Star,
  StarOff,
  Users,
  FileCode,
  MessageSquare,
  Plus,
  ArrowUpRight,
  Loader2,
  Filter,
  SortAsc,
  FolderPlus,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface Project {
  id: string
  name: string
  description?: string
  updatedAt: string
  createdAt: string
  _count?: {
    threads?: number
    files?: number
  }
  starred?: boolean
  collaborators?: number
  lastActive?: string
  thumbnail?: string
}

interface ProjectGridProps {
  projects: Project[]
  isLoading?: boolean
  onProjectSelect: (projectId: string) => void
  onCreateProject?: () => void
  onToggleStar?: (projectId: string, starred: boolean) => void
}

export function ProjectGrid({
  projects,
  isLoading = false,
  onProjectSelect,
  onCreateProject,
  onToggleStar,
}: ProjectGridProps) {
  const [filter, setFilter] = React.useState<"all" | "recent" | "starred">("all")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [sortBy, setSortBy] = React.useState<"updated" | "name" | "created">("updated")
  const [isLoadingProject, setIsLoadingProject] = React.useState<string | null>(null)
  const [showDialog, setShowDialog] = React.useState(false)

  // Filter and sort projects
  const filteredProjects = React.useMemo(() => {
    let result = [...projects]

    // Apply filter
    if (filter === "starred") {
      result = result.filter((p) => p.starred)
    } else if (filter === "recent") {
      // Get projects updated in the last 7 days
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      result = result.filter((p) => new Date(p.updatedAt) >= sevenDaysAgo)
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (p) => p.name.toLowerCase().includes(query) || (p.description && p.description.toLowerCase().includes(query)),
      )
    }

    // Apply sort
    result.sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name)
      } else if (sortBy === "created") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      } else {
        // default: updated
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      }
    })

    return result
  }, [projects, filter, searchQuery, sortBy])

  const handleProjectClick = (projectId: string) => {
    setIsLoadingProject(projectId)
    // Simulate loading time
    setTimeout(() => {
      onProjectSelect(projectId)
      setIsLoadingProject(null)
    }, 800)
  }

  const handleCreateProject = () => {
    // If parent provided a create function, use it
    if (typeof onCreateProject === 'function') {
      onCreateProject()
    } else {
      // Otherwise show our local dialog
      setShowDialog(true)
    }
  }

  // Simple placeholder loading projects
  const loadingPlaceholders = Array(6)
    .fill(0)
    .map((_, i) => (
      <Card
        key={`placeholder-${i}`}
        className="overflow-hidden border"
      >
        <CardContent className="p-6 flex flex-col gap-4 h-full">
          <div className="flex items-center justify-between">
            <div className="h-6 w-1/2 bg-muted/40 animate-pulse rounded-md"></div>
            <div className="w-6 h-6 rounded-full bg-muted/40 animate-pulse"></div>
          </div>
          <div className="space-y-2 mt-1">
            <div className="h-4 w-full bg-muted/40 animate-pulse rounded-md"></div>
            <div className="h-4 w-3/4 bg-muted/40 animate-pulse rounded-md"></div>
          </div>
          <div className="mt-auto pt-4 flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="h-5 w-20 bg-muted/40 animate-pulse rounded-md"></div>
              <div className="h-5 w-20 bg-muted/40 animate-pulse rounded-md"></div>
            </div>
            <div className="h-4 w-28 bg-muted/40 animate-pulse rounded-md"></div>
          </div>
        </CardContent>
      </Card>
    ))

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
        <div className="flex flex-col gap-4 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Projects</h1>
            <Button
              onClick={handleCreateProject}
              className="gap-2 rounded-xl bg-primary hover:bg-primary/90 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 px-5 py-2.5 h-auto"
            >
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <Tabs
              value={filter}
              onValueChange={(v) => setFilter(v as any)}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid w-full sm:w-auto grid-cols-3 bg-muted/5 p-1 rounded-lg border">
                <TabsTrigger
                  value="all"
                  className="px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md transition-all duration-200"
                >
                  All
                </TabsTrigger>
                <TabsTrigger
                  value="recent"
                  className="px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md transition-all duration-200"
                >
                  Recent
                </TabsTrigger>
                <TabsTrigger
                  value="starred"
                  className="px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md transition-all duration-200"
                >
                  Starred
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full border rounded-md focus-visible:ring-1 focus-visible:ring-primary"
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-md border"
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-md border shadow-md">
                  <DropdownMenuItem
                    onClick={() => setSortBy("updated")}
                  >
                    <SortAsc className="mr-2 h-4 w-4" />
                    <span>Sort by Last Updated</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSortBy("name")}
                  >
                    <SortAsc className="mr-2 h-4 w-4" />
                    <span>Sort by Name</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSortBy("created")}
                  >
                    <SortAsc className="mr-2 h-4 w-4" />
                    <span>Sort by Created Date</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="max-w-7xl mx-auto p-4">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {loadingPlaceholders}
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-6">
                  <div className="w-20 h-20 rounded-md bg-muted/50 flex items-center justify-center">
                    <FolderRoot className="h-10 w-10 text-muted-foreground" />
                  </div>
                </div>
                <h3 className="text-2xl font-medium mb-3">No projects found</h3>
                <p className="text-muted-foreground max-w-md mb-6">
                  {searchQuery
                    ? `No projects matching "${searchQuery}"`
                    : filter === "starred"
                      ? "You haven't starred any projects yet"
                      : filter === "recent"
                        ? "No recent projects found"
                        : "Create your first project to get started"}
                </p>
                <Button
                  onClick={handleCreateProject}
                  className="gap-2"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Create Project
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredProjects.map((project) => (
                  <Card
                    key={project.id}
                    className={cn(
                      "h-full overflow-hidden border group cursor-pointer transition-all duration-200",
                      "hover:shadow hover:border-primary/20 hover:-translate-y-0.5",
                      isLoadingProject === project.id && "pointer-events-none opacity-80"
                    )}
                    onClick={() => handleProjectClick(project.id)}
                  >
                    <CardContent className="p-6 flex flex-col gap-4 h-full relative">
                      {isLoadingProject === project.id && (
                        <div className="absolute inset-0 bg-background/80 z-10 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="truncate">
                          <div className="font-medium text-xl truncate overflow-hidden">{project.name}</div>
                        </div>

                        {onToggleStar && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onToggleStar(project.id, !project.starred)
                            }}
                            className="text-muted-foreground hover:text-amber-400 transition-colors focus:outline-none flex-shrink-0 ml-2 p-1.5 rounded-full hover:bg-amber-500/10"
                          >
                            {project.starred ? (
                              <Star className="h-5 w-5 fill-amber-400 text-amber-400 drop-shadow-sm animate-pulse-soft" />
                            ) : (
                              <StarOff className="h-5 w-5" />
                            )}
                          </button>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem] break-words">
                        {project.description ?? "No description provided for this project"}
                      </p>

                      <div className="mt-auto pt-4 flex flex-col gap-3">
                        <div className="flex flex-wrap gap-2">
                          <div className="rounded-md px-2 py-0.5 text-xs bg-muted/50 text-muted-foreground flex items-center gap-1.5">
                            <MessageSquare className="h-3 w-3" />
                            {project._count?.threads ?? 0} threads
                          </div>
                          <div className="rounded-md px-2 py-0.5 text-xs bg-muted/50 text-muted-foreground flex items-center gap-1.5">
                            <FileCode className="h-3 w-3" />
                            {project._count?.files ?? 0} files
                          </div>
                          {project.collaborators && project.collaborators > 0 && (
                            <div className="rounded-md px-2 py-0.5 text-xs bg-muted/50 text-muted-foreground flex items-center gap-1.5">
                              <Users className="h-3 w-3" />
                              {project.collaborators} collaborator{project.collaborators > 1 ? "s" : ""}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          Updated {new Date(project.updatedAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div
                        className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-all duration-200"
                      >
                        <Button size="sm" className="rounded-md h-8 w-8 p-0">
                          <ArrowUpRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Card
                  className="h-full overflow-hidden border-dashed border cursor-pointer transition-all hover:shadow group hover:-translate-y-0.5"
                  onClick={handleCreateProject}
                >
                  <div className="flex items-center justify-center h-full p-8">
                    <div className="text-center">
                      <div className="mb-4">
                        <div className="bg-muted/50 h-16 w-16 rounded-md flex items-center justify-center mx-auto">
                          <Plus className="h-8 w-8 text-muted-foreground" />
                        </div>
                      </div>
                      <h3 className="text-xl font-medium mb-2">Create New Project</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Start a new AI-assisted project
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-all duration-200"
                      >
                        Get started
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
      
      {/* Custom dialog that doesn't use the useProject hook */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Please use the sidebar</DialogTitle>
            <DialogDescription>
              The project creation feature is available through the sidebar interface.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-4 py-4">
            <div className="flex items-center gap-4">
              <div className="bg-blue-500/10 p-3 rounded-md">
                <FolderPlus className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h4 className="text-sm font-medium">Create from sidebar</h4>
                <p className="text-sm text-muted-foreground">
                  Click the folder plus icon in the sidebar to create a new project.
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setShowDialog(false)}>
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

