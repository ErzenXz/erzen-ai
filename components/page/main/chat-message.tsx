"use client"

import { Message } from "ai/react"
import { User, Bot, Check, Copy } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { memo, useState, useEffect } from "react"
import { MarkdownRenderer } from "@/components/chat/Message/MarkdownRenderer"
import { CollapsibleUserMessage } from "@/components/chat/Message/CollapsibleUserMessage"
import { LoadingIndicator } from "@/components/chat/Message/LoadingIndicator"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"

interface ChatMessageProps {
  message: Message
}

export const ChatMessage = memo(function ChatMessage({
  message,
}: Readonly<ChatMessageProps>) {
  const { role, content } = message
  const isUser = role === "user"
  const isAssistant = role === "assistant"
  const isLoading = isAssistant && !content
  const [copied, setCopied] = useState(false)
  const [isDarkTheme, setIsDarkTheme] = useState(false)

  useEffect(() => {
    // Check for dark theme
    const isDark = document.documentElement.classList.contains('dark') || 
                   document.documentElement.getAttribute('data-theme') === 'dark'
    setIsDarkTheme(isDark)
  }, [])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      },
      (err) => console.error("Could not copy text: ", err)
    )
  }

  const Avatar = isUser ? User : Bot;

  const renderContent = () => {
    if (isLoading) {
      return <LoadingIndicator />
    }
    if (content) {
       if (isUser) {
        return <CollapsibleUserMessage 
                  content={content} 
                  isDarkTheme={isDarkTheme}
                  remarkPlugins={[remarkGfm, remarkMath]}
                  copyToClipboard={copyToClipboard}
                  copied={copied}
               />
      }
      return <MarkdownRenderer 
                content={content} 
                isDarkTheme={isDarkTheme}
                remarkPlugins={[remarkGfm, remarkMath]}
                copyToClipboard={copyToClipboard}
                copied={copied}
             />
    }
    return null;
  }

  return (
    <div className={cn("group relative mb-4 flex items-start gap-4")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
          isUser ? "bg-background" : "bg-primary text-primary-foreground"
        )}
      >
        <Avatar className={cn(isUser ? "h-5 w-5" : "h-6 w-6")} />
      </div>

      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{isUser ? "You" : "ErzenAI"}</span>
        </div>
        
        <div className="prose prose-neutral prose-sm dark:prose-invert max-w-none break-words">
            {renderContent()}
        </div>

        {isAssistant && content && !isLoading && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(content)}>
                                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        )}
      </div>
    </div>
  )
}) 