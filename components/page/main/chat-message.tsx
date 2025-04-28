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
  ChevronUp,
  Globe,
  X,
  SkipForward,
  Loader2,
  FlagTriangleRight,
  Download,
  MoreHorizontal,
  Pencil,
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
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

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
        className="prose-content"
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
  const containerRef = useRef<HTMLDivElement>(null)
  const [renderMode, setRenderMode] = useState<'direct' | 'markdown'>('direct')

  // Force styles to apply immediately after mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Create a unique ID for this instance
    const uniqueId = `streaming-styles-${Math.random().toString(36).substring(2, 9)}`;

    // Create dynamic style tag for immediate styling with higher specificity
    const styleTag = document.createElement('style');
    styleTag.textContent = `
      /* Super high specificity selector */
      body #__next .urgent-streaming-styles[data-id="${uniqueId}"] * {
        opacity: 1 !important;
        visibility: visible !important;
        animation: none !important;
        transition: none !important;
        display: block !important;
      }

      body #__next .urgent-streaming-styles[data-id="${uniqueId}"] h1,
      body #__next .urgent-streaming-styles[data-id="${uniqueId}"] .urgent-md-h1 {
        font-size: 1.5rem !important;
        font-weight: 700 !important;
        margin-top: 1.5rem !important;
        margin-bottom: 1rem !important;
        padding-bottom: 0.25rem !important;
        border-bottom: 1px solid hsl(var(--border) / 0.4) !important;
        color: hsl(var(--foreground)) !important;
      }

      body #__next .urgent-streaming-styles[data-id="${uniqueId}"] h2,
      body #__next .urgent-streaming-styles[data-id="${uniqueId}"] .urgent-md-h2 {
        font-size: 1.25rem !important;
        font-weight: 700 !important;
        margin-top: 1.25rem !important;
        margin-bottom: 0.75rem !important;
        padding-bottom: 0.25rem !important;
        border-bottom: 1px solid hsl(var(--border) / 0.3) !important;
        color: hsl(var(--foreground)) !important;
      }

      body #__next .urgent-streaming-styles[data-id="${uniqueId}"] h3,
      body #__next .urgent-streaming-styles[data-id="${uniqueId}"] .urgent-md-h3 {
        font-size: 1.125rem !important;
        font-weight: 700 !important;
        margin-top: 1rem !important;
        margin-bottom: 0.5rem !important;
        color: hsl(var(--foreground)) !important;
      }

      body #__next .urgent-streaming-styles[data-id="${uniqueId}"] p {
        margin-bottom: 1rem !important;
        white-space: pre-wrap !important;
      }

      body #__next .urgent-streaming-styles[data-id="${uniqueId}"] ul,
      body #__next .urgent-streaming-styles[data-id="${uniqueId}"] ol {
        padding-left: 1.5rem !important;
        margin-bottom: 1rem !important;
        display: block !important;
      }

      body #__next .urgent-streaming-styles[data-id="${uniqueId}"] ul {
        list-style-type: disc !important;
      }

      body #__next .urgent-streaming-styles[data-id="${uniqueId}"] ol {
        list-style-type: decimal !important;
      }

      body #__next .urgent-streaming-styles[data-id="${uniqueId}"] li {
        margin-bottom: 0.25rem !important;
        display: list-item !important;
      }

      body #__next .urgent-streaming-styles[data-id="${uniqueId}"] blockquote {
        margin: 1rem 0 !important;
        padding-left: 1rem !important;
        border-left: 2px solid hsl(var(--primary) / 0.3) !important;
        color: hsl(var(--muted-foreground)) !important;
        font-style: italic !important;
      }

      body #__next .urgent-streaming-styles[data-id="${uniqueId}"] code {
        background-color: hsl(var(--muted)) !important;
        padding: 0.125rem 0.375rem !important;
        border-radius: 0.25rem !important;
        font-size: 0.875rem !important;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
        display: inline !important;
      }

      body #__next .urgent-streaming-styles[data-id="${uniqueId}"] pre {
        padding: 1rem !important;
        border-radius: 0.5rem !important;
        background-color: hsl(var(--muted)) !important;
        overflow-x: auto !important;
        font-size: 0.875rem !important;
        margin: 1rem 0 !important;
      }

      body #__next .urgent-streaming-styles[data-id="${uniqueId}"] pre code {
        background-color: transparent !important;
        padding: 0 !important;
        display: block !important;
      }

      body #__next .urgent-streaming-styles[data-id="${uniqueId}"] strong {
        font-weight: bold !important;
        display: inline !important;
      }

      body #__next .urgent-streaming-styles[data-id="${uniqueId}"] em {
        font-style: italic !important;
        display: inline !important;
      }
    `;
    document.head.appendChild(styleTag);

    // Function defined outside of blocks to satisfy strict mode
    const applyStylesToMarkdown = () => {
      if (containerRef.current) {
        const elements = containerRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6, p, ul, ol, li, blockquote, code, pre');
        elements.forEach(el => {
          // Force visibility
          // Determine display style based on element type
          let displayStyle = 'block';
          if (el.tagName === 'LI') {
            displayStyle = 'list-item';
          } else if (el.tagName === 'CODE' && el.parentElement?.tagName !== 'PRE') {
            displayStyle = 'inline';
          }
          (el as HTMLElement).style.display = displayStyle;
          (el as HTMLElement).style.visibility = 'visible';
          (el as HTMLElement).style.opacity = '1';
        });
      }
    };

    // Apply styles immediately
    applyStylesToMarkdown();

    // Switch to ReactMarkdown after a delay
    const timer1 = setTimeout(applyStylesToMarkdown, 100);
    const timer2 = setTimeout(() => {
      setRenderMode('markdown');
    }, 1000);

    return () => {
      document.head.removeChild(styleTag);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // No need for copyToClipboard in StreamingText

  // Normalize content before rendering
  const normalizedContent = useMemo(() => {
    return dedent(content)
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\n+$/, "\n")
  }, [content])

  // Create HTML directly instead of using ReactMarkdown for streaming
  // This will be more immediately styled by the browser
  const createMarkdownHtml = useMemo(() => {
    // Simple markdown parser for immediate display
    return normalizedContent
      // Headers
      .replace(/^# (.*$)/gim, '<h1 class="urgent-md-h1">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="urgent-md-h2">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="urgent-md-h3">$1</h3>')
      .replace(/^#### (.*$)/gim, '<h4 class="urgent-md-h4">$1</h4>')
      // Bold and italic
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/_(.*?)_/gim, '<em>$1</em>')
      // Lists
      .replace(/^\s*\n\* (.*)/gim, '<ul>\n<li>$1</li>\n</ul>')
      .replace(/^\s*\n\d\. (.*)/gim, '<ol>\n<li>$1</li>\n</ol>')
      // Fix lists continuation
      .replace(/<\/ul>\s*\n<ul>/gim, '')
      .replace(/<\/ol>\s*\n<ol>/gim, '')
      // Add list items
      .replace(/^\* (.*)/gim, '<li>$1</li>')
      .replace(/^\d\. (.*)/gim, '<li>$1</li>')
      // Blockquotes
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
      // Code blocks
      .replace(/```([^`]+)```/gim, '<pre><code>$1</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/gim, '<code>$1</code>')
      // Paragraphs
      .replace(/^\s*\n\s*\n/gim, '</p>\n\n<p>')
      // Wrap content in paragraph if it's not wrapped
      .replace(/^([^<].*)/gim, '<p>$1</p>')
      // Fix extra opening paragraphs
      .replace(/^<p><\/p>/gim, '')
      // Fix multiple paragraph tags
      .replace(/<\/p><p>/gim, '</p>\n<p>');


  }, [normalizedContent]);

  // Generate a unique ID for this component instance
  const uniqueId = useMemo(() => `streaming-${Math.random().toString(36).substring(2, 9)}`, []);

  return (
    <div className="relative streaming-markdown-container urgent-streaming-styles"
      ref={containerRef}
      data-id={uniqueId}>
      <div className="prose-content streaming-content custom-streaming-markdown">
        {renderMode === 'direct' ? (
          <div
            className="urgent-streaming-styles"
            data-id={uniqueId}
            dangerouslySetInnerHTML={{ __html: createMarkdownHtml }}
          />
        ) : (
          <ReactMarkdown
            className="custom-streaming-markdown urgent-streaming-styles"
            remarkPlugins={remarkPlugins}
            rehypePlugins={[rehypeKatex]}
          >
            {normalizedContent}
          </ReactMarkdown>
        )}
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
            Thinking
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
              {cleanedContent.split("\n").map((line, i) => {
                // Use a unique key based on content and index
                const lineKey = `line-${i}-${line.substring(0, 10)}`;
                return (
                  <p key={lineKey} className={line.trim() === "" ? "h-2" : ""}>
                    {line}
                  </p>
                );
              })}
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

// ResearchStatus component
const ResearchStatus = memo(({ status }: { status: any }) => {
  const [isOpen, setIsOpen] = useState(true);

  if (!status) return null;

  // Handle different statuses in the research flow
  let statusMessage = '';
  let detailMessage = '';
  
  switch (status.status) {
    case 'started':
      statusMessage = 'Research initiated';
      detailMessage = status.message || 'Starting research process...';
      break;
    case 'generating_queries':
      statusMessage = 'Generating search queries';
      detailMessage = status.message || 'Creating optimal search queries based on your question...';
      break;
    case 'queries_generated':
      statusMessage = `Generated ${status.queries?.length || 0} search queries`;
      detailMessage = status.queries ? status.queries.join(', ') : '';
      break;
    case 'searching':
      statusMessage = 'Searching';
      detailMessage = status.message || `Searching for "${status.currentQuery}"`;
      break;
    case 'search_complete':
      statusMessage = 'Search completed';
      detailMessage = status.message || `Found ${status.count || 0} results`;
      break;
    case 'processing':
      statusMessage = 'Processing research';
      detailMessage = status.message || `Processing ${status.count || 0} sources...`;
      break;
    case 'complete':
      statusMessage = 'Research completed';
      detailMessage = status.message || 'Finished research. Generating response...';
      break;
    case 'error':
      statusMessage = 'Research error';
      detailMessage = status.message || status.error || 'An error occurred during research.';
      break;
    default:
      statusMessage = 'Researching';
      detailMessage = status.message || 'Finding information...';
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="my-4">
      <div className="relative bg-muted/30 rounded-lg p-3 overflow-hidden">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4 text-primary"
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <h3 className="text-sm font-medium">{statusMessage}</h3>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-background/80">
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent className="mt-2 overflow-hidden transition-all duration-300 ease-in-out">
          <div className="border-l-2 border-primary/20 pl-4 py-1 space-y-2">
            <div className="text-sm text-foreground/90 font-light leading-relaxed">
              {detailMessage}
              
              {/* Display sources if available */}
              {status.sources && status.sources.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium text-xs text-muted-foreground mb-1">Sources:</p>
                  <ul className="list-disc pl-4 text-xs space-y-1">
                    {status.sources.map((source: any, index: number) => (
                      <li key={`source-${index}`}>
                        {source.title} {source.url && <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-primary underline">Link</a>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>

        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/5 to-transparent rounded-full -z-10 opacity-60 blur-xl"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-primary/5 to-transparent rounded-full -z-10 opacity-60 blur-lg"></div>
      </div>
    </Collapsible>
  );
});
ResearchStatus.displayName = "ResearchStatus";

// Enhance the BrowsingStatus component to better display search history
const BrowsingStatus = memo(({ status, searchQuery, progress, message, references }: {
  status: string;
  searchQuery?: string;
  progress?: number;
  message?: any;
  references?: any;
}) => {
  const [expanded, setExpanded] = useState(false);
  
  // Get the browsing history from the message property
  const searchHistory = message?.history || [];
  
  const getMessage = (currentStatus: string) => {
    switch (currentStatus) {
      case 'started':
        return `Started web search for "${searchQuery}"`;
      case 'analyzing':
        return 'Analyzing query and planning search strategy...';
      case 'searching':
        return `Searching the web for "${searchQuery}"...`;
      case 'tavily_results':
        return 'Processing search results...';
      case 'usage_info':
        return 'Checking usage information...';
      case 'skipped':
        return 'Web search skipped';
      case 'completed':
        return 'Web search completed';
      case 'error':
        return 'Error occurred during web search';
      default:
        return `Processing ${currentStatus}...`;
    }
  };
  
  // Return null if no status (should not happen)
  if (!status) return null;
  
  const isCompleted = ['completed', 'skipped', 'error'].includes(status);
  const hasReferences = references && references.length > 0;
  
  return (
    <div className="mt-4 border rounded-lg overflow-hidden bg-accent/30">
      <div className="p-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex-shrink-0">
            {isCompleted ? (
              status === 'error' ? (
                <X className="h-4 w-4 text-destructive" />
              ) : status === 'skipped' ? (
                <SkipForward className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Check className="h-4 w-4 text-primary" />
              )
            ) : (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{getMessage(status)}</p>
            {searchQuery && (
              <p className="text-xs text-muted-foreground truncate">
                {hasReferences ? (
                  <>Found {references.length} sources</>
                ) : (
                  <>Query: &quot;{searchQuery}&quot;</>
                )}
              </p>
            )}
          </div>
        </div>
        
        {/* Only show the toggle if there's a history to display */}
        {searchHistory.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-full"
            onClick={() => setExpanded(!expanded)}
          >
            <ChevronDown
              className={cn("h-4 w-4 text-muted-foreground transition-transform", 
                expanded ? "transform rotate-180" : ""
              )}
            />
            <span className="sr-only">Toggle search history</span>
          </Button>
        )}
      </div>
      
      {/* Expandable search history timeline */}
      {expanded && searchHistory.length > 0 && (
        <div className="px-4 pb-3 pt-1">
          <div className="relative border-l border-muted pl-4 space-y-2">
            {searchHistory.map((item: {status: string, timestamp: string}, index: number) => (
              <div key={`history-${index}`} className="relative">
                {/* Timeline dot */}
                <div className="absolute -left-6 top-1 h-3 w-3 rounded-full border-2 border-background" 
                  style={{ 
                    backgroundColor: ['completed', 'error', 'skipped'].includes(item.status) 
                      ? (item.status === 'error' ? 'var(--destructive)' : item.status === 'skipped' ? 'var(--muted)' : 'var(--primary)') 
                      : 'var(--muted-foreground)'
                  }} 
                />
                <div className="text-xs">
                  <span className="text-muted-foreground mr-1">{new Date(item.timestamp).toLocaleTimeString()}</span>
                  <span className="font-medium">{getMessage(item.status)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Progress bar for searching status */}
      {status === 'searching' && typeof progress === 'number' && (
        <Progress value={progress} className="h-1 rounded-none" />
      )}
    </div>
  );
});
BrowsingStatus.displayName = "BrowsingStatus";

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
    // Set up effect for component lifecycle
    useEffect(() => {
      return () => {}; // Cleanup function
    }, []);

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
        const thinkRegex = /<think>/i;
        const reasoningRegex = /<reasoning>/i;
        const thinkMatch = thinkRegex.exec(content);
        const reasoningMatch = reasoningRegex.exec(content);

        // Determine which tag comes first (if any)
        let openingTag = null;
        if (thinkMatch && (!reasoningMatch || (thinkMatch.index !== undefined && reasoningMatch.index !== undefined && thinkMatch.index < reasoningMatch.index))) {
          openingTag = {pos: thinkMatch.index ?? 0, type: "think"};
        } else if (reasoningMatch) {
          openingTag = {pos: reasoningMatch.index ?? 0, type: "reasoning"};
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
        const closingMatch = closingTagPattern.exec(content);

        if (closingMatch && closingMatch.index !== undefined && closingMatch.index > openPos) {
          // Found closing tag - extract the complete thinking content
          const tagLength = openType.length + 2; // +2 for "<" and ">"
          const thinkingStart = openPos + tagLength;
          const thinkingEnd = closingMatch.index;
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

    // Split the content processing into smaller functions for better performance
    // Handle streaming content separately
    const renderStreamingContent = useCallback(() => {
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
    }, [streamingThinkingContent, thinkingContent, mainStreamingContent, content]);

    // Process content to extract file attachments
    const processedContent = useMemo(() => {
      // For streaming content, use the dedicated renderer
      if (isStreaming) {
        return renderStreamingContent();
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
        // Use a unique key based on content and index
        const blockKey = `thinking-extracted-${index}-${block.substring(0, 10)}`;
        finalThinkingBlocks.push(
          <ThinkingContent key={blockKey} content={block} />
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
    }, [content, isDarkTheme, isStreaming, remarkPlugins, copyToClipboard, copied, thinkingContent, renderStreamingContent]);

    return processedContent
  },
)
ContentRenderer.displayName = "ContentRenderer"

export const ChatMessage = memo(function ChatMessage({ message, isLast, onRegenerate, onEdit, onReport, onPlay }: Readonly<ChatMessageProps>) {
  const messageRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [extractedThinking, setExtractedThinking] = useState<string | null>(null)
  const [cleanedContent, setCleanedContent] = useState<string | null>(null)
  const isDarkTheme = typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : false
  const speechRef = useRef<HTMLAudioElement | null>(null)
  const shouldAutoScrollRef = useRef(true)
  // Add new state for TTS processing
  const [currentTtsChunk, setCurrentTtsChunk] = useState<number>(0)
  const [audioQueue, setAudioQueue] = useState<string[]>([])
  const [isTtsLoading, setIsTtsLoading] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const debugAudioPlayerRef = useRef<HTMLAudioElement | null>(null)

  // Detect if content is streaming
  const isStreaming = useMemo(() => {
    return message.thinking || !message.content;
  }, [message.thinking, message.content]);

  // Helper function to split text into reasonable chunks for TTS
  const splitTextIntoChunks = useCallback((text: string, maxChunkLength: number = 300): string[] => {
    if (!text) return [];

    // Ensure there's always at least one chunk even for very short text
    if (text.trim().length <= maxChunkLength) {
      return [text.trim()];
    }

    // Remove markdown syntax for better TTS experience
    const cleanText = text
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`([^`]+)`/g, '$1') // Remove inline code
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
      .replace(/#+\s(.*)/g, '$1') // Remove headings
      .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images

    // Ensure we have at least one chunk even if the cleaned text is empty
    if (!cleanText.trim()) {
      return [text.trim().substring(0, Math.min(text.trim().length, maxChunkLength))];
    }

    const sentences = cleanText.match(/[^.!?]+[.!?]+|\s*\n\s*|\s*\n\s*\n\s*/g) || [];

    // If no sentences found, just return the whole text as one chunk if it's short enough
    if (sentences.length === 0) {
      return [cleanText.trim()];
    }

    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      // If adding this sentence would make the chunk too long, start a new chunk
      if (currentChunk.length + sentence.length > maxChunkLength && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }

      // If the current sentence ends with a paragraph break or is very long, force a chunk break
      const paragraphBreakRegex = /\n\s*\n/;
      if (paragraphBreakRegex.exec(sentence) || currentChunk.length >= maxChunkLength) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
    }

    // Add any remaining text as the final chunk
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    // Add safeguard to ensure we have at least one chunk
    if (chunks.length === 0) {
      return [text.trim().substring(0, Math.min(text.trim().length, maxChunkLength))];
    }

    return chunks;
  }, []);

  // Function to fetch and play TTS audio for a text chunk
  const fetchTtsAudio = useCallback(async (text: string): Promise<string> => {
    setIsTtsLoading(true);

    try {
      console.log("Fetching TTS audio for text:", text.substring(0, 20) + "...");

      // Create a new abort controller for this request - make sure it's not prematurely aborted
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Request TTS audio
      const response = await fetch('/api/transcribe/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice: "Arista-PlayAI"
        }),
        signal: controller.signal,
        cache: 'no-store'
      });

      if (!response.ok) {
        const errorMessage = `Failed to generate speech: ${response.status} ${response.statusText}`;
        console.error(errorMessage);
        throw new Error(errorMessage);
      }

      console.log("Received response from TTS API");

      // Parse the JSON response which now contains base64 data
      const data = await response.json();

      if (!data.audio) {
        console.error("Invalid response - missing audio data");
        throw new Error("Invalid response - missing audio data");
      }

      // Add to visible debug player
      if (debugAudioPlayerRef.current) {
        debugAudioPlayerRef.current.src = data.audio;
      }

      console.log("Got audio data URL of length:", data.audio.length);

      // Return the data URL directly - no need to create a blob
      return data.audio;

    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('TTS request was cancelled');
      } else {
        console.error('Error generating speech:', error);
      }
      throw error;
    } finally {
      setIsTtsLoading(false);
    }
  }, []);

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

  const handlePlay = useCallback(async () => {
    if (!message.content) {
      console.log("No message content to play");
      return;
    }

    // If already playing, stop the playback
    if (isPlaying) {
      console.log("Stopping current playback");
      setIsPlaying(false);
      setCurrentTtsChunk(0);

      // Cancel any ongoing TTS request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      if (speechRef.current) {
        // Store the current audio element
        const audioToStop = speechRef.current;

        // Clear the reference first to prevent any new operations on it
        speechRef.current = null;

        // Set onended to null to prevent any callbacks
        audioToStop.onended = null;

        // Then pause the audio
        setTimeout(() => {
          audioToStop.pause();
        }, 50);
      }

      // Clean up audio URLs
      audioQueue.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });

      setAudioQueue([]);
      return;
    }

    console.log("Starting TTS process");

    // Play a test sound first to verify audio is working
    try {
      const testAudio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");
      testAudio.volume = 1.0; // Full volume
      console.log("Playing test beep...");
      await testAudio.play();
      console.log("Test beep should have played");
    } catch (error) {
      console.log("Test beep failed - autoplay may be blocked:", error);
      // Continue anyway
    }

    // Start TTS process
    try {
      // Split the message content into manageable chunks
      const contentToSpeak = cleanedContent ?? message.content;
      console.log("Content length to speak:", contentToSpeak.length);

      const textChunks = splitTextIntoChunks(contentToSpeak);
      console.log("Split into chunks:", textChunks.length);

      if (textChunks.length === 0) {
        console.error("No text chunks to speak");
        return;
      }

      // Set playing state immediately for better UX
      setIsPlaying(true);

      // Create a new Audio element for each playback session
      // This helps avoid state conflicts
      const audio = new Audio();

      // Explicitly set volume to maximum
      audio.volume = 1.0;

      // Debug audio capabilities
      audio.onerror = (e) => {
        console.error("Audio element error:", e);
      };

      // Setup audio event listeners for debugging
      audio.addEventListener('canplay', () => {
        console.log("Audio can play now");
      });

      audio.addEventListener('playing', () => {
        console.log("Audio is now playing");
        console.log("Audio duration:", audio.duration);
        console.log("Audio volume:", audio.volume);
        console.log("Audio muted:", audio.muted);
      });

      speechRef.current = audio;

      // Fetch the first chunk's audio
      try {
        console.log("Fetching first chunk");
        const firstUrl = await fetchTtsAudio(textChunks[0]);
        console.log("Setting audio queue with first URL");

        // Log the first few characters of the data URL to verify format
        console.log("Data URL prefix:", firstUrl.substring(0, 30));

        setAudioQueue([firstUrl]);
        setCurrentTtsChunk(0);

        // Set up event handlers for auto-advancing
        audio.onended = () => {
          console.log("Audio ended, advancing to next chunk");
          // Only process if we're still playing and the element is still valid
          if (!isPlaying || !speechRef.current) {
            console.log("Not advancing: isPlaying=", isPlaying, "speechRef.current=", !!speechRef.current);
            return;
          }

          // Auto-advance to next chunk when one finishes
          if (currentTtsChunk < textChunks.length - 1) {
            const nextChunk = currentTtsChunk + 1;
            console.log("Moving to next chunk:", nextChunk);

            // Fetch next chunk if not already fetched
            (async () => {
              try {
                if (!isPlaying) return;

                // Get or fetch next audio chunk
                let nextUrl = audioQueue[nextChunk];
                if (!nextUrl) {
                  console.log("Fetching next chunk:", nextChunk);
                  nextUrl = await fetchTtsAudio(textChunks[nextChunk]);

                  // Update queue with new URL
                  setAudioQueue(prev => {
                    const newQueue = [...prev];
                    newQueue[nextChunk] = nextUrl;
                    return newQueue;
                  });
                }

                // Advance to next chunk
                setCurrentTtsChunk(nextChunk);

                // Only proceed if we're still playing
                if (!isPlaying || !speechRef.current) return;

                // Create a new Audio element for cleaner playback
                const nextAudio = new Audio();
                nextAudio.volume = 1.0; // Full volume
                nextAudio.src = nextUrl;

                // Debug listeners
                nextAudio.addEventListener('canplay', () => {
                  console.log("Next audio can play now");
                });

                nextAudio.addEventListener('playing', () => {
                  console.log("Next audio is now playing");
                  console.log("Next audio duration:", nextAudio.duration);
                });

                // Set up the onended handler
                nextAudio.onended = audio.onended;

                // Replace the reference
                speechRef.current = nextAudio;

                // Play next chunk
                console.log("Starting to play next chunk");
                try {
                  await nextAudio.play();
                } catch (err: any) {
                  console.error("Error playing next chunk:", err);
                  if (err.name !== 'AbortError') {
                    setIsPlaying(false);
                  }
                }
              } catch (error) {
                console.error("Error in next chunk processing:", error);
                if ((error as Error).name !== 'AbortError') {
                  setIsPlaying(false);
                }
              }
            })();
          } else {
            // Finished all chunks
            console.log("Finished all chunks");
            setIsPlaying(false);
            setCurrentTtsChunk(0);
            setAudioQueue([]);
          }
        };

        // Set source
        console.log("Setting up audio source");
        audio.src = firstUrl;

        // Try immediately playing to test if it works
        try {
          console.log("Attempting immediate playback");
          await audio.play();
          console.log("Immediate playback successful");
        } catch (error) {
          console.log("Immediate playback failed, will try with delay:", error);

          // Wait a moment to ensure the component is stable before trying again
          console.log("Scheduling playback with delay");
          setTimeout(async () => {
            // Only play if we're still in playing state
            if (isPlaying && speechRef.current === audio) {
              console.log("Starting delayed playback");
              try {
                await audio.play();
                console.log("Playback started successfully");
              } catch (error: any) {
                console.error("Initial playback error:", error);
                if (error.name !== 'AbortError') {
                  setIsPlaying(false);
                }
              }
            } else {
              console.log("Not starting playback - state changed");
            }
          }, 100);
        }

        // Start prefetching next chunks in background
        if (textChunks.length > 1) {
          setTimeout(() => {
            (async () => {
              try {
                if (!isPlaying) return;

                // Prefetch next chunk
                console.log("Prefetching second chunk");
                const secondUrl = await fetchTtsAudio(textChunks[1]);
                setAudioQueue(prev => {
                  const newQueue = [...prev];
                  newQueue[1] = secondUrl;
                  return newQueue;
                });
              } catch (error) {
                // Ignore prefetch errors - will retry when needed
                console.log("Prefetch error (non-critical):", error);
              }
            })();
          }, 500); // Short delay to prioritize first chunk playback
        }
      } catch (error) {
        console.error("Error in initial setup:", error);
        if ((error as Error).name !== 'AbortError') {
          console.error("Failed to start initial playback:", error);
          setIsPlaying(false);
        }
        return;
      }

      // Notify the parent component about the play action
      if (onPlay && message.id) {
        onPlay(message.id);
      }
    } catch (error) {
      console.error('Failed to start TTS playback:', error);
      setIsPlaying(false);
    }
  }, [
    message.content,
    message.id,
    isPlaying,
    cleanedContent,
    splitTextIntoChunks,
    fetchTtsAudio,
    audioQueue,
    currentTtsChunk,
    onPlay
  ]);

  // Extract embedded thinking content before rendering
  useEffect(() => {
    if (message.content && !message.thinking) {
      const thinkingTagRegex = /<(think|reasoning)>([\s\S]*?)<\/\1>/gi;
      let mainContent = message.content;
      const thinkingBlocks: string[] = [];

      // Find all thinking/reasoning blocks
      let match;

      while ((match = thinkingTagRegex.exec(message.content)) !== null) {
        thinkingBlocks.push(match[2].trim());
        // Remove the thinking block from main content
        mainContent = mainContent.replace(match[0], '');

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

  // Loading state component extracted for better performance
  const LoadingIndicator = memo(() => {
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
  });
  LoadingIndicator.displayName = "LoadingIndicator";

  // Collapsible User Message component for long user messages
const CollapsibleUserMessage = memo(({ content, isDarkTheme, remarkPlugins, copyToClipboard, copied }: {
  content: string
  isDarkTheme: boolean
  remarkPlugins: any[]
  copyToClipboard: (text: string) => void
  copied: boolean
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const contentLength = content.length

  // Define thresholds for collapsing
  const COLLAPSE_THRESHOLD = 800 // Characters
  const PREVIEW_LENGTH = 400 // Characters for preview

  // Only collapse if content is longer than threshold
  const shouldCollapse = contentLength > COLLAPSE_THRESHOLD

  // Create preview content - try to end at a sentence or paragraph break
  const previewContent = useMemo(() => {
    if (!shouldCollapse) return content

    let preview = content.substring(0, PREVIEW_LENGTH)

    // Try to end at a sentence or paragraph break
    const lastPeriod = preview.lastIndexOf('.')
    const lastNewline = preview.lastIndexOf('\n')

    // Find the best breakpoint - prefer sentence end, then paragraph break
    let breakpoint = PREVIEW_LENGTH
    if (lastPeriod > breakpoint * 0.7) { // At least 70% of desired length
      breakpoint = lastPeriod + 1 // Include the period
    } else if (lastNewline > breakpoint * 0.7) {
      breakpoint = lastNewline
    }

    return content.substring(0, breakpoint) + (shouldCollapse ? '...' : '')
  }, [content, shouldCollapse])

  if (!shouldCollapse) {
    // If content is short, just render it normally
    return (
      <MarkdownRenderer
        content={content}
        isDarkTheme={isDarkTheme}
        remarkPlugins={remarkPlugins}
        copyToClipboard={copyToClipboard}
        copied={copied}
      />
    )
  }

  return (
    <Collapsible
      open={isExpanded}
      onOpenChange={setIsExpanded}
      className="relative transition-all duration-300"
    >
      <div className="relative">
        {/* Preview content when collapsed */}
        {!isExpanded && (
          <div className="relative">
            <MarkdownRenderer
              content={previewContent}
              isDarkTheme={isDarkTheme}
              remarkPlugins={remarkPlugins}
              copyToClipboard={copyToClipboard}
              copied={copied}
            />
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none"></div>
          </div>
        )}

        {/* Full content when expanded */}
        <CollapsibleContent className="transition-all duration-300 ease-in-out">
          <MarkdownRenderer
            content={content}
            isDarkTheme={isDarkTheme}
            remarkPlugins={remarkPlugins}
            copyToClipboard={copyToClipboard}
            copied={copied}
          />
        </CollapsibleContent>

        {/* Toggle button */}
        <div className="flex justify-center mt-2">
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-3 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5 mr-1" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5 mr-1" />
                  Show more ({Math.round(contentLength / 100) / 10}k characters)
                </>
              )}
            </Button>
          </CollapsibleTrigger>
        </div>
      </div>
    </Collapsible>
  )
})
CollapsibleUserMessage.displayName = "CollapsibleUserMessage"

// Memoize the message content component to prevent unnecessary re-renders
  const messageContent = useMemo(() => {
    if (!message.content && !message.thinkingContent) {
      return <LoadingIndicator />
    }

    // Use extractedThinking if available, otherwise use message.thinkingContent
    const thinkingContentToShow = extractedThinking ?? message.thinkingContent;

    // Use cleanedContent if available (when we found thinking tags), otherwise use message.content
    const contentToShow = cleanedContent ?? message.content;

    return (
      <>
        {thinkingContentToShow && (
          <ThinkingContent content={thinkingContentToShow} />
        )}

        {contentToShow && (
          <div className="transform transition-opacity duration-300 ease-in-out">
            {/* Use CollapsibleUserMessage for user messages only */}
            {message.role === "user" ? (
              <CollapsibleUserMessage
                content={contentToShow}
                isDarkTheme={isDarkTheme}
                remarkPlugins={remarkPlugins}
                copyToClipboard={copyToClipboard}
                copied={copied}
              />
            ) : (
              <ContentRenderer
                content={contentToShow}
                isDarkTheme={isDarkTheme}
                isStreaming={isStreaming}
                remarkPlugins={remarkPlugins}
                copyToClipboard={copyToClipboard}
                copied={copied}
              />
            )}
          </div>
        )}
      </>
    )
  }, [
    message.content,
    message.thinkingContent,
    message.role,
    isDarkTheme,
    isStreaming,
    copyToClipboard,
    copied,
    extractedThinking,
    cleanedContent,
    LoadingIndicator,
    CollapsibleUserMessage
  ])

  // Cleanup effect for audio resources when component unmounts
  useEffect(() => {
    return () => {
      // Cancel any ongoing TTS requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      // Stop audio playback
      if (speechRef.current) {
        speechRef.current.pause();
        speechRef.current.onended = null;
        speechRef.current.onerror = null;
        speechRef.current = null;
      }

      // Clean up audio URLs
      audioQueue.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [audioQueue]);

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

      <article
        ref={messageRef}
        aria-label={`${message.role} message`}
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
                      isTtsLoading && "text-primary bg-primary/10 animate-pulse",
                    )}
                    onClick={handlePlay}
                    disabled={isTtsLoading && !isPlaying}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <AudioLines className="w-4 h-4" />}
                    <span className="sr-only">{isPlaying ? "Pause" : "Play"}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {(() => {
                    if (isPlaying) return "Pause";
                    if (isTtsLoading) return "Loading...";
                    return "Play";
                  })()}
                </TooltipContent>
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

          {/* Show research status if available */}
          {message.researchStatus && (
            <ResearchStatus status={message.researchStatus} />
          )}

          {/* Show browsing status if available */}
          {message.browsingStatus && message.browsingStatus.status && (
            <BrowsingStatus
              status={message.browsingStatus.status}
              searchQuery={message.browsingStatus.query}
              progress={message.browsingStatus.progress}
              message={message.browsingStatus}
              references={message.browsingStatus.sources}
            />
          )}

          <div className="markdown-wrapper max-w-full">
            {messageContent}
            
            {/* Show browsing references if available */}
            {message.browsingStatus && message.browsingStatus.status === 'completed' && message.browsingStatus.sources && (
              <BrowsingReferences sources={message.browsingStatus.sources} query={message.browsingStatus.query} />
            )}
            
            {/* Debug audio player - only visible when playing */}
            {isPlaying && (
              <div className="mt-4 p-3 bg-muted rounded-md">
                <p className="text-xs text-muted-foreground mb-2">Debug audio player (can you hear this?):</p>
                <audio
                  ref={debugAudioPlayerRef}
                  controls
                  autoPlay
                  className="w-full"
                  onError={(e) => console.error("Audio player error:", e)}
                >
                  <track kind="captions" src="" label="No captions available" />
                </audio>
              </div>
            )}
          </div>
        </div>
      </article>
    </TooltipProvider>
  )
});

