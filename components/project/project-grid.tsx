"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
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
  Sparkles,
  Loader2,
  Filter,
  SortAsc,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

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

  // Generate a gradient based on project name
  const getProjectGradient = (name: string) => {
    // Simple hash function to generate consistent colors for the same name
    const hash = name.split("").reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc)
    }, 0)

    const h1 = Math.abs(hash % 360)
    const h2 = (h1 + 40) % 360
    const s = 75 + (hash % 15)
    const l = 60 + (hash % 15)

    return `linear-gradient(135deg, hsl(${h1}, ${s}%, ${l}%), hsl(${h2}, ${s}%, ${l - 10}%))`
  }

  // Placeholder loading projects
  const loadingPlaceholders = Array(6)
    .fill(0)
    .map((_, i) => (
      <Card key={`placeholder-${i}`} className="overflow-hidden border group">
        <div className="h-2 bg-muted animate-pulse"></div>
        <CardContent className="p-5 flex flex-col gap-2 h-full">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-muted animate-pulse"></div>
            <div className="space-y-2">
              <div className="h-5 w-32 bg-muted animate-pulse rounded"></div>
            </div>
          </div>
          <div className="space-y-2 mt-2">
            <div className="h-4 w-full bg-muted animate-pulse rounded"></div>
            <div className="h-4 w-3/4 bg-muted animate-pulse rounded"></div>
          </div>
          <div className="mt-auto pt-4 flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="h-5 w-16 bg-muted animate-pulse rounded-full"></div>
              <div className="h-5 w-16 bg-muted animate-pulse rounded-full"></div>
            </div>
            <div className="h-4 w-28 bg-muted animate-pulse rounded"></div>
          </div>
        </CardContent>
      </Card>
    ))

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-muted/10">
        <div className="flex flex-col gap-4 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Projects</h1>
            <Button onClick={onCreateProject} className="gap-2">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full sm:w-auto">
              <TabsList className="grid w-full sm:w-auto grid-cols-3">
                <TabsTrigger value="all" className="px-4">
                  All
                </TabsTrigger>
                <TabsTrigger value="recent" className="px-4">
                  Recent
                </TabsTrigger>
                <TabsTrigger value="starred" className="px-4">
                  Starred
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full"
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSortBy("updated")}>
                    <SortAsc className="mr-2 h-4 w-4" />
                    <span>Sort by Last Updated</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("name")}>
                    <SortAsc className="mr-2 h-4 w-4" />
                    <span>Sort by Name</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("created")}>
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
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
                >
                  {loadingPlaceholders}
                </motion.div>
              ) : filteredProjects.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="flex flex-col items-center justify-center py-16 text-center"
                >
                  <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <FolderRoot className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-medium mb-2">No projects found</h3>
                  <p className="text-muted-foreground max-w-md mb-6">
                    {searchQuery
                      ? `No projects matching "${searchQuery}"`
                      : filter === "starred"
                        ? "You haven't starred any projects yet"
                        : filter === "recent"
                          ? "No recent projects found"
                          : "Create your first project to get started"}
                  </p>
                  <Button onClick={onCreateProject}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Project
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
                >
                  {filteredProjects.map((project, index) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ 
                        opacity: 1, 
                        y: 0,
                        transition: { delay: index * 0.05 } 
                      }}
                    >
                      <Card 
                        className={cn(
                          "h-full overflow-hidden border group cursor-pointer transition-all duration-200",
                          "hover:shadow-md hover:border-primary/10 hover:bg-accent/30",
                          "dark:hover:shadow-none dark:hover:bg-accent/10",
                          isLoadingProject === project.id && "pointer-events-none opacity-80"
                        )}
                        onClick={() => handleProjectClick(project.id)}
                      >
                        <div 
                          className="h-1.5 w-full bg-primary/10"
                          style={{ 
                            background: project.thumbnail 
                              ? `url(${project.thumbnail})` 
                              : getProjectGradient(project.name)
                          }}
                        />
                        <CardContent className="p-5 flex flex-col gap-2 h-full relative">
                          {isLoadingProject === project.id && (
                            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
                              <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-12 h-12 rounded-lg flex items-center justify-center"
                                style={{ 
                                  background: getProjectGradient(project.name),
                                  boxShadow: "0 4px 12px -2px rgba(0,0,0,0.1)"
                                }}
                              >
                                <FolderRoot className="text-white w-6 h-6 drop-shadow-sm" />
                              </div>
                              <div className="font-medium text-lg truncate">{project.name}</div>
                            </div>

                            {onToggleStar && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onToggleStar(project.id, !project.starred)
                                }}
                                className="text-muted-foreground hover:text-amber-400 transition-colors focus:outline-none"
                              >
                                {project.starred ? (
                                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                                ) : (
                                  <StarOff className="h-5 w-5" />
                                )}
                              </button>
                            )}
                          </div>

                          <p className="text-sm text-muted-foreground line-clamp-2 mt-2 min-h-[2.5rem]">
                            {project.description || "No description provided for this project"}
                          </p>

                          <div className="mt-auto pt-4 flex flex-col gap-3">
                            <div className="flex flex-wrap gap-2">
                              <div className="rounded-full px-2.5 py-0.5 text-xs bg-primary/10 text-primary flex items-center gap-1.5">
                                <MessageSquare className="h-3 w-3" />
                                {project._count?.threads ?? 0} threads
                              </div>
                              <div className="rounded-full px-2.5 py-0.5 text-xs bg-muted flex items-center gap-1.5">
                                <FileCode className="h-3 w-3" />
                                {project._count?.files ?? 0} files
                              </div>
                              {project.collaborators && project.collaborators > 0 && (
                                <div className="rounded-full px-2.5 py-0.5 text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
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
                          
                          <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-60 transition-opacity duration-200">
                            <ArrowUpRight className="h-4 w-4 text-primary/70" />
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0,
                      transition: { delay: filteredProjects.length * 0.05 } 
                    }}
                  >
                    <Card
                      className="h-full overflow-hidden border-dashed border-2 hover:border-primary/20 cursor-pointer transition-all hover:shadow-sm group"
                      onClick={onCreateProject}
                    >
                      <div className="flex items-center justify-center h-full p-8">
                        <div className="text-center">
                          <div className="bg-gradient-to-br from-primary/20 to-primary/5 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Plus className="h-8 w-8 text-primary" />
                          </div>
                          <h3 className="text-lg font-medium mb-2">Create New Project</h3>
                          <p className="text-sm text-muted-foreground">
                            Start a new AI-assisted project
                          </p>
                          <div className="mt-4 opacity-0 group-hover:opacity-60 transition-opacity duration-200">
                            <div className="inline-flex items-center text-sm text-primary/80 gap-1.5">
                              <span>Get started</span>
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

