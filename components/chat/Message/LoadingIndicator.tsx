"use client"

import { memo } from "react"

// Simple animated dots indicator used while assistant is generating.
export const LoadingIndicator = memo(function LoadingIndicator() {
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
}) 