ChatMessage.displayName = "ChatMessage";

// Add a new component for displaying references at the bottom of messages
const BrowsingReferences = memo(({ sources, query }: { sources?: any[], query?: string }) => {
  if (!sources || sources.length === 0) return null;
  
  // Separate text and image sources
  const textSources = sources.filter(s => s.source !== 'tavily_image');
  const imageSources = sources.filter(s => s.source === 'tavily_image');
  
  return (
    <div className="mt-6 pt-3 border-t border-muted">
      {query && (
        <div className="text-xs text-muted-foreground mb-2">
          Search query: <span className="font-medium">{query}</span>
        </div>
      )}

      {/* Text sources as a list with title and snippet */}
      {textSources.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2">Web Sources</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {textSources.map((source, index) => (
              <a 
                key={`ref-${index}`}
                href={source.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="group p-3 rounded-lg border bg-background/50 hover:bg-muted/50 transition-colors flex flex-col"
              >
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs text-primary font-medium">{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-medium truncate group-hover:text-primary transition-colors">{source.title || `Source ${index + 1}`}</h5>
                    <p className="text-xs text-muted-foreground truncate">{source.url}</p>
                  </div>
                </div>
                {source.snippet && (
                  <p className="text-xs text-foreground/70 mt-2 line-clamp-2">{source.snippet}</p>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
      
      {/* Image sources as a responsive grid gallery */}
      {imageSources.length > 0 && (
        <div className="mt-3">
          <h4 className="text-sm font-medium mb-2">Image Results</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {imageSources.map((source, index) => (
              <a 
                key={`img-${index}`}
                href={source.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="relative group rounded-md overflow-hidden border hover:border-primary/50 transition-colors aspect-square"
              >
                <img 
                  src={source.url} 
                  alt={source.title || `Image ${index + 1}`}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                  <p className="text-xs font-medium text-foreground truncate w-full">
                    {source.title || `Image ${index + 1}`}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
BrowsingReferences.displayName = "BrowsingReferences";

