import React, { useState } from 'react';
import { useQuery, usePaginatedQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { MessageBubble } from './MessageBubble';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Share2, Clock, MessageSquare, Eye, ChevronDown, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SharedConversationProps {
  shareId: string;
}

export const SharedConversation: React.FC<SharedConversationProps> = ({ shareId }) => {

  // Get shared conversation details
  const conversation = useQuery(api.conversations.getSharedConversation, { shareId });
  
  // Get shared messages with pagination, but only if the conversation query was successful
  const {
    results: messages,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.conversations.getSharedMessages,
    conversation ? { shareId } : "skip", // Skip query if conversation is null/undefined
    { initialNumItems: 50 }
  );

  if (conversation === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (conversation === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-destructive">
              <Share2 size={24} />
              Conversation Not Found
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              This shared link is invalid or the conversation has been unshared.
            </p>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="w-full"
            >
              <ExternalLink size={16} className="mr-2" />
              Go to ErzenAI
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Share2 size={20} className="text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">{conversation.title}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    Shared on {formatDate(conversation.sharedAt || conversation.lastMessageAt)}
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare size={14} />
                    {messages.length} messages
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye size={14} />
                    Read-only
                  </div>
                </div>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/'}
            >
              <ExternalLink size={16} className="mr-2" />
              Try ErzenAI
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Card className="min-h-[600px]">
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-4 p-6">
                {messages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No messages in this conversation</p>
                  </div>
                ) : (
                  messages.map((message) => (
                                         <MessageBubble
                       key={message._id}
                       message={{
                         ...message,
                         conversationId: conversation._id,
                         branchId: "main",
                         parentMessageId: undefined,
                         isEdited: false,
                         editedAt: undefined,
                         isError: false,
                         toolCallId: undefined,
                       }}
                       messagePosition={0}
                       currentBranchId="main"
                       isSharedView={true}
                     />
                  ))
                )}

                {/* Load More Button */}
                {status === "CanLoadMore" && (
                  <div className="text-center pt-4">
                    <Button
                      variant="outline"
                      onClick={() => loadMore(25)}
                      className="w-full max-w-xs"
                    >
                      <ChevronDown size={16} className="mr-2" />
                      Load More Messages
                    </Button>
                  </div>
                )}

                {/* Footer info */}
                <div className="pt-8 border-t border-border/50">
                  <div className="text-center text-sm text-muted-foreground space-y-2">
                    <p>
                      This is a shared conversation from ErzenAI - an AI assistant platform.
                    </p>
                    <p>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => window.location.href = '/'}
                        className="p-0 h-auto text-sm text-primary"
                      >
                        Start your own conversation →
                      </Button>
                    </p>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 