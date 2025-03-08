"use client"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Bold, Italic, Code, List, ListOrdered, Quote, Link, Heading1, Heading2, Strikethrough } from "lucide-react"

interface FormatToolbarProps {
  onFormat: (format: string) => void
}

export function FormatToolbar({ onFormat }: FormatToolbarProps) {
  const formatOptions = [
    {
      id: "bold",
      icon: <Bold className="h-4 w-4" />,
      tooltip: "Bold (Ctrl+B)",
      format: "**",
      description: "Bold text",
      category: "text",
    },
    {
      id: "italic",
      icon: <Italic className="h-4 w-4" />,
      tooltip: "Italic (Ctrl+I)",
      format: "_",
      description: "Italic text",
      category: "text",
    },
    {
      id: "strikethrough",
      icon: <Strikethrough className="h-4 w-4" />,
      tooltip: "Strikethrough",
      format: "~~",
      description: "Strikethrough text",
      category: "text",
    },
    {
      id: "heading1",
      icon: <Heading1 className="h-4 w-4" />,
      tooltip: "Heading 1",
      format: "# ",
      description: "Heading 1",
      category: "heading",
    },
    {
      id: "heading2",
      icon: <Heading2 className="h-4 w-4" />,
      tooltip: "Heading 2",
      format: "## ",
      description: "Heading 2",
      category: "heading",
    },
    {
      id: "code",
      icon: <Code className="h-4 w-4" />,
      tooltip: "Code (Ctrl+E)",
      format: "`",
      description: "Inline code",
      category: "code",
    },
    {
      id: "codeblock",
      icon: <Code className="h-4 w-4 rotate-90" />,
      tooltip: "Code Block",
      format: "```\n",
      description: "Code block",
      category: "code",
    },
    {
      id: "bullet",
      icon: <List className="h-4 w-4" />,
      tooltip: "Bullet List",
      format: "- ",
      description: "Bullet list",
      category: "list",
    },
    {
      id: "numbered",
      icon: <ListOrdered className="h-4 w-4" />,
      tooltip: "Numbered List",
      format: "1. ",
      description: "Numbered list",
      category: "list",
    },
    {
      id: "quote",
      icon: <Quote className="h-4 w-4" />,
      tooltip: "Quote",
      format: "> ",
      description: "Blockquote",
      category: "other",
    },
    {
      id: "link",
      icon: <Link className="h-4 w-4" />,
      tooltip: "Link (Ctrl+K)",
      format: "[](url)",
      description: "Insert link",
      category: "other",
    },
  ]

  // Group options by category
  const textFormatting = formatOptions.filter((opt) => opt.category === "text")
  const headingFormatting = formatOptions.filter((opt) => opt.category === "heading")
  const codeFormatting = formatOptions.filter((opt) => opt.category === "code")
  const listFormatting = formatOptions.filter((opt) => opt.category === "list")
  const otherFormatting = formatOptions.filter((opt) => opt.category === "other")

  const renderFormatButton = (option: (typeof formatOptions)[0]) => (
    <Tooltip key={option.id}>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-md hover:bg-muted/80 hover:text-primary"
          onClick={() => onFormat(option.format)}
          aria-label={option.description}
        >
          {option.icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {option.tooltip}
      </TooltipContent>
    </Tooltip>
  )

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-wrap items-center gap-1 p-2 rounded-md bg-background border shadow-sm">
        <div className="flex items-center">{textFormatting.map(renderFormatButton)}</div>

        <div className="h-6 w-px bg-border mx-1"></div>

        <div className="flex items-center">{headingFormatting.map(renderFormatButton)}</div>

        <div className="h-6 w-px bg-border mx-1"></div>

        <div className="flex items-center">{codeFormatting.map(renderFormatButton)}</div>

        <div className="h-6 w-px bg-border mx-1"></div>

        <div className="flex items-center">{listFormatting.map(renderFormatButton)}</div>

        <div className="h-6 w-px bg-border mx-1"></div>

        <div className="flex items-center">{otherFormatting.map(renderFormatButton)}</div>
      </div>
    </TooltipProvider>
  )
}

