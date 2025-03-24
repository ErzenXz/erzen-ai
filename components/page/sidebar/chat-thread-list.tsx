"use client"

import type React from "react"
import type { ChatThread, Project } from "@/lib/types"
import {
  MessageSquarePlus,
  MessageSquare,
  MoreVertical,
  Search,
  User,
  Clock,
  ChevronLeft,
  ChevronRight,
  Menu,
  Check,
  X,
  FolderPlus,
  FolderRoot,
  ChevronDown,
  Bot,
} from "lucide-react"
import { format, isToday, isYesterday } from "date-fns"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { Skeleton } from "@/components/ui/skeleton"
import { SettingsDialog } from "@/components/page/sidebar/settings-dialog"
import { ThemeToggle } from "@/components/theme-toggle"
import { useState, useEffect, useRef } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useRouter } from "next/navigation"

interface ChatThreadListProps {
  threads: ChatThread[]
  currentThreadId: string | null | undefined
  onThreadSelect: (threadId: string) => void
  onNewThread: () => void
  onRenameThread: (threadId: string, newTitle: string) => void
  onDuplicateThread: (threadId: string) => void
  onDeleteThread: (threadId: string) => void
  onLoadMore?: () => void
  hasMore?: boolean
  searchQuery?: string
  onSearchChange?: (query: string) => void
  projects: Project[]
  onViewProjects?: () => void
  onProjectSelect?: (projectId: string) => void
  onNewProject?: () => void
  onViewAgents?: () => void
}

