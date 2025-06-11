"use client"

import { memo, useMemo } from "react"
import ReactMarkdown from "react-markdown"
import rehypeKatex from "rehype-katex"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, Copy } from "lucide-react"
import { oneDark, oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism"
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter"
import dedent from "dedent"
import { cn } from "@/lib/utils"

// Themes synced with original file
const lightTheme = {
  ...oneLight,
  'pre[class*="language-"]': { ...oneLight['pre[class*="language-"]'], background: 'hsl(var(--muted))' },
  'code[class*="language-"]': { ...oneLight['code[class*="language-"]'], background: 'hsl(var(--muted))' },
}
const darkTheme = {
  ...oneDark,
  'pre[class*="language-"]': { ...oneDark['pre[class*="language-"]'], background: 'hsl(var(--muted))' },
  'code[class*="language-"]': { ...oneDark['code[class*="language-"]'], background: 'hsl(var(--muted))' },
}

interface Props {
  content: string
  isDarkTheme: boolean
  remarkPlugins: any[]
  copyToClipboard: (text: string) => void
  copied: boolean
}

export const MarkdownRenderer = memo(function MarkdownRenderer({ content, isDarkTheme, remarkPlugins, copyToClipboard, copied }: Props) {
  const normalized = useMemo(() => dedent(content).replace(/\n{3,}/g, "\n\n").replace(/\n+$/, "\n"), [content])

  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={[rehypeKatex]}
      className="prose-content"
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className ?? '')
          const code = String(children).replace(/\n$/, '')
          return match ? (
            <Card className="relative overflow-hidden my-4">
              <div className="absolute right-2 top-2 z-10">
                <Button variant="secondary" size="icon" className="h-7 w-7 bg-background/50 backdrop-blur-sm" onClick={() => copyToClipboard(code)}>
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  <span className="sr-only">Copy code</span>
                </Button>
              </div>
              <div className="flex items-center gap-2 px-4 py-1.5 border-b bg-muted/50">
                <span className="text-xs font-medium text-muted-foreground">{match[1].toUpperCase()}</span>
              </div>
              {/* @ts-ignore */}
              <SyntaxHighlighter
                language={match[1]}
                style={isDarkTheme ? darkTheme : (lightTheme as any)}
                customStyle={{
                  margin: 0,
                  padding: '1rem',
                  fontSize: '0.875rem',
                  borderRadius: '0 0 0.5rem 0.5rem',
                  background: 'transparent',
                }}
                codeTagProps={{
                  style: {
                    fontSize: '0.875rem',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace',
                  },
                }}
                {...props}
              >
                {code}
              </SyntaxHighlighter>
            </Card>
          ) : (
            <code className={cn('bg-muted px-1.5 py-0.5 rounded-md text-sm font-mono', className)} {...props}>
              {children}
            </code>
          )
        },
      }}
    >
      {normalized}
    </ReactMarkdown>
  )
}) 