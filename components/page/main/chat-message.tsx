"use client"

import type { Message } from "@/lib/types"
import { User, Bot, Check, Copy, Clock, RefreshCw, Edit, Flag, Pause, AudioLines, ChevronDown } from 'lucide-react'
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark, oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism"
import { useEffect, useRef, useState, useCallback, useMemo, memo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import dedent from "dedent"
import "katex/dist/katex.min.css"
import { FileAttachment } from "./file-attachment"
import { useThrottledCallback } from 'use-debounce';
import remarkEmoji from 'remark-emoji'
import remarkGemoji from 'remark-gemoji'
import remarkFrontmatter from 'remark-frontmatter'
import remarkDirective from 'remark-directive'

const remarkPlugins = [
  remarkGfm,
  remarkBreaks,
  remarkMath,
  remarkEmoji,
  remarkGemoji,
  remarkFrontmatter,
  remarkDirective
]

interface ChatMessageProps {
  message: Message
  isLast?: boolean
  onRegenerate?: () => void
  onEdit?: (messageId: string) => void
  onReport?: (messageId: string) => void
  onPlay?: (messageId: string) => void
}

// Customize the syntax highlighting theme
const lightTheme = {
  ...oneLight,
  'pre[class*="language-"]': {
    ...oneLight['pre[class*="language-"]'],
    background: "hsl(var(--muted))",
  },
  'code[class*="language-"]': {
    ...oneLight['code[class*="language-"]'],
    background: "hsl(var(--muted))",
  },
}

const darkTheme = {
  ...oneDark,
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    background: "hsl(var(--muted))",
  },
  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    background: "hsl(var(--muted))",
  },
}

// Improved regex to match file attachments more robustly
// This pattern matches:
// 1. Filename in parentheses: (\filename.ext)
// 2. Optional newline and dashes (varying counts of dashes accepted)
// 3. File content until a line with just dashes
const fileAttachmentRegex = /$$([^)]+)$$\n-{2,}\n([\s\S]*?)(?:\n-{2,}(?:\n|$)|$)/g;

// Memoize markdown components for better performance
const MarkdownRenderer = memo(({ 
  content, 
  isDarkTheme, 
  remarkPlugins, 
  copyToClipboard, 
  copied 
}: {
  content: string,
  isDarkTheme: boolean,
  remarkPlugins: any[],
  copyToClipboard: (text: string) => void,
  copied: boolean
}) => {
  // Normalize content outside render
  const normalizedContent = useMemo(() => {
    return dedent(content)
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\n+$/, '\n');
  }, [content]);

  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={[rehypeKatex]}
      className="whitespace-pre-wrap break-words"
      components={{
        code({ node: _node, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className ?? "")
          const code = String(children).replace(/\n$/, "")

          return match ? (
            <Card className="relative overflow-hidden my-4">
              <div className="absolute right-2 top-2 z-10">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-7 w-7 bg-background/50 backdrop-blur-sm"
                  onClick={() => copyToClipboard(code)}
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  <span className="sr-only">Copy code</span>
                </Button>
              </div>
              <div className="flex items-center gap-2 px-4 py-1.5 border-b bg-muted/50">
                <span className="text-xs font-medium text-muted-foreground">{match[1].toUpperCase()}</span>
              </div>
              {/* @ts-ignore */}
              <SyntaxHighlighter
                language={match[1]}
                style={isDarkTheme ? darkTheme : lightTheme as any}
                customStyle={{
                  margin: 0,
                  padding: "1rem",
                  fontSize: "0.875rem",
                  borderRadius: "0 0 0.5rem 0.5rem",
                  background: "transparent",
                }}
                codeTagProps={{
                  style: {
                    fontSize: "0.875rem",
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace",
                  },
                }}
                {...props}
              >
                {code}
              </SyntaxHighlighter>
            </Card>
          ) : (
            <code className={cn("bg-muted px-1.5 py-0.5 rounded-md text-sm font-mono", className)} {...props}>
              {children}
            </code>
          )
        },
      }}
    >
      {normalizedContent}
    </ReactMarkdown>
  );
});
MarkdownRenderer.displayName = "MarkdownRenderer";

