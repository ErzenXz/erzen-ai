"use client"

import { memo, useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, Check, Loader2, SkipForward, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface BrowsingStatusProps {
  status: string
  searchQuery?: string
  progress?: number
  message?: any
  references?: any
}

export const BrowsingStatus = memo(function BrowsingStatus({ status, searchQuery, progress, message, references }: BrowsingStatusProps) {
  const [expanded, setExpanded] = useState(false)
  const searchHistory = message?.history || []

  const getMessage = (currentStatus: string) => {
    switch (currentStatus) {
      case "started":
        return `Started web search for "${searchQuery}"`
      case "analyzing":
        return "Analyzing query and planning search strategy..."
      case "searching":
        return `Searching the web for "${searchQuery}"...`
      case "tavily_results":
        return "Processing search results..."
      case "usage_info":
        return "Checking usage information..."
      case "skipped":
        return "Web search skipped"
      case "completed":
        return "Web search completed"
      case "error":
        return "Error occurred during web search"
      default:
        return `Processing ${currentStatus}...`
    }
  }

  if (!status) return null
  const isCompleted = ["completed", "skipped", "error"].includes(status)
  const hasReferences = references && references.length > 0

  return (
    <div className="mt-4 border rounded-lg overflow-hidden bg-accent/30">
      <div className="p-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex-shrink-0">
            {isCompleted ? (
              status === "error" ? (
                <X className="h-4 w-4 text-destructive" />
              ) : status === "skipped" ? (
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
                {hasReferences ? `Found ${references.length} sources` : `Query: "${searchQuery}"`}
              </p>
            )}
          </div>
        </div>
        {searchHistory.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-full"
            onClick={() => setExpanded(!expanded)}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                expanded && "rotate-180"
              )}
            />
            <span className="sr-only">Toggle search history</span>
          </Button>
        )}
      </div>
      {expanded && searchHistory.length > 0 && (
        <div className="px-4 pb-3 pt-1">
          <div className="relative border-l border-muted pl-4 space-y-2">
            {searchHistory.map((item: { status: string; timestamp: string }, idx: number) => (
              <div key={`history-${idx}`} className="relative">
                <div
                  className="absolute -left-6 top-1 h-3 w-3 rounded-full border-2 border-background"
                  style={{
                    backgroundColor: ["completed", "error", "skipped"].includes(item.status)
                      ? item.status === "error"
                        ? "var(--destructive)"
                        : item.status === "skipped"
                        ? "var(--muted)"
                        : "var(--primary)"
                      : "var(--muted-foreground)",
                  }}
                />
                <div className="text-xs">
                  <span className="text-muted-foreground mr-1">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="font-medium">{getMessage(item.status)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {status === "searching" && typeof progress === "number" && (
        <div className="h-1 bg-primary/20">
          <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  )
}) 