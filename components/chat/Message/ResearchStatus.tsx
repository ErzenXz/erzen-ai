"use client"

import { memo, useState } from "react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"

interface ResearchStatusProps {
  status: any
}

// Displays progress of the agent's autonomous research flow.
export const ResearchStatus = memo(function ResearchStatus({ status }: ResearchStatusProps) {
  const [isOpen, setIsOpen] = useState(true)
  if (!status) return null

  let statusMessage = ""
  let detailMessage = ""
  switch (status.status) {
    case "started":
      statusMessage = "Research initiated"
      detailMessage = status.message || "Starting research process..."
      break
    case "generating_queries":
      statusMessage = "Generating search queries"
      detailMessage = status.message || "Creating optimal search queries based on your question..."
      break
    case "queries_generated":
      statusMessage = `Generated ${status.queries?.length || 0} search queries`
      detailMessage = status.queries ? status.queries.join(", ") : ""
      break
    case "searching":
      statusMessage = "Searching"
      detailMessage = status.message || `Searching for "${status.currentQuery}"`
      break
    case "search_complete":
      statusMessage = "Search completed"
      detailMessage = status.message || `Found ${status.count || 0} results`
      break
    case "processing":
      statusMessage = "Processing research"
      detailMessage = status.message || `Processing ${status.count || 0} sources...`
      break
    case "complete":
      statusMessage = "Research completed"
      detailMessage = status.message || "Finished research. Generating response..."
      break
    case "error":
      statusMessage = "Research error"
      detailMessage = status.message || status.error || "An error occurred during research."
      break
    default:
      statusMessage = "Researching"
      detailMessage = status.message || "Finding information..."
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="my-4">
      <div className="relative bg-muted/30 rounded-lg p-3 overflow-hidden">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            {/* inline icon */}
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
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
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
              {status.sources && status.sources.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium text-xs text-muted-foreground mb-1">Sources:</p>
                  <ul className="list-disc pl-4 text-xs space-y-1">
                    {status.sources.map((source: any, idx: number) => (
                      <li key={`src-${idx}`}>
                        {source.title} {" "}
                        {source.url && (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline"
                          >
                            Link
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>

        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/5 to-transparent rounded-full -z-10 opacity-60 blur-xl" />
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-primary/5 to-transparent rounded-full -z-10 opacity-60 blur-lg" />
      </div>
    </Collapsible>
  )
}) 