// Enhanced text streaming effect component
const StreamingText = memo(({ content }: { content: string }) => {
  return (
    <div className="relative whitespace-pre-wrap break-words">
      <div className="prose prose-sm dark:prose-invert max-w-full">
        {content}
        <span className="ml-0.5 inline-block h-4 w-1.5 animate-cursor-blink bg-primary/80"></span>
      </div>
      <div className="absolute left-0 right-0 bottom-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none opacity-30"></div>
    </div>
  );
});
StreamingText.displayName = "StreamingText";

// Optimized content renderer that handles both regular and streaming content
const ContentRenderer = memo(({ 
  content, 
  isDarkTheme, 
  isStreaming,
  remarkPlugins, 
  copyToClipboard, 
  copied 
}: {
  content: string,
  isDarkTheme: boolean,
  isStreaming: boolean,
  remarkPlugins: any[],
  copyToClipboard: (text: string) => void,
  copied: boolean
}) => {
  // Process content to extract file attachments - moved useMemo BEFORE any conditional returns
  const processedContent = useMemo(() => {
    // For streaming content, render with streaming effect
    if (isStreaming) {
      return <StreamingText content={content} />;
    }
    
    // Check if content contains file attachments
    if (!content.match(fileAttachmentRegex)) {
      // If no file attachments, render as normal markdown
      return (
        <MarkdownRenderer
          content={content}
          isDarkTheme={isDarkTheme}
          remarkPlugins={remarkPlugins}
          copyToClipboard={copyToClipboard}
          copied={copied}
        />
      );
    }
    
    // Split content by file attachments
    const parts: JSX.Element[] = [];
    let lastIndex = 0;
    let match;
    
    // Reset regex index
    fileAttachmentRegex.lastIndex = 0;
    
    while ((match = fileAttachmentRegex.exec(content)) !== null) {
      // Add text before the file attachment
      if (match.index > lastIndex) {
        const textBefore = content.substring(lastIndex, match.index);
        if (textBefore.trim()) {
          parts.push(
            <MarkdownRenderer
              key={`text-${lastIndex}`}
              content={textBefore}
              isDarkTheme={isDarkTheme}
              remarkPlugins={remarkPlugins}
              copyToClipboard={copyToClipboard}
              copied={copied}
            />
          );
        }
      }
      
      // Add the file attachment
      const fileName = match[1].trim();
      let fileContent = match[2];
      
      // Format CSV content for better readability if needed
      if (fileName.toLowerCase().endsWith('.csv')) {
        if (!fileContent.includes('\t') && fileContent.includes(',')) {
          fileContent = fileContent
            .split('\n')
            .map(line => line.replace(/,/g, '\t'))
            .join('\n');
        }
      }
      
      parts.push(
        <FileAttachment key={`file-${match.index}`} name={fileName}>
          {fileContent}
        </FileAttachment>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add any remaining text after the last file attachment
    if (lastIndex < content.length) {
      const textAfter = content.substring(lastIndex);
      if (textAfter.trim()) {
        parts.push(
          <MarkdownRenderer
            key={`text-${lastIndex}`}
            content={textAfter}
            isDarkTheme={isDarkTheme}
            remarkPlugins={remarkPlugins}
            copyToClipboard={copyToClipboard}
            copied={copied}
          />
        );
      }
    }
    
    return <>{parts}</>;
  }, [content, isDarkTheme, isStreaming, remarkPlugins, copyToClipboard, copied]);
  
  return processedContent;
});
ContentRenderer.displayName = "ContentRenderer";

export function ChatMessage({ message, isLast, onRegenerate, onEdit, onReport, onPlay }: Readonly<ChatMessageProps>) {
  const messageRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const isDarkTheme = typeof document !== 'undefined' ? document.documentElement.classList.contains("dark") : false;
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const shouldAutoScrollRef = useRef(true);
  
  // Detect if content is currently streaming
  const isStreaming = useMemo(() => {
    return message.thinking || !message.content;
  }, [message.thinking, message.content]);

  // Move these functions before the useEffect
  const checkShouldAutoScroll = useCallback(() => {
    if (!messageRef.current) return;
    
    const container = messageRef.current.closest('.chat-messages-container') || messageRef.current.closest('.overflow-y-auto');
    if (!container) return;
    
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 100;
    
    // Show scroll button when we're more than 300px from bottom
    setShowScrollButton(distanceFromBottom > 300);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (!messageRef.current) return;
    
    const container = messageRef.current.closest('.chat-messages-container') || messageRef.current.closest('.overflow-y-auto');
    if (!container) return;
    
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth'
    });
    
    shouldAutoScrollRef.current = true;
    setShowScrollButton(false);
  }, []);

  // Throttled scroll handler
  const handleScroll = useThrottledCallback(checkShouldAutoScroll, 100);

  // Animation and visibility effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 50);
    
    return () => clearTimeout(timer);
  }, []);

  // Initial scroll effect
  useEffect(() => {
    if (isLast && messageRef.current) {
      setTimeout(() => {
        messageRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
      }, 100);
    }
  }, [isLast]);

  // Main scroll effect
  useEffect(() => {
    if (!messageRef.current) return;
    
    const container = messageRef.current.closest('.chat-messages-container') || messageRef.current.closest('.overflow-y-auto');
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    // Initial check
    checkShouldAutoScroll();

    const isNewMessage = message.timestamp && 
      (Date.now() - new Date(message.timestamp).getTime()) < 1000;
    
    const shouldScroll = 
      (isLast && isNewMessage) || 
      (isLast && shouldAutoScrollRef.current) ||
      (isLast && (message.thinking || message.thinkingContent));

    if (shouldScroll) {
      messageRef.current.scrollIntoView({ 
        behavior: isNewMessage ? "auto" : "smooth", 
        block: "end" 
      });
    }

    const observer = new ResizeObserver(() => {
      if (isLast && shouldAutoScrollRef.current) {
        messageRef.current?.scrollIntoView({ 
          behavior: "smooth", 
          block: "end" 
        });
      }
    });

    observer.observe(messageRef.current);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, [
    isLast, 
    message.content, 
    message.thinking, 
    message.thinkingContent, 
    message.timestamp,
    handleScroll,
    checkShouldAutoScroll
  ]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, []);

  const handleRegenerate = useCallback(() => {
    if (onRegenerate) {
      onRegenerate()
    }
  }, [onRegenerate]);

  const handleEdit = useCallback(() => {
    if (onEdit && message.id) {
      onEdit(message.id)
    }
  }, [onEdit, message.id]);

  const handleReport = useCallback(() => {
    if (onReport && message.id) {
      onReport(message.id)
    }
  }, [onReport, message.id]);

  const handlePlay = useCallback(() => {
    if (!message.content) {
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    if (!speechRef.current) {
      speechRef.current = new SpeechSynthesisUtterance(message.content);
      
      speechRef.current.onend = () => {
        setIsPlaying(false);
      };
      
      speechRef.current.onerror = () => {
        setIsPlaying(false);
      };
    }

    setIsPlaying(true);
    window.speechSynthesis.speak(speechRef.current);
    
    if (onPlay && message.id) {
      onPlay(message.id);
    }
  }, [isPlaying, message.content, message.id, onPlay]);

  // Clean up speech synthesis when component unmounts
  useEffect(() => {
    return () => {
      if (isPlaying) {
        window.speechSynthesis.cancel()
      }
    }
  }, [isPlaying])

  // Memoize the message content component to prevent unnecessary re-renders
  const messageContent = useMemo(() => {
    if (!message.content && !message.thinkingContent) {
      return (
        <div className="relative py-4 px-5 rounded-lg bg-gradient-to-br from-muted/40 to-muted/20 backdrop-blur-sm border border-primary/10 shadow-sm">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full bg-primary/40 animate-pulse"
                  style={{ animationDelay: "0ms", animationDuration: "1.2s" }}
                />
                <span
                  className="w-2.5 h-2.5 rounded-full bg-primary/40 animate-pulse"
                  style={{ animationDelay: "300ms", animationDuration: "1.2s" }}
                />
                <span
                  className="w-2.5 h-2.5 rounded-full bg-primary/40 animate-pulse"
                  style={{ animationDelay: "600ms", animationDuration: "1.2s" }}
                />
              </div>
              <span className="text-sm font-medium text-primary/90">Processing your request...</span>
            </div>
            <div className="pl-6 text-sm text-muted-foreground">
              <span className="animate-pulse inline-block">Analyzing input and generating a thoughtful response</span>
            </div>
          </div>
          <div className="absolute left-0 right-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent">
            <div className="absolute top-0 left-0 h-full w-1/3 bg-gradient-to-r from-transparent via-primary/40 to-transparent animate-slider" />
          </div>
        </div>
      );
    }

    return (
      <>
        {message.thinkingContent && (
          <div className="relative mb-3">
            <div className="bg-gradient-to-r from-muted/30 to-muted/10 backdrop-blur-sm border border-primary/10 rounded-lg p-4 transform transition-all duration-300 hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-primary/60 animate-pulse"></div>
                <span className="text-sm font-medium bg-gradient-to-r from-primary/90 to-primary/70 bg-clip-text text-transparent">
                  Thinking: <span className="text-foreground/90 ml-1">{message.thinkingContent}</span>
                </span>
              </div>
              <div className="mt-1.5 pl-6 text-sm text-muted-foreground">
                <div className="overflow-hidden">
                  <span className="inline-block relative after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gradient-to-r after:from-primary/40 after:to-transparent after:animate-expand-line">
                    
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {message.content && (
          <div className="transform transition-opacity duration-300 ease-in-out">
            <ContentRenderer 
              content={message.content} 
              isDarkTheme={isDarkTheme}
              isStreaming={isStreaming}
              remarkPlugins={remarkPlugins}
              copyToClipboard={copyToClipboard}
              copied={copied}
            />
          </div>
        )}
      </>
    );
  }, [message.content, message.thinkingContent, isDarkTheme, isStreaming, copyToClipboard, copied]);

  return (
    <TooltipProvider>
      {isLast && showScrollButton && (
        <div className="fixed bottom-24 right-8 z-50 transition-all duration-300 opacity-90 hover:opacity-100 animate-bounce-subtle">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size="icon"
                className="h-10 w-10 rounded-full shadow-lg bg-primary hover:bg-primary/90 transition-transform hover:scale-105"
                onClick={scrollToBottom}
              >
                <ChevronDown className="h-5 w-5" />
                <span className="sr-only">Scroll to bottom</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Scroll to bottom</TooltipContent>
          </Tooltip>
        </div>
      )}
      
      <div 
        ref={messageRef} 
        className={cn(
          "flex gap-4 px-2 py-6 relative group transition-all duration-300",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        )}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div className="flex-shrink-0 mt-1">
          {message.role === "user" ? (
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center ring-2 ring-background shadow-sm">
              <User className="w-5 h-5 text-primary-foreground" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center ring-2 ring-background shadow-sm">
              <Bot className="w-5 h-5 text-secondary-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1 space-y-2 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{message.role === "user" ? "You" : "Assistant"}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {format(new Date(message.timestamp), "HH:mm")}
                </div>
              </TooltipTrigger>
              <TooltipContent>{format(new Date(message.timestamp), "PPpp")}</TooltipContent>
            </Tooltip>
            
            {/* Action buttons - visible on hover or for the last message */}
            <div className={cn(
              "flex items-center gap-1 ml-auto transition-opacity duration-200",
              (showActions || isLast) ? "opacity-100" : "opacity-0"
            )}>
              {/* Regenerate button - only for assistant messages */}
              {message.role === "assistant" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-muted/50 transition-all duration-200"
                      onClick={handleRegenerate}
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span className="sr-only">Regenerate response</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Regenerate response</TooltipContent>
                </Tooltip>
              )}
              
              {/* Play button - for messages that might have audio/visual content */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 hover:bg-muted/50 transition-all duration-200",
                      isPlaying && "text-primary bg-primary/10"
                    )}
                    onClick={handlePlay}
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <AudioLines className="w-4 h-4" />
                    )}
                    <span className="sr-only">{isPlaying ? "Pause" : "Play"}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isPlaying ? "Pause" : "Play"}</TooltipContent>
              </Tooltip>
              
              {/* Copy button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 hover:bg-muted/50 transition-all duration-200",
                      copied && "text-green-500 bg-green-500/10"
                    )}
                    onClick={() => copyToClipboard(message.content || "")}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span className="sr-only">Copy message</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy message</TooltipContent>
              </Tooltip>
              
              {/* More options dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted/50 transition-all duration-200">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-more-horizontal"
                    >
                      <circle cx="12" cy="12" r="1" />
                      <circle cx="19" cy="12" r="1" />
                      <circle cx="5" cy="12" r="1" />
                    </svg>
                    <span className="sr-only">More options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {message.role === "user" && (
                    <DropdownMenuItem onClick={handleEdit}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit message
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleReport}>
                    <Flag className="w-4 h-4 mr-2" />
                    Report message
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-full [&_p]:whitespace-pre-wrap [&_p]:mb-0">
            {messageContent}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
