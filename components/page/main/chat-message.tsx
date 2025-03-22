"use client"

import type { Message } from "@/lib/types"
import {
  User,
  Bot,
  Check,
  Copy,
  Clock,
  RefreshCw,
  Edit,
  Flag,
  Pause,
  AudioLines,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import dedent from "dedent"
import "katex/dist/katex.min.css"
import { FileAttachment } from "./file-attachment"
import { useThrottledCallback } from "use-debounce"
import remarkEmoji from "remark-emoji"
import remarkGemoji from "remark-gemoji"
import remarkFrontmatter from "remark-frontmatter"
import remarkDirective from "remark-directive"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

const remarkPlugins = [
  remarkGfm,
  remarkBreaks,
  remarkMath,
  remarkEmoji,
  remarkGemoji,
  remarkFrontmatter,
  remarkDirective,
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
const fileAttachmentRegex = /$$([^)]+)$$\n-{2,}\n([\s\S]*?)(?:\n-{2,}(?:\n|$)|$)/g

// Memoize markdown components for better performance
const MarkdownRenderer = memo(
  ({
    content,
    isDarkTheme,
    remarkPlugins,
    copyToClipboard,
    copied,
  }: {
    content: string
    isDarkTheme: boolean
    remarkPlugins: any[]
    copyToClipboard: (text: string) => void
    copied: boolean
  }) => {
    // Normalize content outside render
    const normalizedContent = useMemo(() => {
      return dedent(content)
        .replace(/\n{3,}/g, "\n\n")
        .replace(/\n+$/, "\n")
    }, [content])

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
                  style={isDarkTheme ? darkTheme : (lightTheme as any)}
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
    )
  },
)
MarkdownRenderer.displayName = "MarkdownRenderer"

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
  )
})
StreamingText.displayName = "StreamingText"

// Thinking content component with collapsible functionality
const ThinkingContent = memo(({ content }: { content: string }) => {
  const [isOpen, setIsOpen] = useState(false)

  // Clean up content by removing any stray HTML-like tags and normalize whitespace
  const cleanedContent = useMemo(() => {
    // Clean remaining tags, extra whitespace, etc.
    return content
      .replace(/<\/?(?:think|reasoning)>/gi, "")  // Remove any remaining thinking tags
      .replace(/\n{3,}/g, "\n\n")                 // Normalize multiple newlines
      .trim();
  }, [content]);

  // Extract last 3 lines or first 50 characters for preview
  const previewContent = useMemo(() => {
    const lines = cleanedContent.split("\n").filter(line => line.trim().length > 0);
    if (lines.length <= 1) {
      // If just one line, show first 50 chars
      const firstLine = lines[0] || "";
      return firstLine.length > 50 ? firstLine.substring(0, 50) + "..." : firstLine;
    } else {
      // Show last 3 lines for better context
      const lastLines = lines.slice(-3);
      return lastLines.map(line => 
        line.length > 50 ? line.substring(0, 50) + "..." : line
      ).join("\n");
    }
  }, [cleanedContent]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="relative mb-3 transition-all duration-300">
      <div className="bg-gradient-to-br from-primary/5 via-muted/30 to-background backdrop-blur-sm border border-primary/10 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 dark:from-primary/10 dark:via-muted/20 dark:to-background/80">
        <div className="flex items-center gap-2">
          <div className="relative h-3 w-3">
            <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping opacity-75" style={{ animationDuration: "3s" }}></div>
            <div className="relative h-3 w-3 rounded-full bg-primary/60 animate-pulse" style={{ animationDuration: "2s" }}></div>
          </div>
          <span className="text-sm font-medium bg-gradient-to-r from-primary/90 via-primary/80 to-primary/70 bg-clip-text text-transparent">
            AI Thinking
          </span>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 ml-auto rounded-full hover:bg-primary/10 transition-all"
            >
              {isOpen ? (
                <ChevronDown className="h-3.5 w-3.5 text-primary/70" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-primary/70" />
              )}
              <span className="sr-only">{isOpen ? "Collapse" : "Expand"} thinking</span>
            </Button>
          </CollapsibleTrigger>
        </div>

        {!isOpen && (
          <div className="mt-2 pl-5 text-sm text-muted-foreground">
            <div className="overflow-hidden whitespace-pre-line font-light italic">
              <span className="inline-block">{previewContent}</span>
            </div>
          </div>
        )}

        <CollapsibleContent className="mt-3 overflow-hidden transition-all duration-300 ease-in-out">
          <div className="border-l-2 border-primary/20 pl-4 py-1 space-y-2">
            <div className="text-sm text-foreground/90 font-light leading-relaxed space-y-2">
              {cleanedContent.split("\n").map((line, i) => (
                <p key={i} className={line.trim() === "" ? "h-2" : ""}>
                  {line}
                </p>
              ))}
            </div>
          </div>
        </CollapsibleContent>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/5 to-transparent rounded-full -z-10 opacity-60 blur-xl"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-primary/5 to-transparent rounded-full -z-10 opacity-60 blur-lg"></div>
      </div>
    </Collapsible>
  )
})
ThinkingContent.displayName = "ThinkingContent"

