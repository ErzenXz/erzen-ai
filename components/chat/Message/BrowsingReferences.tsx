"use client"

import { memo } from "react"

interface Props {
  sources?: any[]
  query?: string
}

export const BrowsingReferences = memo(function BrowsingReferences({ sources, query }: Props) {
  if (!sources || sources.length === 0) return null

  const textSources = sources.filter((s) => s.source !== "tavily_image")
  const imageSources = sources.filter((s) => s.source === "tavily_image")

  return (
    <div className="mt-6 pt-3 border-t border-muted">
      {query && (
        <div className="text-xs text-muted-foreground mb-2">
          Search query: <span className="font-medium">{query}</span>
        </div>
      )}
      {textSources.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2">Web Sources</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {textSources.map((src, i) => (
              <a
                key={`ref-${i}`}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group p-3 rounded-lg border bg-background/50 hover:bg-muted/50 transition-colors flex flex-col"
              >
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs text-primary font-medium">{i + 1}</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {src.title || `Source ${i + 1}`}
                    </h5>
                    <p className="text-xs text-muted-foreground truncate">{src.url}</p>
                  </div>
                </div>
                {src.snippet && <p className="text-xs text-foreground/70 mt-2 line-clamp-2">{src.snippet}</p>}
              </a>
            ))}
          </div>
        </div>
      )}
      {imageSources.length > 0 && (
        <div className="mt-3">
          <h4 className="text-sm font-medium mb-2">Image Results</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {imageSources.map((src, i) => (
              <a
                key={`img-${i}`}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative group rounded-md overflow-hidden border hover:border-primary/50 transition-colors aspect-square"
              >
                <img src={src.url} alt={src.title || `Image ${i + 1}`} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                  <p className="text-xs font-medium text-foreground truncate w-full">{src.title || `Image ${i + 1}`}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}) 