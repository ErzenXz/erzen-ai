'use client';

import { Message } from '@/lib/types';
import { User, Bot, Check, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { useEffect, useRef, useState } from 'react';

interface ChatMessageProps {
  message: Message;
  isLast?: boolean;
}

export function ChatMessage({ message, isLast }: ChatMessageProps) {
  const messageRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const normalizeContent = (content: string) => {
    return content
      .trim()
      .replace(/\n{2,}/g, '\n')
      .replace(/(\S)\n(\S)/g, '$1\n\n$2');
  };

  useEffect(() => {
    if (isLast && messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [isLast, message.content]);

  return (
    <div
      ref={messageRef}
      className={cn(
        'flex gap-2 p-3 relative group',
        message.role === 'user' ? 'bg-background' : 'bg-transparent'
      )}
    >
      <div className="flex-shrink-0">
        {message.role === 'user' ? (
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <User className="w-4 h-4 text-primary-foreground" />
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
            <Bot className="w-4 h-4 text-secondary-foreground" />
          </div>
        )}
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {message.role === 'user' ? 'You' : 'Assistant'}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.timestamp), 'HH:mm')}
          </span>
          <button
            onClick={() => copyToClipboard(message.content || '')}
            className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            )}
          </button>
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-full break-words whitespace-pre-line overflow-x-auto">
          {message.content ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              className="whitespace-pre-line"
              components={{
                code({ node: _node, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const code = String(children).replace(/\n$/, '');

                  return match ? (
                    <div className="relative">
                      <button
                        onClick={() => copyToClipboard(code)}
                        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                        )}
                      </button>
                      {/* @ts-ignore */}
<SyntaxHighlighter
  language={match[1]}
  style={oneDark as any}
  PreTag="div"
  customStyle={{
    margin: 0,
    padding: '1rem',
    fontSize: '0.875rem',
    borderRadius: '0.375rem',
    overflowX: 'auto'
  }}
  {...props}
>
  {code}
</SyntaxHighlighter>
                    </div>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {normalizeContent(message.content)}
            </ReactMarkdown>
          ) : (
            <div className="animate-pulse">
              <span className="inline-block w-3 h-3 bg-muted-foreground rounded-full" />
              <span className="inline-block w-3 h-3 bg-muted-foreground rounded-full mx-1" />
              <span className="inline-block w-3 h-3 bg-muted-foreground rounded-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}