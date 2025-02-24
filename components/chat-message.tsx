'use client';

import { Message } from '@/lib/types';
import { User, Bot } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <div className={cn(
      'flex gap-4 p-4',
      message.role === 'user' ? 'bg-background' : 'bg-transparent'
    )}>
      <div className="flex-shrink-0">
        {message.role === 'user' ? (
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <User className="w-5 h-5 text-primary-foreground" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <Bot className="w-5 h-5 text-secondary-foreground" />
          </div>
        )}
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {message.role === 'user' ? 'You' : 'Assistant'}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.timestamp), 'HH:mm')}
          </span>
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-line">
          {message.content ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content.trim()}
            </ReactMarkdown>
          ) : (
            <div className="animate-pulse">
              <span className="inline-block w-4 h-4 bg-muted-foreground rounded-full" />
              <span className="inline-block w-4 h-4 bg-muted-foreground rounded-full mx-1" />
              <span className="inline-block w-4 h-4 bg-muted-foreground rounded-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}