// Optimized content renderer that handles both regular and streaming content
const ContentRenderer = memo(
  ({
    content,
    isDarkTheme,
    isStreaming,
    remarkPlugins,
    copyToClipboard,
    copied,
    thinkingContent,
  }: {
    content: string
    isDarkTheme: boolean
    isStreaming: boolean
    remarkPlugins: any[]
    copyToClipboard: (text: string) => void
    copied: boolean
    thinkingContent?: string
  }) => {
    // Add state for tracking thinking content that's currently streaming
    const [streamingThinkingContent, setStreamingThinkingContent] = useState<string | null>(null);
    const [isInThinkingBlock, setIsInThinkingBlock] = useState(false);
    const [mainStreamingContent, setMainStreamingContent] = useState<string>("");
    // Add ref to store the position and type of the opening tag
    const openingTagRef = useRef<{pos: number, type: string}>({pos: -1, type: ""});

    // Process streaming thinking content in real-time
    useEffect(() => {
      if (!isStreaming) {
        // Reset streaming states when not streaming
        setIsInThinkingBlock(false);
        setStreamingThinkingContent(null);
        setMainStreamingContent("");
        openingTagRef.current = {pos: -1, type: ""};
        return;
      }
      
      if (!isInThinkingBlock) {
        // Look for opening tags
        const thinkMatch = content.match(/<think>/i);
        const reasoningMatch = content.match(/<reasoning>/i);
        
        // Determine which tag comes first (if any)
        let openingTag = null;
        if (thinkMatch && (!reasoningMatch || thinkMatch.index! < reasoningMatch.index!)) {
          openingTag = {pos: thinkMatch.index!, type: "think"};
        } else if (reasoningMatch) {
          openingTag = {pos: reasoningMatch.index!, type: "reasoning"};
        }
        
        if (openingTag) {
          // We found an opening tag - enter thinking block state
          openingTagRef.current = openingTag;
          setIsInThinkingBlock(true);
          
          // Extract content before the tag and the thinking content so far
          const beforeThinking = content.substring(0, openingTag.pos);
          const tagLength = openingTag.type.length + 2; // +2 for "<" and ">"
          const thinkingStart = openingTag.pos + tagLength;
          const thinkingContent = content.substring(thinkingStart);
          
          setMainStreamingContent(beforeThinking);
          setStreamingThinkingContent(thinkingContent);
        } else {
          // No thinking block detected
          setMainStreamingContent(content);
          setStreamingThinkingContent(null);
        }
      } else {
        // We're already in a thinking block
        const { pos: openPos, type: openType } = openingTagRef.current;
        const closingTagPattern = new RegExp(`</${openType}>`, 'i');
        const closingMatch = content.match(closingTagPattern);
        
        if (closingMatch && closingMatch.index! > openPos) {
          // Found closing tag - extract the complete thinking content
          const tagLength = openType.length + 2; // +2 for "<" and ">"
          const thinkingStart = openPos + tagLength;
          const thinkingEnd = closingMatch.index!;
          const closingTagLength = openType.length + 3; // +3 for "</>"
          
          // Extract thinking content
          const extractedThinking = content.substring(thinkingStart, thinkingEnd);
          
          // Reconstruct main content by removing the thinking block
          const beforeBlock = content.substring(0, openPos);
          const afterBlock = content.substring(thinkingEnd + closingTagLength);
          const newMainContent = beforeBlock + afterBlock;
          
          setStreamingThinkingContent(extractedThinking);
          setMainStreamingContent(newMainContent);
          
          // Exit thinking block state
          setIsInThinkingBlock(false);
          openingTagRef.current = {pos: -1, type: ""};
        } else {
          // Still in thinking block, update with latest content
          const tagLength = openType.length + 2; // +2 for "<" and ">"
          const thinkingStart = openPos + tagLength;
          const currentThinking = content.substring(thinkingStart);
          
          setStreamingThinkingContent(currentThinking);
          setMainStreamingContent(content.substring(0, openPos));
        }
      }
    }, [content, isStreaming, isInThinkingBlock]);

    // Process content to extract file attachments - moved useMemo BEFORE any conditional returns
    const processedContent = useMemo(() => {
      // For streaming content with active thinking tags, render with special handling
      if (isStreaming) {
        if (streamingThinkingContent) {
          return (
            <>
              {thinkingContent && <ThinkingContent content={thinkingContent} />}
              <ThinkingContent content={streamingThinkingContent} />
              {mainStreamingContent && <StreamingText content={mainStreamingContent} />}
            </>
          );
        }
        return <StreamingText content={content} />
      }

      // Extract thinking content from tags like <think> or <reasoning>
      const thinkingTagRegex = /<(think|reasoning)>([\s\S]*?)<\/\1>/gi
      let mainContent = content
      const thinkingBlocks: string[] = []
      
      // Find all thinking/reasoning blocks
      let match
      while ((match = thinkingTagRegex.exec(content)) !== null) {
        thinkingBlocks.push(match[2].trim())
        // Remove the thinking block from main content to avoid duplication
        mainContent = mainContent.replace(match[0], '')
      }
      
      // Combine extracted thinking blocks with existing thinkingContent
      let finalThinkingBlocks: JSX.Element[] = []
      
      // Add existing thinking content if provided
      if (thinkingContent) {
        finalThinkingBlocks.push(
          <ThinkingContent key="thinking-existing" content={thinkingContent} />
        )
      }
      
      // Add newly extracted thinking blocks
      thinkingBlocks.forEach((block, index) => {
        finalThinkingBlocks.push(
          <ThinkingContent key={`thinking-extracted-${index}`} content={block} />
        )
      })

      // Check if content contains file attachments
      if (!mainContent.match(fileAttachmentRegex)) {
        // If no file attachments, render as normal markdown
        return (
          <>
            {finalThinkingBlocks}
            <MarkdownRenderer
              content={mainContent}
              isDarkTheme={isDarkTheme}
              remarkPlugins={remarkPlugins}
              copyToClipboard={copyToClipboard}
              copied={copied}
            />
          </>
        )
      }

      // Split content by file attachments
      const parts: JSX.Element[] = []
      let lastIndex = 0
      let fileMatch

      // Reset regex index
      fileAttachmentRegex.lastIndex = 0

      while ((fileMatch = fileAttachmentRegex.exec(mainContent)) !== null) {
        // Add text before the file attachment
        if (fileMatch.index > lastIndex) {
          const textBefore = mainContent.substring(lastIndex, fileMatch.index)
          if (textBefore.trim()) {
            parts.push(
              <MarkdownRenderer
                key={`text-${lastIndex}`}
                content={textBefore}
                isDarkTheme={isDarkTheme}
                remarkPlugins={remarkPlugins}
                copyToClipboard={copyToClipboard}
                copied={copied}
              />,
            )
          }
        }

        // Add the file attachment
        const fileName = fileMatch[1].trim()
        let fileContent = fileMatch[2]

        // Format CSV content for better readability if needed
        if (fileName.toLowerCase().endsWith(".csv")) {
          if (!fileContent.includes("\t") && fileContent.includes(",")) {
            fileContent = fileContent
              .split("\n")
              .map((line) => line.replace(/,/g, "\t"))
              .join("\n")
          }
        }

        parts.push(
          <FileAttachment key={`file-${fileMatch.index}`} name={fileName}>
            {fileContent}
          </FileAttachment>,
        )

        lastIndex = fileMatch.index + fileMatch[0].length
      }

      // Add any remaining text after the last file attachment
      if (lastIndex < mainContent.length) {
        const textAfter = mainContent.substring(lastIndex)
        if (textAfter.trim()) {
          parts.push(
            <MarkdownRenderer
              key={`text-${lastIndex}`}
              content={textAfter}
              isDarkTheme={isDarkTheme}
              remarkPlugins={remarkPlugins}
              copyToClipboard={copyToClipboard}
              copied={copied}
            />,
          )
        }
      }

      return (
        <>
          {finalThinkingBlocks}
          {parts}
        </>
      )
    }, [content, isDarkTheme, isStreaming, remarkPlugins, copyToClipboard, copied, thinkingContent, streamingThinkingContent, mainStreamingContent, isInThinkingBlock]);

    return processedContent
  },
)
ContentRenderer.displayName = "ContentRenderer"

