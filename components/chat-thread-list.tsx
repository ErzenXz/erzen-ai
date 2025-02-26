"use client";

import type React from "react";
import type { ChatThread } from "@/lib/types";
import { MessageSquarePlus, MessageSquare, MoreVertical, Search, User, Clock } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsDialog } from "@/components/settings-dialog";
import { ThemeToggle } from "@/components/theme-toggle";

interface ChatThreadListProps {
  threads: ChatThread[];
  currentThreadId: string | null | undefined;
  onThreadSelect: (threadId: string) => void;
  onNewThread: () => void;
  onRenameThread: (threadId: string) => void;
  onDuplicateThread: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
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
}: ChatThreadListProps) {
  const { user, isLoading } = useAuth();

  const formatThreadDate = (date: string) => {
    const threadDate = new Date(date);
    if (isToday(threadDate)) {
      return format(threadDate, "HH:mm");
    } else if (isYesterday(threadDate)) {
      return "Yesterday";
    } else {
      return format(threadDate, "MMM d");
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!onLoadMore || !hasMore) return;
    const target = e.target as HTMLDivElement;
    const bottom = target.scrollHeight - target.scrollTop === target.clientHeight;
    if (bottom) {
      onLoadMore();
    }
  };

  return (
    <div className="w-64 border-r flex flex-col h-full bg-background">
      <div className="p-4 border-b">
        {isLoading ? (
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ) : user ? (
          <div className="flex items-center gap-3">
            <Avatar>
              {user.image ? (
                <AvatarImage src={user.image} alt={user.name} />
              ) : (
                <AvatarFallback>
                  <User className="w-4 h-4" />
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <ThemeToggle />
            <SettingsDialog />
          </div>
        ) : (
          <div className="flex items-center justify-center h-[68px]">
            <p className="text-sm text-muted-foreground">Not signed in</p>
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        <Button onClick={onNewThread} className="w-full" variant="outline">
          <MessageSquarePlus className="w-4 h-4 mr-2" />
          New Chat
        </Button>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            className="pl-8 h-9"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1" onScroll={handleScroll}>
        <div className="space-y-0.5 p-2">
          {threads.map((thread) => (
            <div
              key={thread.id}
              className={cn(
                "w-full text-left p-3 rounded-lg transition-all duration-200 group relative",
                "hover:bg-muted/60",
                currentThreadId === thread.id && "bg-muted"
              )}
            >
              <button onClick={() => onThreadSelect(thread.id)} className="w-full text-left">
                <div className="flex items-start gap-3">
                  <div className="relative mt-0.5">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg border flex items-center justify-center",
                        currentThreadId === thread.id
                          ? "border-primary/20 bg-primary/10"
                          : "border-muted-foreground/20"
                      )}
                    >
                      <MessageSquare
                        className={cn(
                          "w-4 h-4",
                          currentThreadId === thread.id ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">{thread.title ?? "New Chat"}</span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{formatThreadDate(thread.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              </button>

              <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-background/80">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => onRenameThread(thread.id)}>Rename</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDuplicateThread(thread.id)}>Duplicate</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDeleteThread(thread.id)} className="text-destructive">
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
          {hasMore && (
            <div className="py-2 text-center">
              <Button variant="ghost" size="sm" onClick={onLoadMore}>
                Load More
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}