"use client"

import type { Message } from "@/lib/types"
import { User, Bot, Check, Copy, Clock } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark, oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism"
import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ChatMessageProps {
  message: Message
  isLast?: boolean
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

export function ChatMessage({ message, isLast }: ChatMessageProps) {
  const messageRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const isDarkTheme = document.documentElement.classList.contains("dark")

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const normalizeContent = (content: string) => {
    return content.replace(/\n$/, "")
  }

  useEffect(() => {
    if (isLast && messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: "smooth", block: "end" })
    }
  }, [isLast])

  return (
    <TooltipProvider>
      <div ref={messageRef} className="flex gap-4 px-4 py-6 relative group transition-colors duration-200">
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
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto h-8 w-8"
              onClick={() => copyToClipboard(message.content || "")}
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              <span className="sr-only">Copy message</span>
            </Button>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-full [&_p]:whitespace-pre-wrap [&_p]:mb-0">
            {message.content ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
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
                          style={isDarkTheme ? darkTheme : lightTheme  as any}
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
                {normalizeContent(message.content)}
              </ReactMarkdown>
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

