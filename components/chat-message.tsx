"use client"

import type { Message } from "@/lib/types"
import { User, Bot, Check, Copy, Clock, RefreshCw, Edit, Flag, Pause, AudioLines } from 'lucide-react'
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import remarkMath from "remark-math"
import remarkToc from "remark-toc"
import remarkEmoji from "remark-emoji"
import remarkFrontmatter from "remark-frontmatter"
import rehypeKatex from "rehype-katex"
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark, oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism"
import { useEffect, useRef, useState, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { FileAttachment } from "@/components/file-attachment"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import dedent from "dedent"
import "katex/dist/katex.min.css"

const remarkPlugins = [
  remarkGfm,
  remarkBreaks,
  remarkMath,
  remarkToc,
  remarkEmoji,
  remarkFrontmatter,
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

export function ChatMessage({ message, isLast, onRegenerate, onEdit, onReport, onPlay }: Readonly<ChatMessageProps>) {
  const messageRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const isDarkTheme = typeof document !== 'undefined' ? document.documentElement.classList.contains("dark") : false;
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const normalizeContent = (content: string) => {
    // Trim whitespace while preserving meaningful line breaks
    return dedent(content)
      // Remove excessive blank lines (more than 2 consecutive newlines)
      .replace(/\n{3,}/g, '\n\n')
      // Ensure content ends with at most one newline
      .replace(/\n+$/, '\n')
  }

  const handleRegenerate = () => {
    if (onRegenerate) {
      onRegenerate()
    }
  }

  const handleEdit = () => {
    if (onEdit && message.id) {
      onEdit(message.id)
    }
  }

  const handleReport = () => {
    if (onReport && message.id) {
      onReport(message.id)
    }
  }

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

  useEffect(() => {
    if (isLast && messageRef.current) {
      // Initial scroll attempt
      messageRef.current.scrollIntoView({ behavior: "smooth", block: "end" })
      
      // Also watch for any size changes in the message element
      const observer = new ResizeObserver(() => {
        messageRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
      })
      
      observer.observe(messageRef.current)
      return () => observer.disconnect()
    }
  }, [isLast, message.content, message.thinking, message.thinkingContent])

  // Process content to extract file attachments with improved CSV handling
  const processContent = (content: string) => {
    // Check if content contains file attachments
    if (!content.match(fileAttachmentRegex)) {
      // If no file attachments, render as normal markdown
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
          {normalizeContent(content)}
        </ReactMarkdown>
      );
    }
    
    // Split content by file attachments
    const parts = [];
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
            <ReactMarkdown
              key={`text-${lastIndex}`}
              remarkPlugins={remarkPlugins}
              rehypePlugins={[rehypeKatex]}
              className="whitespace-pre-wrap break-words"
              components={{
                code({ node: _node, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "")
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
              {normalizeContent(textBefore)}
            </ReactMarkdown>
          );
        }
      }
      
      // Add the file attachment
      const fileName = match[1].trim();
      let fileContent = match[2];
      
      // Format CSV content for better readability if needed
      if (fileName.toLowerCase().endsWith('.csv')) {
        // If it's not already formatted, ensure we preserve the structure
        if (!fileContent.includes('\t') && fileContent.includes(',')) {
          // Basic CSV formatting - convert commas to tabs for better display
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
          <ReactMarkdown
            key={`text-${lastIndex}`}
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
            {normalizeContent(textAfter)}
          </ReactMarkdown>
        );
      }
    }
    
    return <>{parts}</>;
  };

  return (
    <TooltipProvider>
      <div 
        ref={messageRef} 
        className={cn(
          "flex gap-4 px-2 py-6 relative group transition-colors duration-200"
        )}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div className="flex-shrink-0 mt-1">
          {message.role === "user" ? (
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center ring-2 ring-background">
              <User className="w-5 h-5 text-primary-foreground" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center ring-2 ring-background">
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
              "flex items-center gap-1 ml-auto transition-opacity",
              (showActions || isLast) ? "opacity-100" : "opacity-0"
            )}>
              {/* Regenerate button - only for assistant messages */}
              {message.role === "assistant" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
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
                    className="h-8 w-8"
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
                    className="h-8 w-8"
                    onClick={() => copyToClipboard(message.content || "")}
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    <span className="sr-only">Copy message</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy message</TooltipContent>
              </Tooltip>
              
              {/* More options dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
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
            {message.thinkingContent && (
              <div className="relative">
                {/* Thinking animation */}
                <div className="bg-muted/50 border rounded-lg p-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Thinking: {message.thinkingContent}</span>
                  </div>
                </div>
              </div>
            )}
            {message.content ? (
              processContent(message.content)
            ) : (
              <div className="flex gap-1">
                <span
                  className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