export function ChatMessage({ message, isLast, onRegenerate, onEdit, onReport, onPlay }: Readonly<ChatMessageProps>) {
  const messageRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [extractedThinking, setExtractedThinking] = useState<string | null>(null)
  const [cleanedContent, setCleanedContent] = useState<string | null>(null)
  const isDarkTheme = typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : false
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null)
  const shouldAutoScrollRef = useRef(true)

  // Detect if content is streaming
  const isStreaming = useMemo(() => {
    return message.thinking || !message.content;
  }, [message.thinking, message.content]);

  // Extract embedded thinking content before rendering
  useEffect(() => {
    if (message.content && !message.thinking) {
      const thinkingTagRegex = /<(think|reasoning)>([\s\S]*?)<\/\1>/gi;
      let mainContent = message.content;
      const thinkingBlocks: string[] = [];
      
      // Find all thinking/reasoning blocks
      let match;
      let hasFoundThinking = false;
      while ((match = thinkingTagRegex.exec(message.content)) !== null) {
        thinkingBlocks.push(match[2].trim());
        // Remove the thinking block from main content
        mainContent = mainContent.replace(match[0], '');
        hasFoundThinking = true;
      }
      
      // Only update if we found embedded thinking content
      if (thinkingBlocks.length > 0) {
        // Update local state instead of modifying message directly
        setExtractedThinking(thinkingBlocks.join('\n\n'));
        setCleanedContent(mainContent.trim());
      } else {
        setExtractedThinking(null);
        setCleanedContent(null);
      }
    }
  }, [message.content, message.thinking]);

  // Move these functions before the useEffect
  const checkShouldAutoScroll = useCallback(() => {
    if (!messageRef.current) return

    const container =
      messageRef.current.closest(".chat-messages-container") || messageRef.current.closest(".overflow-y-auto")
    if (!container) return

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
    shouldAutoScrollRef.current = distanceFromBottom < 100

    // Show scroll button when we're more than 300px from bottom
    setShowScrollButton(distanceFromBottom > 300)
  }, [])

  const scrollToBottom = useCallback(() => {
    if (!messageRef.current) return

    const container =
      messageRef.current.closest(".chat-messages-container") || messageRef.current.closest(".overflow-y-auto")
    if (!container) return

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    })

    shouldAutoScrollRef.current = true
    setShowScrollButton(false)
  }, [])

  // Throttled scroll handler
  const handleScroll = useThrottledCallback(checkShouldAutoScroll, 100)

  // Animation and visibility effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 50)

    return () => clearTimeout(timer)
  }, [])

  // Initial scroll effect
  useEffect(() => {
    if (isLast && messageRef.current) {
      setTimeout(() => {
        messageRef.current?.scrollIntoView({ behavior: "auto", block: "end" })
      }, 100)
    }
  }, [isLast])

  // Main scroll effect
  useEffect(() => {
    if (!messageRef.current) return

    const container =
      messageRef.current.closest(".chat-messages-container") || messageRef.current.closest(".overflow-y-auto")
    if (!container) return

    container.addEventListener("scroll", handleScroll)
    // Initial check
    checkShouldAutoScroll()

    const isNewMessage = message.timestamp && Date.now() - new Date(message.timestamp).getTime() < 1000

    const shouldScroll =
      (isLast && isNewMessage) ||
      (isLast && shouldAutoScrollRef.current) ||
      (isLast && (message.thinking || message.thinkingContent))

    if (shouldScroll) {
      messageRef.current.scrollIntoView({
        behavior: isNewMessage ? "auto" : "smooth",
        block: "end",
      })
    }

    const observer = new ResizeObserver(() => {
      if (isLast && shouldAutoScrollRef.current) {
        messageRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        })
      }
    })

    observer.observe(messageRef.current)

    return () => {
      container.removeEventListener("scroll", handleScroll)
      observer.disconnect()
    }
  }, [
    isLast,
    message.content,
    message.thinking,
    message.thinkingContent,
    message.timestamp,
    handleScroll,
    checkShouldAutoScroll,
  ])

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  const handleRegenerate = useCallback(() => {
    if (onRegenerate) {
      onRegenerate()
    }
  }, [onRegenerate])

  const handleEdit = useCallback(() => {
    if (onEdit && message.id) {
      onEdit(message.id)
    }
  }, [onEdit, message.id])

  const handleReport = useCallback(() => {
    if (onReport && message.id) {
      onReport(message.id)
    }
  }, [onReport, message.id])

  const handlePlay = useCallback(() => {
    if (!message.content) {
      return
    }

    if (isPlaying) {
      window.speechSynthesis.cancel()
      setIsPlaying(false)
      return
    }

    if (!speechRef.current) {
      speechRef.current = new SpeechSynthesisUtterance(message.content)

      speechRef.current.onend = () => {
        setIsPlaying(false)
      }

      speechRef.current.onerror = () => {
        setIsPlaying(false)
      }
    }

    setIsPlaying(true)
    window.speechSynthesis.speak(speechRef.current)

    if (onPlay && message.id) {
      onPlay(message.id)
    }
  }, [isPlaying, message.content, message.id, onPlay])

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
      )
    }

    // Use extractedThinking if available, otherwise use message.thinkingContent
    const thinkingContentToShow = extractedThinking || message.thinkingContent;
    
    // Use cleanedContent if available (when we found thinking tags), otherwise use message.content
    const contentToShow = cleanedContent || message.content;

    return (
      <>
        {thinkingContentToShow && (
          <ThinkingContent content={thinkingContentToShow} />
        )}
        
        {contentToShow && (
          <div className="transform transition-opacity duration-300 ease-in-out">
            <ContentRenderer
              content={contentToShow}
              isDarkTheme={isDarkTheme}
              isStreaming={isStreaming}
              remarkPlugins={remarkPlugins}
              copyToClipboard={copyToClipboard}
              copied={copied}
            />
          </div>
        )}
      </>
    )
  }, [
    message.content,
    message.thinkingContent,
    isDarkTheme,
    isStreaming,
    remarkPlugins,
    copyToClipboard,
    copied,
    extractedThinking,
    cleanedContent
  ])

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
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
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
            <div
              className={cn(
                "flex items-center gap-1 ml-auto transition-opacity duration-200",
                showActions || isLast ? "opacity-100" : "opacity-0",
              )}
            >
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
                      isPlaying && "text-primary bg-primary/10",
                    )}
                    onClick={handlePlay}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <AudioLines className="w-4 h-4" />}
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
                      copied && "text-green-500 bg-green-500/10",
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
  )
}

