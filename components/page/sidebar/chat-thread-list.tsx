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
import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useRouter } from "next/navigation"
import { useDebouncedCallback } from "use-debounce"

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
  projects?: Project[]
  onViewProjects?: () => void
  onProjectSelect?: (projectId: string) => void
  onNewProject?: () => void
  onViewAgents?: () => void
}

// Memoized thread item component to prevent re-renders of all threads
const ThreadItem = memo(({
  thread,
  currentThreadId,
  collapsed,
  editingThreadId,
  editingTitle,
  inputRef,
  formatThreadDate,
  onThreadSelect,
  startRenaming,
  saveRenaming,
  cancelRenaming,
  handleRenameKeyDown,
  setEditingTitle,
  onDuplicateThread,
  onDeleteThread
}: {
  thread: ChatThread
  currentThreadId: string | null | undefined
  collapsed: boolean
  editingThreadId: string | null
  editingTitle: string
  inputRef: React.RefObject<HTMLInputElement>
  formatThreadDate: (date: string) => string
  onThreadSelect: (threadId: string) => void
  startRenaming: (threadId: string) => void
  saveRenaming: () => void
  cancelRenaming: () => void
  handleRenameKeyDown: (e: React.KeyboardEvent) => void
  setEditingTitle: (title: string) => void
  onDuplicateThread: (threadId: string) => void
  onDeleteThread: (threadId: string) => void
}) => {
  const isEditing = editingThreadId === thread.id;

  // Memoize dropdown menu component to prevent rerenders
  const ThreadDropdownMenu = useMemo(() => {
    return (
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
    );
  }, [thread.id, startRenaming, onDuplicateThread, onDeleteThread]);

  // Memoize thread date to prevent recalculation
  const formattedDate = useMemo(() => {
    return formatThreadDate(thread.updatedAt);
  }, [thread.updatedAt, formatThreadDate]);

  // Memoize thread title
  const threadTitle = useMemo(() => thread.title ?? "New Chat", [thread.title]);

  return (
    <Tooltip>
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
            style={{ display: isEditing ? 'none' : 'block' }}
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
                      title={threadTitle}
                      >
                      {threadTitle}
                      </span>
                  </div>

                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {formattedDate}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </button>

          {/* Inline editing input */}
          {!collapsed && isEditing && (
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

          {!collapsed && !isEditing && (
            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {ThreadDropdownMenu}
            </div>
          )}
        </div>
      </TooltipTrigger>
      {collapsed && (
        <TooltipContent side="right" className="max-w-[200px]">
          <p className="font-medium">{threadTitle}</p>
          <p className="text-xs text-muted-foreground mt-1">{formattedDate}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for ThreadItem to prevent unnecessary re-renders
  return (
    prevProps.thread.id === nextProps.thread.id &&
    prevProps.thread.title === nextProps.thread.title &&
    prevProps.thread.updatedAt === nextProps.thread.updatedAt &&
    prevProps.currentThreadId === nextProps.currentThreadId &&
    prevProps.collapsed === nextProps.collapsed &&
    prevProps.editingThreadId === nextProps.editingThreadId &&
    (prevProps.editingThreadId === prevProps.thread.id ?
      prevProps.editingTitle === nextProps.editingTitle : true)
  );
});

ThreadItem.displayName = "ThreadItem";

// Memoized button component for sidebar navigation
const NavigationButton = memo(({
  icon: Icon,
  title,
  description,
  badgeText,
  badgeColor,
  colorClass,
  collapsed,
  onClick
}: {
  icon: React.ElementType,
  title: string,
  description: string,
  badgeText?: string,
  badgeColor?: string,
  colorClass: string,
  collapsed: boolean,
  onClick: () => void
}) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "w-full text-left rounded-lg transition-all duration-200 group relative",
            collapsed ? "p-2" : "p-3",
            "hover:bg-muted/80",
            "hover:shadow-sm",
          )}
          onClick={onClick}
        >
          <button className="w-full text-left">
            <div className={cn("flex items-start", collapsed ? "justify-center" : "gap-3")}>
              <div className="relative mt-0.5">
                <div
                  className={cn(
                    collapsed ? "w-10 h-10" : "w-8 h-8",
                    "rounded-lg border flex items-center justify-center transition-all",
                    `${colorClass} group-hover:scale-110`,
                  )}
                >
                  <Icon className={cn(collapsed ? "w-5 h-5" : "w-4 h-4")} />
                </div>
              </div>

              {!collapsed && (
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm">{title}</span>
                      {badgeText && (
                        <span className={cn(
                          "px-1.5 py-0.5 text-[10px] leading-none font-medium rounded-full",
                          `bg-${badgeColor}/20 text-${badgeColor}-600 border border-${badgeColor}/20`
                        )}>
                          {badgeText}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {description}
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
          <p className="font-medium">{title}</p>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
});

NavigationButton.displayName = "NavigationButton";

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
  projects: _projects,
  onViewProjects: _onViewProjects,
  onProjectSelect: _onProjectSelect,
  onNewProject: _onNewProject,
  onViewAgents: _onViewAgents,
}: ChatThreadListProps) {
  const { user, isLoading } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const isMobile = useIsMobile()
  const [mobileVisible, setMobileVisible] = useState(true)
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const threadListRef = useRef<HTMLDivElement>(null);

  // Virtual scrolling variables
  const visibleThreadsBuffer = 50; // Increased number of threads to keep in DOM
  const [visibleRange, setVisibleRange] = useState({
    start: 0,
    end: Math.min(threads.length, visibleThreadsBuffer)
  });

  // Update local search state when prop changes
  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  // Debounced search handler to prevent excessive API calls
  const debouncedSearch = useDebouncedCallback((value: string) => {
    if (onSearchChange) {
      onSearchChange(value);
    }
  }, 300);

  // Handle search input change
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSearchQuery(value);
    debouncedSearch(value);
  }, [debouncedSearch]);

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

  const formatThreadDate = useCallback((date: string) => {
    const threadDate = new Date(date)
    if (isToday(threadDate)) {
      return format(threadDate, "HH:mm")
    } else if (isYesterday(threadDate)) {
      return "Yesterday"
    } else {
      return format(threadDate, "MMM d")
    }
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const scrollPosition = target.scrollTop;
    const viewportHeight = target.clientHeight;
    const scrollHeight = target.scrollHeight;

    // Only use virtual scrolling for large thread lists
    if (threads.length > 150) {
      // Calculate which threads should be visible
      const itemHeight = 60; // Approximate height per item
      const startIndex = Math.max(0, Math.floor(scrollPosition / itemHeight) - 5);
      const endIndex = Math.min(
        threads.length,
        Math.ceil((scrollPosition + viewportHeight) / itemHeight) + 5
      );

      // Update visible range
      setVisibleRange({
        start: startIndex,
        end: Math.min(endIndex, startIndex + visibleThreadsBuffer)
      });
    }

    // Check if we need to load more threads
    if (onLoadMore && hasMore) {
      // Consider we're near bottom when within 200px of the bottom
      const isNearBottom = scrollHeight - scrollPosition - viewportHeight < 200;

      // Also check if we're showing threads near the end of our current list
      const isShowingLastThreads = threads.length <= 150 || visibleRange.end >= threads.length - 5;

      if (isNearBottom && isShowingLastThreads) {
        console.log('Loading more threads...');
        onLoadMore();
      }
    }
  }, [threads.length, onLoadMore, hasMore, visibleRange.end, visibleThreadsBuffer]);

  const toggleSidebar = useCallback(() => {
    setCollapsed(!collapsed)
    if (isMobile) {
      setMobileVisible(!mobileVisible)
    }
  }, [collapsed, isMobile, mobileVisible]);

  const startRenaming = useCallback((threadId: string) => {
    const thread = threads.find(t => t.id === threadId);
    if (thread) {
      setEditingThreadId(threadId);
      setEditingTitle(thread.title || "");
    }
  }, [threads]);

  const cancelRenaming = useCallback(() => {
    setEditingThreadId(null);
    setEditingTitle("");
  }, []);

  const saveRenaming = useCallback(() => {
    if (editingThreadId && editingTitle.trim()) {
      onRenameThread(editingThreadId, editingTitle);
      setEditingThreadId(null);
      setEditingTitle("");
    }
  }, [editingThreadId, editingTitle, onRenameThread]);

  const handleRenameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveRenaming();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelRenaming();
    }
  }, [saveRenaming, cancelRenaming]);

  // Only render visible threads within the current range
  const visibleThreads = useMemo(() => {
    // For smaller thread counts, just show all threads without virtual scrolling
    if (threads.length <= 150) {
      return threads;
    }
    return threads.slice(visibleRange.start, visibleRange.end);
  }, [threads, visibleRange.start, visibleRange.end]);

  // Update visible range when threads change
  useEffect(() => {
    console.log(`Threads length changed: ${threads.length}`);
    setVisibleRange({
      start: 0,
      end: Math.min(threads.length, visibleThreadsBuffer)
    });
  }, [threads.length, visibleThreadsBuffer]);

  // Calculate empty space heights for virtual scrolling (only when actually using virtual scrolling)
  const isUsingVirtualScrolling = threads.length > 150;
  const topSpacerHeight = isUsingVirtualScrolling ? visibleRange.start * 58 : 0; // Approximate height per item
  const bottomSpacerHeight = isUsingVirtualScrolling ? Math.max(0, (threads.length - visibleRange.end) * 58) : 0;

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
              variant="ghost"
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
          <div className="flex gap-2 w-full">
            <Button onClick={onNewThread} className="w-full" variant="default">
              <MessageSquarePlus className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              className="pl-8 h-9"
              value={localSearchQuery}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        <ScrollArea className="flex-1" onScroll={handleScroll}>
          <div className="space-y-1 p-2" ref={threadListRef}>
            {/* Recent Chats Header */}
            {!collapsed && threads.length > 0 && (
              <div className="px-3 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">Recent Chats</h3>
                </div>
              </div>
            )}

            {/* Thread list implementation */}
            {threads.length > 0 && (
              <>
                {/* Top spacer (only used when virtual scrolling is active) */}
                {topSpacerHeight > 0 && <div style={{ height: topSpacerHeight }} />}

                {/* Visible threads */}
                <div className="space-y-1">
                  {visibleThreads.map((thread) => (
                    <ThreadItem
                      key={`thread-${thread.id}`}
                      thread={thread}
                      currentThreadId={currentThreadId}
                      collapsed={collapsed}
                      editingThreadId={editingThreadId}
                      editingTitle={editingTitle}
                      inputRef={inputRef}
                      formatThreadDate={formatThreadDate}
                      onThreadSelect={onThreadSelect}
                      startRenaming={startRenaming}
                      saveRenaming={saveRenaming}
                      cancelRenaming={cancelRenaming}
                      handleRenameKeyDown={handleRenameKeyDown}
                      setEditingTitle={setEditingTitle}
                      onDuplicateThread={onDuplicateThread}
                      onDeleteThread={onDeleteThread}
                    />
                  ))}
                </div>

                {/* Bottom spacer (only used when virtual scrolling is active) */}
                {bottomSpacerHeight > 0 && <div style={{ height: bottomSpacerHeight }} />}
              </>
            )}

            {hasMore && !collapsed && (
              <div className="py-3 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    console.log('Load More button clicked');
                    if (onLoadMore) onLoadMore();
                  }}
                  className="h-8 text-xs w-full bg-muted/50 hover:bg-muted border-dashed"
                >
                  Load More Chats
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  )
}

