"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"

interface FilePreviewProps {
  content: string
  fileType: string
  className?: string
}

export function FilePreview({ content, fileType, className }: FilePreviewProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  // Function to render HTML safely
  const renderHtml = () => {
    return (
      <div 
        className="w-full h-full overflow-auto bg-white dark:bg-black rounded-md"
        style={{ height: "calc(100% - 2px)" }}
      >
        <iframe
          srcDoc={content}
          title="HTML Preview"
          className="w-full h-full border-0"
          sandbox="allow-scripts"
        />
      </div>
    )
  }

  // Function to render markdown
  const renderMarkdown = () => {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none p-4 overflow-auto h-full">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {content}
        </ReactMarkdown>
      </div>
    )
  }

  // Function to render image
  const renderImage = () => {
    // For data URLs or direct image paths
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-900 p-4 overflow-auto">
        {content.startsWith("data:") || content.match(/^https?:\/\//) ? (
          <div className="relative max-w-full max-h-full">
            <img
              src={content}
              alt="Image preview"
              className="max-w-full max-h-[calc(100vh-200px)] object-contain"
            />
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            <p>Image preview not available</p>
            <p className="text-sm mt-2">Only data URLs and remote images can be previewed</p>
          </div>
        )}
      </div>
    )
  }

  // Function to render JSON
  const renderJson = () => {
    try {
      const formattedJson = JSON.stringify(JSON.parse(content), null, 2)
      return (
        <div className="p-4 font-mono text-sm whitespace-pre overflow-auto h-full bg-muted/30">
          <pre>{formattedJson}</pre>
        </div>
      )
    } catch (e) {
      return <div className="p-4 text-red-500">Invalid JSON</div>
    }
  }

  // Function to render plain text
  const renderText = () => {
    return (
      <div className="p-4 font-mono text-sm whitespace-pre-wrap overflow-auto h-full">
        {content}
      </div>
    )
  }

  // Function to render CSV
  const renderCsv = () => {
    try {
      const rows = content.split("\n").map((row) => row.split(","))
      return (
        <div className="p-4 overflow-auto h-full">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {rows[0]?.map((header, i) => (
                  <th key={i} className="border border-border p-2 text-sm font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(1).map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} className="border border-border p-2 text-sm">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    } catch (e) {
      return renderText()
    }
  }

  // Determine what type of preview to render based on file type
  const renderPreview = () => {
    switch (fileType.toLowerCase()) {
      case "html":
        return renderHtml()
      case "markdown":
      case "md":
        return renderMarkdown()
      case "json":
        return renderJson()
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
      case "svg":
      case "webp":
        return renderImage()
      case "csv":
        return renderCsv()
      default:
        return renderText()
    }
  }

  return (
    <div className={cn("w-full h-full bg-background", className)}>
      {renderPreview()}
    </div>
  )
} 