export function ChatThreadList({
  threads,
  currentThreadId,
  onThreadSelect,
  onNewThread,
  onRenameThread,
  onDuplicateThread,
  onDeleteThread,
  onLoadMore,
  hasMore,
  searchQuery = "",
  onSearchChange,
  projects,
  onViewProjects,
  onProjectSelect,
  onNewProject,
  onViewAgents,
}: ChatThreadListProps) {
  const { user, isLoading } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const isMobile = useIsMobile()
  const [mobileVisible, setMobileVisible] = useState(true)
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  
  // Focus the input when editing starts
  useEffect(() => {
    if (editingThreadId && inputRef.current) {
      inputRef.current.focus();
      // Select all text for easier editing
      inputRef.current.select();
    }
  }, [editingThreadId]);

  // On mobile, sidebar should be collapsed by default
  useEffect(() => {
    if (isMobile) {
      setCollapsed(true)
      setMobileVisible(false)
    } else {
      setMobileVisible(true)
    }
  }, [isMobile])

  const formatThreadDate = (date: string) => {
    const threadDate = new Date(date)
    if (isToday(threadDate)) {
      return format(threadDate, "HH:mm")
    } else if (isYesterday(threadDate)) {
      return "Yesterday"
    } else {
      return format(threadDate, "MMM d")
    }
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!onLoadMore || !hasMore) return
    const target = e.target as HTMLDivElement
    const bottom = target.scrollHeight - target.scrollTop === target.clientHeight
    if (bottom) {
      onLoadMore()
    }
  }

  const toggleSidebar = () => {
    setCollapsed(!collapsed)
    if (isMobile) {
      setMobileVisible(!mobileVisible)
    }
  }

  const startRenaming = (threadId: string) => {
    const thread = threads.find(t => t.id === threadId);
    if (thread) {
      setEditingThreadId(threadId);
      setEditingTitle(thread.title || "");
    }
  };

  const cancelRenaming = () => {
    setEditingThreadId(null);
    setEditingTitle("");
  };

  const saveRenaming = () => {
    if (editingThreadId && editingTitle.trim()) {
      onRenameThread(editingThreadId, editingTitle);
      setEditingThreadId(null);
      setEditingTitle("");
    }
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveRenaming();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelRenaming();
    }
  };

  if (isMobile && !mobileVisible) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 bg-background/80 backdrop-blur-sm shadow-sm border"
        onClick={toggleSidebar}
      >
        <Menu className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "border-r flex flex-col h-full transition-all duration-300 ease-in-out relative",
          collapsed ? "w-[72px] bg-muted/30" : "w-72",
          isMobile && "absolute z-40 shadow-xl",
        )}
      >
        {/* Mobile close button */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 z-50 h-8 w-8 md:hidden"
            onClick={toggleSidebar}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}

        {/* Desktop toggle button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className={cn(
                "absolute -right-3 top-1/2 transform -translate-y-1/2 z-10 h-6 w-6 rounded-full border shadow-md hidden md:flex",
                "bg-primary/10 hover:bg-primary/20 text-primary",
              )}
              onClick={toggleSidebar}
            >
              {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{collapsed ? "Expand sidebar" : "Collapse sidebar"}</TooltipContent>
        </Tooltip>

        <div
          className={cn(
            "p-4 border-b transition-all duration-300",
            collapsed ? "flex justify-center items-center" : "",
            collapsed ? "h-[72px]" : "h-auto",
          )}
        >
          {isLoading ? (
            collapsed ? (
              <Skeleton className="h-10 w-10 rounded-full" />
            ) : (
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            )
          ) : user ? (
            collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={toggleSidebar} className="rounded-full p-1 transition-all hover:bg-muted">
                    <Avatar className="h-10 w-10 border-2 border-primary/10">
                      {user.image ? (
                        <AvatarImage src={user.image} alt={user.name} />
                      ) : (
                        <AvatarFallback className="bg-primary/5 text-primary">
                          <User className="w-4 h-4" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{user.name || user.email || "Your profile"}</TooltipContent>
              </Tooltip>
            ) : (
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-primary/10">
                  {user.image ? (
                    <AvatarImage src={user.image} alt={user.name} />
                  ) : (
                    <AvatarFallback className="bg-primary/5 text-primary">
                      <User className="w-4 h-4" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <div className="flex gap-1">
                  <ThemeToggle />
                  <SettingsDialog />
                </div>
              </div>
            )
          ) : (
            <div
              className={cn(
                collapsed ? "flex items-center justify-center h-10" : "flex items-center justify-center h-[68px]",
              )}
            >
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger>
                    <User className="w-5 h-5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent side="right">Not signed in</TooltipContent>
                </Tooltip>
              ) : (
                <p className="text-sm text-muted-foreground">Not signed in</p>
              )}
            </div>
          )}
        </div>

        <div className={cn("p-4 space-y-4", collapsed ? "px-2" : "")}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onNewThread}
                  className="w-full h-10 bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
                  variant="outline"
                >
                  <MessageSquarePlus className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">New Chat</TooltipContent>
            </Tooltip>
          ) : (
            <>
                <div className="flex gap-2 w-full">
                <Button onClick={onNewThread} className="flex-[2]" variant="default">
                  <MessageSquarePlus className="w-4 h-4 mr-2" />
                  New Chat
                </Button>
                <Button onClick={() => onNewProject?.()} className="flex-[1]" variant="outline">
                  <FolderPlus className="w-4 h-4" />
                </Button>
                </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search chats..."
                  className="pl-8 h-9"
                  value={searchQuery}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <ScrollArea className="flex-1" onScroll={handleScroll}>
          <div className="space-y-1 p-2">
            {/* Agents Section */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "w-full text-left rounded-lg transition-all duration-200 group relative",
                    collapsed ? "p-2" : "p-3",
                    "hover:bg-muted/80",
                    "hover:shadow-sm",
                  )}
                  onClick={onViewAgents}
                >
                  <button 
                    className="w-full text-left"
                  >
                    <div className={cn("flex items-start", collapsed ? "justify-center" : "gap-3")}>
                      <div className="relative mt-0.5">
                        <div
                          className={cn(
                            collapsed ? "w-10 h-10" : "w-8 h-8",
                            "rounded-lg border flex items-center justify-center transition-all",
                            "border-purple-300/30 bg-purple-500/10 text-purple-500 group-hover:scale-110 group-hover:bg-purple-500/15",
                          )}
                        >
                          <Bot className={cn(collapsed ? "w-5 h-5" : "w-4 h-4")} />
                        </div>
                      </div>

                      {!collapsed && (
                        <div className="flex-1 min-w-0 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-sm">Agents</span> 
                              <span className="px-1.5 py-0.5 text-[10px] leading-none font-medium rounded-full bg-purple-500/20 text-purple-600 border border-purple-500/20">
                              BETA
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-xs text-muted-foreground">
                                Automate your workflows
                              </span>
                            </div>
                          </div>
                          <div className="w-5 h-5 rounded-full bg-primary/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                            <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right" className="max-w-[200px]">
                  <p className="font-medium">Agents</p>
                  <p className="text-xs text-muted-foreground mt-1">Automate your workflows</p>
                </TooltipContent>
              )}
            </Tooltip>
            
            {/* Projects Section */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "w-full text-left rounded-lg transition-all duration-200 group relative",
                    collapsed ? "p-2" : "p-3",
                    "hover:bg-muted/80",
                    "hover:shadow-sm",
                  )}
                  onClick={onViewProjects}
                >
                  <button 
                    className="w-full text-left"
                  >
                    <div className={cn("flex items-start", collapsed ? "justify-center" : "gap-3")}>
                      <div className="relative mt-0.5">
                        <div
                          className={cn(
                            collapsed ? "w-10 h-10" : "w-8 h-8",
                            "rounded-lg border flex items-center justify-center transition-all",
                            "border-blue-300/30 bg-blue-500/10 text-blue-500 group-hover:scale-110 group-hover:bg-blue-500/15",
                          )}
                        >
                          <FolderRoot className={cn(collapsed ? "w-5 h-5" : "w-4 h-4")} />
                        </div>
                      </div>

                      {!collapsed && (
                        <div className="flex-1 min-w-0 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-sm">Projects</span> 
                              <span className="px-1.5 py-0.5 text-[10px] leading-none font-medium rounded-full bg-blue-500/20 text-blue-600 border border-blue-500/20">
                              BETA
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-xs text-muted-foreground">
                                {projects.length} {projects.length === 1 ? 'project' : 'projects'}
                              </span>
                            </div>
                          </div>
                          <div className="w-5 h-5 rounded-full bg-primary/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                            <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right" className="max-w-[200px]">
                  <p className="font-medium">Projects</p>
                  <p className="text-xs text-muted-foreground mt-1">View all projects</p>
                </TooltipContent>
              )}
            </Tooltip>
            
            {/* Recent Chats Header */}
            {!collapsed && threads.length > 0 && (
              <div className="px-3 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">Recent Chats</h3>
                </div>
              </div>
            )}
            
            {/* Thread list */}
            {threads.map((thread) => (
              <Tooltip key={thread.id}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "w-full text-left rounded-lg transition-all duration-200 group relative",
                      collapsed ? "p-2" : "p-3",
                      "hover:bg-muted/80",
                      currentThreadId === thread.id && "bg-primary/10",
                    )}
                  >
                    <button 
                      onClick={() => onThreadSelect(thread.id)}
                      className="w-full text-left"
                      style={{ display: editingThreadId === thread.id ? 'none' : 'block' }}
                    >
                      <div className={cn("flex items-start", collapsed ? "justify-center" : "gap-3")}>
                        <div className="relative mt-0.5">
                          <div
                            className={cn(
                              collapsed ? "w-10 h-10" : "w-8 h-8",
                              "rounded-lg border flex items-center justify-center transition-all",
                              currentThreadId === thread.id
                                ? "border-primary/30 bg-primary/10 text-primary"
                                : "border-muted-foreground/20 text-muted-foreground group-hover:border-primary/20 group-hover:text-foreground",
                            )}
                          >
                            <MessageSquare className={cn(collapsed ? "w-5 h-5" : "w-4 h-4")} />
                          </div>
                        </div>

                        {!collapsed && (
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                                <span
                                className={cn(
                                  "font-medium text-sm truncate max-w-[170px] block overflow-hidden text-ellipsis whitespace-nowrap",
                                  currentThreadId === thread.id && "text-primary",
                                )}
                                title={thread.title ?? "New Chat"}
                                >
                                {thread.title ?? "New Chat"}
                                </span>
                            </div>

                            <div className="flex items-center gap-1.5 mt-1">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {formatThreadDate(thread.updatedAt)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                    
                    {/* Inline editing input */}
                    {!collapsed && editingThreadId === thread.id && (
                      <div className="flex items-center gap-2">
                        <div className="relative mt-0.5">
                          <div
                            className={cn(
                              "w-8 h-8",
                              "rounded-lg border flex items-center justify-center transition-all",
                              "border-primary/30 bg-primary/10 text-primary"
                            )}
                          >
                            <MessageSquare className="w-4 h-4" />
                          </div>
                        </div>
                        
                        <div className="flex-1 flex items-center gap-1">
                          <Input
                            ref={inputRef}
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            className="h-8 py-1 text-sm font-medium"
                            onKeyDown={handleRenameKeyDown}
                          />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={saveRenaming}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={cancelRenaming}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {!collapsed && !editingThreadId && (
                      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-background/80">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => startRenaming(thread.id)}>Rename</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDuplicateThread(thread.id)}>Duplicate</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDeleteThread(thread.id)} className="text-destructive">
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right" className="max-w-[200px]">
                    <p className="font-medium">{thread.title ?? "New Chat"}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatThreadDate(thread.updatedAt)}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            ))}

            {hasMore && !collapsed && (
              <div className="py-2 text-center">
                <Button variant="ghost" size="sm" onClick={onLoadMore}>
                  Load More
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  )
}

