"use client"

import { memo, useState, useMemo } from "react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

// Stand-alone ThinkingContent component extracted from ChatMessage.
// It renders a collapsible panel that shows the model's hidden reasoning / thinking text.
// Usage:
//   <ThinkingContent content={someString} />
// The UI and behaviour remain identical to the previous inline version.

interface ThinkingContentProps {
  content: string
}

export const ThinkingContent = memo(function ThinkingContent({ content }: ThinkingContentProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Clean up content by removing any stray HTML-like tags and normalise whitespace
  const cleanedContent = useMemo(() => {
    return content
      .replace(/<\/?(?:think|reasoning)>/gi, "") // strip any leftover tags
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  }, [content])

  // Create a short preview (last 3 lines or first 50 chars)
  const previewContent = useMemo(() => {
    const lines = cleanedContent.split("\n").filter((l) => l.trim().length > 0)
    if (lines.length <= 1) {
      const first = lines[0] ?? ""
      return first.length > 50 ? first.substring(0, 50) + "…" : first
    }
    const lastLines = lines.slice(-3)
    return lastLines
      .map((l) => (l.length > 50 ? l.substring(0, 50) + "…" : l))
      .join("\n")
  }, [cleanedContent])

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="relative mb-3 transition-all duration-300">
      <div className="bg-gradient-to-br from-primary/5 via-muted/30 to-background backdrop-blur-sm border border-primary/10 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 dark:from-primary/10 dark:via-muted/20 dark:to-background/80">
        <div className="flex items-center gap-2">
          <div className="relative h-3 w-3">
            <div
              className="absolute inset-0 rounded-full bg-primary/30 animate-ping opacity-75"
              style={{ animationDuration: "3s" }}
            />
            <div
              className="relative h-3 w-3 rounded-full bg-primary/60 animate-pulse"
              style={{ animationDuration: "2s" }}
            />
          </div>
          <span className="text-sm font-medium bg-gradient-to-r from-primary/90 via-primary/80 to-primary/70 bg-clip-text text-transparent">
            Thinking
          </span>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2 ml-auto rounded-full hover:bg-primary/10 transition-all">
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
                <p key={`line-${i}`} className={cn(line.trim() === "" && "h-2")}>{line}</p>
              ))}
            </div>
          </div>
        </CollapsibleContent>

        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/5 to-transparent rounded-full -z-10 opacity-60 blur-xl" />
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-primary/5 to-transparent rounded-full -z-10 opacity-60 blur-lg" />
      </div>
    </Collapsible>
  )
}) 