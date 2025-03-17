"use client"

import * as React from "react"
import Editor from "@monaco-editor/react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"

interface CodeEditorProps {
  value: string
  language?: string
  onChange?: (value: string) => void
  readOnly?: boolean
  className?: string
}

export function CodeEditor({ value, language = "javascript", onChange, readOnly = false, className }: CodeEditorProps) {
  const { resolvedTheme } = useTheme()
  const theme = resolvedTheme === "dark" ? "vs-dark" : "light"

  // Map common file extensions to languages
  const getLanguageFromExtension = (ext?: string): string => {
    if (!ext) return "javascript"

    const mapping: Record<string, string> = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      html: "html",
      css: "css",
      json: "json",
      md: "markdown",
      py: "python",
      rb: "ruby",
      go: "go",
      java: "java",
      php: "php",
      rs: "rust",
      c: "c",
      cpp: "cpp",
      cs: "csharp",
      swift: "swift",
      sh: "shell",
      yml: "yaml",
      yaml: "yaml",
      sql: "sql",
      // Additional mappings
      vue: "vue",
      svelte: "svelte",
      dart: "dart",
      kt: "kotlin",
      scala: "scala",
      lua: "lua",
      pl: "perl",
      r: "r",
      xml: "xml",
      scss: "scss",
      sass: "sass",
      less: "less",
      graphql: "graphql",
      dockerfile: "dockerfile",
      tf: "terraform",
      hcl: "hcl",
      toml: "toml",
      ini: "ini",
      bat: "bat",
      ps1: "powershell",
      tex: "latex"
    }

    return mapping[ext.toLowerCase()] || "plaintext"
  }

  const editorLanguage = React.useMemo(() => {
    // If language is provided, use that
    if (language) return language

    // Otherwise try to infer from file extension
    // Assuming language might be a file extension or path
    const ext = language.split(".").pop()
    return getLanguageFromExtension(ext)
  }, [language])

  const handleEditorChange = (value: string | undefined) => {
    if (onChange && value !== undefined) {
      onChange(value)
    }
  }

  return (
    <div className={cn("h-full w-full border-0 overflow-hidden", className)}>
      <Editor
        value={value}
        language={editorLanguage}
        theme={theme}
        onChange={handleEditorChange}
        options={{
          readOnly,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: "on",
          glyphMargin: false,
          folding: true,
          lineDecorationsWidth: 10,
          lineNumbersMinChars: 3,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: "on",
          wrappingStrategy: "advanced",
          wrappingIndent: "same",
          formatOnPaste: true,
          scrollbar: {
            vertical: "visible",
            horizontal: "visible",
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
        }}
        loading={
          <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        }
      />
    </div>
  )
}

