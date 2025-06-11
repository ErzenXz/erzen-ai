"use client"

import { memo, useMemo, useState } from "react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"
import { MarkdownRenderer } from "./MarkdownRenderer"

interface Props {
  content: string
  isDarkTheme: boolean
  remarkPlugins: any[]
  copyToClipboard: (text: string) => void
  copied: boolean
}

export const CollapsibleUserMessage = memo(function CollapsibleUserMessage({ content, isDarkTheme, remarkPlugins, copyToClipboard, copied }: Props) {
  const [isExpanded, setIsExpanded] = useState(false)
  const contentLength = content.length
  const COLLAPSE_THRESHOLD = 800
  const PREVIEW_LENGTH = 400
  const shouldCollapse = contentLength > COLLAPSE_THRESHOLD

  const previewContent = useMemo(() => {
    if (!shouldCollapse) return content
    let preview = content.substring(0, PREVIEW_LENGTH)
    const lastPeriod = preview.lastIndexOf('.')
    const lastNewline = preview.lastIndexOf('\n')
    let breakpoint = PREVIEW_LENGTH
    if (lastPeriod > breakpoint * 0.7) breakpoint = lastPeriod + 1
    else if (lastNewline > breakpoint * 0.7) breakpoint = lastNewline
    return content.substring(0, breakpoint) + '...'
  }, [content, shouldCollapse])

  if (!shouldCollapse) {
    return <MarkdownRenderer content={content} isDarkTheme={isDarkTheme} remarkPlugins={remarkPlugins} copyToClipboard={copyToClipboard} copied={copied} />
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className="relative transition-all duration-300">
      <div className="relative">
        {!isExpanded && (
          <div className="relative">
            <MarkdownRenderer content={previewContent} isDarkTheme={isDarkTheme} remarkPlugins={remarkPlugins} copyToClipboard={copyToClipboard} copied={copied} />
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none" />
          </div>
        )}
        <CollapsibleContent className="transition-all duration-300 ease-in-out">
          <MarkdownRenderer content={content} isDarkTheme={isDarkTheme} remarkPlugins={remarkPlugins} copyToClipboard={copyToClipboard} copied={copied} />
        </CollapsibleContent>
        <div className="flex justify-center mt-2">
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 px-3 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all">
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5 mr-1" /> Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5 mr-1" /> Show more ({Math.round(contentLength / 100) / 10}k characters)
                </>
              )}
            </Button>
          </CollapsibleTrigger>
        </div>
      </div>
    </Collapsible>
  )
}) 