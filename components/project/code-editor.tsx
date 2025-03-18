"use client"

import * as React from "react"
import Editor, { Monaco } from "@monaco-editor/react"
import { Loader2, Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import * as monaco from "monaco-editor"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

interface CodeEditorProps {
  value: string
  language?: string
  onChange?: (value: string) => void
  readOnly?: boolean
  className?: string
}

// Define available themes
type ThemeOption = {
  value: string
  label: string
  monacoTheme: string
}

const themes: ThemeOption[] = [
  { value: "system", label: "System", monacoTheme: "system" },
  { value: "light", label: "Light", monacoTheme: "light" },
  { value: "dark", label: "Dark", monacoTheme: "vs-dark" },
  { value: "github-light", label: "GitHub Light", monacoTheme: "github-light" },
  { value: "github-dark", label: "GitHub Dark", monacoTheme: "github-dark" },
  { value: "v0", label: "V0", monacoTheme: "v0" },
]

export function CodeEditor({ value, language = "javascript", onChange, readOnly = false, className }: CodeEditorProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [selectedTheme, setSelectedTheme] = React.useState<ThemeOption>(
    themes.find(t => t.value === "system") || themes[0]
  )
  const [monacoInstance, setMonacoInstance] = React.useState<Monaco | null>(null)
  const [open, setOpen] = React.useState(false)

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

  // Define custom themes when Monaco is available
  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) => {
    setMonacoInstance(monaco)

    // Define GitHub Light theme
    monaco.editor.defineTheme('github-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6a737d' },
        { token: 'keyword', foreground: 'd73a49' },
        { token: 'string', foreground: '032f62' },
        { token: 'number', foreground: '005cc5' },
        { token: 'type', foreground: '6f42c1' },
      ],
      colors: {
        'editor.foreground': '#24292e',
        'editor.background': '#ffffff',
        'editor.lineHighlightBackground': '#f1f8ff',
        'editorLineNumber.foreground': '#1b1f234d',
        'editorLineNumber.activeForeground': '#24292e',
        'editor.selectionBackground': '#0366d625',
        'editor.inactiveSelectionBackground': '#0366d610',
        'editorCursor.foreground': '#24292e',
      }
    });

    // Define GitHub Dark theme
    monaco.editor.defineTheme('github-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '8b949e' },
        { token: 'keyword', foreground: 'ff7b72' },
        { token: 'string', foreground: 'a5d6ff' },
        { token: 'number', foreground: '79c0ff' },
        { token: 'type', foreground: 'd2a8ff' },
      ],
      colors: {
        'editor.foreground': '#c9d1d9',
        'editor.background': '#0d1117',
        'editor.lineHighlightBackground': '#161b22',
        'editorLineNumber.foreground': '#8b949e',
        'editorLineNumber.activeForeground': '#c9d1d9',
        'editor.selectionBackground': '#3392FF44',
        'editor.inactiveSelectionBackground': '#3392FF22',
        'editorCursor.foreground': '#c9d1d9',
      }
    });

    // Define V0 theme (inspired by Vercel's design)
    monaco.editor.defineTheme('v0', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6c7380' },
        { token: 'keyword', foreground: 'ff5d5b' },
        { token: 'string', foreground: '8db7fe' },
        { token: 'number', foreground: 'c192ff' },
        { token: 'type', foreground: '00d2fc' },
      ],
      colors: {
        'editor.foreground': '#e4e4e4',
        'editor.background': '#000000',
        'editor.lineHighlightBackground': '#101010',
        'editorLineNumber.foreground': '#515161',
        'editorLineNumber.activeForeground': '#c7c7c7',
        'editor.selectionBackground': '#303347',
        'editor.inactiveSelectionBackground': '#20212e',
        'editorCursor.foreground': '#ffffff',
      }
    });

    // Set the selected theme
    const themeToUse = selectedTheme.value === 'system'
      ? resolvedTheme === 'dark' ? 'github-dark' : 'github-light'
      : selectedTheme.monacoTheme;
    
    monaco.editor.setTheme(themeToUse);

    // Enable better bracket colorization
    editor.updateOptions({
      bracketPairColorization: {
        enabled: true,
      }
    });
  };

  // Update theme when it changes
  React.useEffect(() => {
    if (monacoInstance) {
      const themeToUse = selectedTheme.value === 'system'
        ? resolvedTheme === 'dark' ? 'github-dark' : 'github-light'
        : selectedTheme.monacoTheme;
      
      monacoInstance.editor.setTheme(themeToUse);
    }
  }, [selectedTheme, resolvedTheme, monacoInstance]);

  const handleSelectTheme = (theme: ThemeOption) => {
    setSelectedTheme(theme)
    setOpen(false)
    if (theme.value !== 'system' && theme.value !== 'light' && theme.value !== 'dark') {
      // Only set the theme in next-themes if it's a basic theme
      return
    }
    setTheme(theme.value)
  }

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex justify-end items-center p-2 border-b">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" aria-expanded={open} className="w-48 justify-between">
              {selectedTheme.label}
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-0">
            <Command>
              <CommandInput placeholder="Search theme..." />
              <CommandList>
                <CommandEmpty>No theme found.</CommandEmpty>
                <CommandGroup>
                  {themes.map((theme) => (
                    <CommandItem
                      key={theme.value}
                      value={theme.value}
                      onSelect={() => handleSelectTheme(theme)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedTheme.value === theme.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {theme.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      <div className={cn("flex-1 overflow-hidden", className)}>
        <Editor
          value={value}
          language={editorLanguage}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            readOnly,
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            lineNumbers: "on",
            glyphMargin: true,
            folding: true,
            foldingHighlight: true,
            foldingStrategy: "auto",
            showFoldingControls: "always",
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 3,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: "on",
            wrappingStrategy: "advanced",
            wrappingIndent: "same",
            formatOnPaste: true,
            formatOnType: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            smoothScrolling: true,
            mouseWheelZoom: true,
            bracketPairColorization: {
              enabled: true,
            },
            guides: {
              bracketPairs: true,
              indentation: true,
              highlightActiveIndentation: true,
            },
            renderLineHighlight: "all",
            contextmenu: true,
            scrollbar: {
              vertical: "visible", 
              horizontal: "visible",
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
              useShadows: true,
            },
          }}
          loading={
            <div className="flex h-full w-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          }
        />
      </div>
    </div>
  )
}

