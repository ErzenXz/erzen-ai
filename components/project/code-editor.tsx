"use client"

import * as React from "react"
import Editor, { Monaco } from "@monaco-editor/react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import * as monaco from "monaco-editor"

interface CodeEditorProps {
  value: string
  language?: string
  onChange?: (value: string) => void
  readOnly?: boolean
  className?: string
  theme?: string
}

// Define available themes
export type ThemeOption = {
  value: string
  label: string
  monacoTheme: string
}

export const editorThemes: ThemeOption[] = [
  { value: "system", label: "System", monacoTheme: "system" },
  { value: "light", label: "Light", monacoTheme: "light" },
  { value: "dark", label: "Dark", monacoTheme: "vs-dark" },
  { value: "black", label: "Black", monacoTheme: "v0" },
  { value: "github-light", label: "GitHub Light", monacoTheme: "github-light" },
  { value: "github-dark", label: "GitHub Dark", monacoTheme: "github-dark" },
  { value: "monokai", label: "Monokai", monacoTheme: "monokai" },
  { value: "dracula", label: "Dracula", monacoTheme: "dracula" },
  { value: "nord", label: "Nord", monacoTheme: "nord" },
  { value: "solarized-dark", label: "Solarized Dark", monacoTheme: "solarized-dark" },
  { value: "solarized-light", label: "Solarized Light", monacoTheme: "solarized-light" },
]

export function CodeEditor({ value, language = "javascript", onChange, readOnly = false, className, theme }: CodeEditorProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [selectedTheme, setSelectedTheme] = React.useState<ThemeOption>(
    editorThemes.find(t => t.value === "black") || editorThemes[0]
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

    // Register custom themes
    monaco.editor.defineTheme('github-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#24292e',
        'editor.lineHighlightBackground': '#f1f8ff',
        'editorLineNumber.foreground': '#1b1f234d',
        'editorLineNumber.activeForeground': '#24292e',
      }
    });

    monaco.editor.defineTheme('github-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#0d1117',
        'editor.foreground': '#c9d1d9',
        'editor.lineHighlightBackground': '#161b22',
        'editorLineNumber.foreground': '#8b949e',
        'editorLineNumber.activeForeground': '#c9d1d9',
      }
    });

    monaco.editor.defineTheme('monokai', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '#f92672' },
        { token: 'string', foreground: '#e6db74' },
        { token: 'comment', foreground: '#75715e' },
      ],
      colors: {
        'editor.background': '#272822',
        'editor.foreground': '#f8f8f2',
      }
    });

    monaco.editor.defineTheme('dracula', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '#ff79c6' },
        { token: 'string', foreground: '#f1fa8c' },
        { token: 'comment', foreground: '#6272a4' },
      ],
      colors: {
        'editor.background': '#282a36',
        'editor.foreground': '#f8f8f2',
      }
    });

    monaco.editor.defineTheme('nord', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#2e3440',
        'editor.foreground': '#d8dee9',
        'editor.lineHighlightBackground': '#3b4252',
      }
    });

    monaco.editor.defineTheme('solarized-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#002b36',
        'editor.foreground': '#839496',
        'editor.lineHighlightBackground': '#073642',
      }
    });

    monaco.editor.defineTheme('solarized-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#fdf6e3',
        'editor.foreground': '#657b83',
        'editor.lineHighlightBackground': '#eee8d5',
      }
    });

    // Original v0 theme with a black background
    monaco.editor.defineTheme('v0', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#000000',
        'editor.foreground': '#ffffff',
      }
    });

    // Set the selected theme
    const themeToUse = theme ? theme :
      selectedTheme.value === 'system'
        ? resolvedTheme === 'dark' ? 'vs-dark' : 'light'
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
      // Set the selected theme
      const themeToUse = theme ? theme :
        selectedTheme.value === 'system'
          ? resolvedTheme === 'dark' ? 'vs-dark' : 'light'
          : selectedTheme.monacoTheme;
      
      monacoInstance.editor.setTheme(themeToUse);
    }
  }, [monacoInstance, selectedTheme, resolvedTheme, theme]);

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
    <div className={cn("h-full w-full overflow-hidden", className)}>
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
  )
}

