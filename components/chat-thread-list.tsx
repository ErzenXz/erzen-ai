'use client';

import { ChatThread } from '@/lib/types';
import { MessageSquarePlus, MessageSquare, Settings, User } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { SettingsDialog } from '@/components/settings-dialog';
import { ThemeToggle } from '@/components/theme-toggle';

interface ChatThreadListProps {
  threads: ChatThread[];
  currentThreadId: string | null;
  onThreadSelect: (threadId: string) => void;
  onNewThread: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function ChatThreadList({
  threads,
  currentThreadId,
  onThreadSelect,
  onNewThread,
  onLoadMore,
  hasMore,
}: ChatThreadListProps) {
  const { user, isLoading } = useAuth();

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
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
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
      
      <div className="p-4">
        <Button
          onClick={onNewThread}
          className="w-full"
          variant="outline"
        >
          <MessageSquarePlus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>
      
      <ScrollArea className="flex-1" onScroll={handleScroll}>
        <div className="space-y-2 p-4">
          {threads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => onThreadSelect(thread.id)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg transition-colors',
                'hover:bg-muted',
                currentThreadId === thread.id && 'bg-muted'
              )}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                <span className="font-medium truncate">
                  {thread.title ?? 'New Chat'}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {format(new Date(thread.updatedAt), 'MMM d, HH:mm')}
              </div>
            </button>
          ))}
          {hasMore && (
            <div className="py-2 text-center">
              <Button variant="ghost" onClick={onLoadMore}>
                Load More
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}