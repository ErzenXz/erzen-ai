import { User, Bot, Wrench, Terminal, Copy, Edit2, RotateCcw, GitBranch, Clock, Zap, Database, Check, X, ChevronDown, ChevronLeft, ChevronRight, Brain, Search, Calculator, CloudRain, FileText, Code, BarChart3, ListTodo, Link, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import remarkEmoji from 'remark-emoji';
import remarkDirective from 'remark-directive';
import remarkFrontmatter from 'remark-frontmatter';
import remarkWikiLink from 'remark-wiki-link';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import dedent from 'dedent';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useState, useMemo, memo, useCallback } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import 'katex/dist/katex.min.css';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface MessageBubbleProps {
  message: {
    _id: Id<"messages">;
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    thinking?: string;
    attachments?: any[];
    toolCalls?: any[];
    toolCallId?: string;
    _creationTime: number;
    conversationId: Id<"conversations">;
    branchId?: string;
    parentMessageId?: Id<"messages">;
    generationMetrics?: {
      provider?: string;
      model?: string;
      tokensUsed?: number;
      promptTokens?: number;
      completionTokens?: number;
      generationTimeMs?: number;
      tokensPerSecond?: number;
      temperature?: number;
      maxTokens?: number;
    };
    isEdited?: boolean;
    editedAt?: number;
    isError?: boolean;
  };
  messagePosition?: number; // Position of this message in the conversation
  currentBranchId?: string; // Current active branch
  isStreaming?: boolean; // Whether this message is currently being streamed
  isSharedView?: boolean; // Whether this is being displayed in a shared conversation (hides interactive buttons)
  onCopyMessage?: (messageId: Id<"messages">) => void | Promise<void>;
  onEditMessage?: (messageId: Id<"messages">, newContent: string) => void | Promise<void>;
  onRetryMessage?: (messageId: Id<"messages">) => void | Promise<void>;
  onBranchOff?: (messageId: Id<"messages">) => void | Promise<void>;
  onSwitchBranch?: (branchId: string) => void;
}

interface ToolCall {
  id: string;
  name: string;
  arguments: string;
  result?: string;
}

// Helper function to group tool calls by name
function groupToolCalls(toolCalls: ToolCall[]): { name: string; count: number; calls: ToolCall[] }[] {
  if (!toolCalls) return [];
  
  const groups: Record<string, { name: string; count: number; calls: ToolCall[] }> = {};

  for (const call of toolCalls) {
    if (!groups[call.name]) {
      groups[call.name] = {
        name: call.name,
        count: 0,
        calls: [],
      };
    }
    groups[call.name].count++;
    groups[call.name].calls.push(call);
  }

  return Object.values(groups);
}

const SYNTAX_HIGHLIGHTER_STYLE = {
  margin: 0,
  padding: '1rem 1rem 1rem 0.75rem',
  background: 'transparent',
  fontSize: '0.875rem',
  lineHeight: '1.6',
};

const LINE_NUMBER_STYLE = {
  minWidth: '2.5em',
  paddingRight: '0.75em',
  color: 'rgb(var(--muted-foreground))',
  marginRight: '0.75em',
  fontSize: '0.75rem',
};

const CodeBlock = memo(({ node, className, children, ...props }: any) => {
  const { theme } = useTheme();
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const codeContent = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(codeContent).catch(err => {
      console.error('Failed to copy code:', err);
    });
  };

  return match ? (
    <div className="my-6 rounded-lg bg-card border border-border/50 overflow-hidden shadow-sm w-full">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border/30">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {language}
        </span>
        <button 
          className="text-xs text-muted-foreground hover:text-foreground transition-all duration-200 px-3 py-1.5 rounded-md hover:bg-background/80 border border-transparent hover:border-border/50 flex items-center gap-1.5"
          onClick={handleCopy}
        >
          <Copy size={12} />
          Copy
        </button>
      </div>
      <div className="relative overflow-x-auto">
        <SyntaxHighlighter
          language={language}
          style={theme === 'dark' ? oneDark : oneLight}
          customStyle={SYNTAX_HIGHLIGHTER_STYLE}
          wrapLines={true}
          wrapLongLines={true}
          showLineNumbers={codeContent.split('\n').length > 5}
          lineNumberStyle={LINE_NUMBER_STYLE}
        >
          {codeContent}
        </SyntaxHighlighter>
      </div>
    </div>
  ) : (
    <code className={cn(
      "text-sm bg-muted/80 text-foreground rounded-lg px-2 py-1 font-mono border border-border/40 font-medium",
      "relative inline-flex items-center break-all",
      "before:content-[''] before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary/5 before:to-accent/5 before:rounded-lg before:-z-10"
    )} {...props}>
      {children}
    </code>
  );
});

// Memoized markdown components to prevent re-creation on every render
const createMarkdownComponents = () => ({
  code: CodeBlock,
  pre: ({ children, ...props }: any) => (
    <pre {...props} className="overflow-hidden">
      {children}
    </pre>
  ),
  // Enhanced headings with better hierarchy and styling
  h1: ({ children, ...props }: any) => (
    <h1 {...props} className="text-3xl font-bold text-foreground mt-8 mb-6 first:mt-0 border-b-2 border-gradient-to-r from-primary to-primary/50 pb-3 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: any) => (
    <h2 {...props} className="text-2xl font-semibold text-foreground mt-7 mb-4 first:mt-0 border-b border-border/50 pb-2">
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: any) => (
    <h3 {...props} className="text-xl font-semibold text-foreground mt-6 mb-3 first:mt-0">
      {children}
    </h3>
  ),
  h4: ({ children, ...props }: any) => (
    <h4 {...props} className="text-lg font-medium text-foreground mt-5 mb-2 first:mt-0">
      {children}
    </h4>
  ),
  h5: ({ children, ...props }: any) => (
    <h5 {...props} className="text-base font-medium text-foreground mt-4 mb-2 first:mt-0">
      {children}
    </h5>
  ),
  h6: ({ children, ...props }: any) => (
    <h6 {...props} className="text-sm font-medium text-muted-foreground mt-3 mb-2 first:mt-0 uppercase tracking-wide">
      {children}
    </h6>
  ),
  // Enhanced paragraphs
  p: ({ children, ...props }: any) => (
    <p {...props} className="text-foreground leading-7 mb-4 last:mb-0 text-[15px]">
      {children}
    </p>
  ),
  // Fixed lists with proper bullets and numbers
  ul: ({ children, ...props }: any) => (
    <ul {...props} className="list-disc list-outside ml-6 mb-6 space-y-1 text-foreground [&>li]:pl-2 [&>li]:marker:text-primary/80">
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: any) => (
    <ol {...props} className="list-decimal list-outside ml-6 mb-6 space-y-1 text-foreground [&>li]:pl-2 [&>li]:marker:text-primary/80 [&>li]:marker:font-medium">
      {children}
    </ol>
  ),
  li: ({ children, ...props }: any) => (
    <li {...props} className="text-foreground leading-relaxed mb-1">
      {children}
    </li>
  ),
  // Enhanced blockquotes
  blockquote: ({ children, ...props }: any) => (
    <blockquote {...props} className="border-l-4 border-l-primary bg-gradient-to-r from-muted/50 to-muted/20 pl-6 pr-4 py-4 my-6 text-muted-foreground italic rounded-r-xl relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent"></div>
      <div className="relative z-10">
        {children}
      </div>
    </blockquote>
  ),
  // Enhanced tables with modern styling
  table: ({ children, ...props }: any) => (
    <div className="overflow-x-auto my-6 rounded-xl border border-border/50 shadow-sm">
      <table {...props} className="min-w-full border-collapse text-foreground text-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }: any) => (
    <thead {...props} className="bg-gradient-to-r from-muted/60 to-muted/40">
      {children}
    </thead>
  ),
  th: ({ children, ...props }: any) => (
    <th {...props} className="border-b border-border/50 px-6 py-4 text-left font-semibold text-foreground first:rounded-tl-xl last:rounded-tr-xl">
      {children}
    </th>
  ),
  tbody: ({ children, ...props }: any) => (
    <tbody {...props} className="divide-y divide-border/30">
      {children}
    </tbody>
  ),
  tr: ({ children, ...props }: any) => (
    <tr {...props} className="hover:bg-muted/30 transition-colors duration-150">
      {children}
    </tr>
  ),
  td: ({ children, ...props }: any) => (
    <td {...props} className="px-6 py-4 text-foreground">
      {children}
    </td>
  ),
  // Enhanced text formatting
  strong: ({ children, ...props }: any) => (
    <strong {...props} className="font-semibold text-foreground">
      {children}
    </strong>
  ),
  em: ({ children, ...props }: any) => (
    <em {...props} className="italic text-foreground">
      {children}
    </em>
  ),
  del: ({ children, ...props }: any) => (
    <del {...props} className="line-through text-muted-foreground">
      {children}
    </del>
  ),
  // Enhanced horizontal rules
  hr: ({ ...props }: any) => (
    <hr {...props} className="border-0 h-px bg-gradient-to-r from-transparent via-border to-transparent my-8" />
  ),
  // Enhanced links with better security and UX
  a: ({ children, href, ...props }: any) => {
    const isExternal = href?.startsWith('http') || href?.startsWith('//');
    const isEmail = href?.startsWith('mailto:');
    
    return (
      <a 
        {...props} 
        href={href}
        className="text-primary hover:text-primary/80 underline underline-offset-2 decoration-primary/60 hover:decoration-primary transition-all duration-200 font-medium inline-flex items-center gap-1"
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        title={isExternal ? `Open ${href} in new tab` : href}
      >
        {children}
        {isExternal && <span className="text-xs">↗</span>}
      </a>
    );
  },
  // Enhanced task lists (checkboxes)
  input: ({ type, checked, ...props }: any) => {
    if (type === 'checkbox') {
      return (
        <input
          type="checkbox"
          checked={checked}
          disabled
          className="mr-3 mt-1 rounded border-border accent-primary w-4 h-4 flex-shrink-0"
          {...props}
        />
      );
    }
    return <input type={type} {...props} />;
  },
  // Enhanced sup and sub elements
  sup: ({ children, ...props }: any) => (
    <sup {...props} className="text-xs align-super">
      {children}
    </sup>
  ),
  sub: ({ children, ...props }: any) => (
    <sub {...props} className="text-xs align-sub">
      {children}
    </sub>
  ),
  // Enhanced details and summary elements
  details: ({ children, ...props }: any) => (
    <details {...props} className="border border-border/30 rounded-lg p-4 my-4 [&[open]>summary]:mb-3">
      {children}
    </details>
  ),
  summary: ({ children, ...props }: any) => (
    <summary {...props} className="font-medium cursor-pointer text-primary hover:text-primary/80 transition-colors">
      {children}
    </summary>
  ),
  // Enhanced definition lists
  dl: ({ children, ...props }: any) => (
    <dl {...props} className="space-y-3 my-6">
      {children}
    </dl>
  ),
  dt: ({ children, ...props }: any) => (
    <dt {...props} className="font-semibold text-foreground">
      {children}
    </dt>
  ),
  dd: ({ children, ...props }: any) => (
    <dd {...props} className="ml-6 text-muted-foreground">
      {children}
    </dd>
  ),
  // Enhanced abbr element
  abbr: ({ children, ...props }: any) => (
    <abbr {...props} className="border-b border-dotted border-muted-foreground cursor-help">
      {children}
    </abbr>
  ),
  // Enhanced mark element
  mark: ({ children, ...props }: any) => (
    <mark {...props} className="bg-yellow-200/50 dark:bg-yellow-500/20 px-1 rounded">
      {children}
    </mark>
  ),
  // Enhanced kbd element
  kbd: ({ children, ...props }: any) => (
    <kbd {...props} className="bg-muted border border-border rounded px-2 py-1 text-xs font-mono">
      {children}
    </kbd>
  ),
});

// Memoize the components object to prevent recreation
const MARKDOWN_COMPONENTS = createMarkdownComponents();

const REMARK_PLUGINS = [remarkGfm, remarkMath, remarkBreaks, remarkEmoji, remarkDirective, remarkFrontmatter, remarkWikiLink];
const REHYPE_PLUGINS = [
  rehypeKatex,
  rehypeSlug,
  [rehypeAutolinkHeadings, { behavior: 'wrap' }]
];

// Memoized and optimized SafeMarkdown component
const SafeMarkdown = memo(({ content }: { content: string }) => {
  // Memoize the formatted content to prevent recalculation
  const formattedContent = useMemo(() => {
    if (!content || content.trim() === '') {
      return '';
    }
    try {
      return dedent(content).trim();
    } catch {
      return content.trim();
    }
  }, [content]);

  // Early return for empty content
  if (!formattedContent) {
    return null;
  }

  // Early return for very short content to avoid markdown overhead
  if (formattedContent.length < 10 && !formattedContent.includes('`') && !formattedContent.includes('*')) {
    return <span className="text-foreground text-[15px]">{formattedContent}</span>;
  }

  try {
    return (
      <div className="markdown-content">
        <ReactMarkdown
          remarkPlugins={REMARK_PLUGINS}
          rehypePlugins={REHYPE_PLUGINS}
          skipHtml={true}
          components={MARKDOWN_COMPONENTS}
        >
          {formattedContent}
        </ReactMarkdown>
      </div>
    );
  } catch (error) {
    // Graceful fallback for malformed markdown or streaming content
    console.warn('Markdown parsing failed, falling back to plain text:', error);
    
    // Simple formatting for common patterns even in fallback mode
    const lines = formattedContent.split('\n');
    const hasCodeBlocks = formattedContent.includes('```');
    const hasHeaders = lines.some(line => line.startsWith('#'));
    
    if (hasCodeBlocks || hasHeaders) {
      // Try to preserve basic formatting
      return (
        <div className="text-sm leading-relaxed">
          {lines.map((line, idx) => {
            if (line.startsWith('# ')) {
              return <h1 key={idx} className="text-xl font-bold mt-4 mb-2 first:mt-0">{line.slice(2)}</h1>;
            }
            if (line.startsWith('## ')) {
              return <h2 key={idx} className="text-lg font-semibold mt-3 mb-2 first:mt-0">{line.slice(3)}</h2>;
            }
            if (line.startsWith('### ')) {
              return <h3 key={idx} className="text-base font-semibold mt-3 mb-1 first:mt-0">{line.slice(4)}</h3>;
            }
            if (line.trim() === '') {
              return <br key={idx} />;
            }
            return <p key={idx} className="mb-2 last:mb-0">{line}</p>;
          })}
        </div>
      );
    }
    
    return (
      <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{formattedContent}</pre>
    );
  }
});

SafeMarkdown.displayName = 'SafeMarkdown';

const ToolCallsGroup = ({ toolCalls }: { toolCalls: ToolCall[] }) => {
  // Group tool calls by name and count occurrences
  const groupedTools = toolCalls.reduce((acc, toolCall) => {
    if (!acc[toolCall.name]) {
      acc[toolCall.name] = {
        name: toolCall.name,
        count: 0,
        calls: [],
      };
    }
    acc[toolCall.name].count++;
    acc[toolCall.name].calls.push(toolCall);
    return acc;
  }, {} as Record<string, { name: string; count: number; calls: ToolCall[] }>);

  return (
    <div className="flex flex-col gap-2">
      {Object.values(groupedTools).map((group) => (
        <ToolGroupBadge key={group.name} group={group} />
      ))}
    </div>
  );
};

const ToolGroupBadge = memo(({ group }: { group: { name: string; count: number; calls: ToolCall[] } }) => {
  const [open, setOpen] = useState(false);

  const toggleOpen = useCallback(() => {
    setOpen(prev => !prev);
  }, []);

  const formatToolResult = (toolName: string, result: string) => {
    try {
      const parsed = JSON.parse(result);
      
      switch (toolName) {
        case 'web_search':
        case 'deep_search':
          return (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              <div className="font-medium text-sm text-blue-600 dark:text-blue-400">Search Results:</div>
              <div className="text-xs leading-relaxed space-y-2">
                {parsed.split('\n\n').map((paragraph: string, idx: number) => (
                  <div key={idx} className="border-l-2 border-blue-200 dark:border-blue-800 pl-3 py-1 bg-blue-50/30 dark:bg-blue-900/10 rounded-r">
                    <div className="whitespace-pre-wrap break-words">{paragraph.trim()}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        
        case 'weather':
          return (
            <div className="space-y-2">
              <div className="font-medium text-sm text-blue-600 dark:text-blue-400">Weather Report:</div>
              <div className="text-sm bg-blue-50/30 dark:bg-blue-900/10 p-3 rounded border border-blue-200/30 dark:border-blue-800/30">
                <pre className="whitespace-pre-wrap text-xs leading-relaxed">{parsed}</pre>
              </div>
            </div>
          );
        
        case 'calculator':
          return (
            <div className="space-y-2">
              <div className="font-medium text-sm text-green-600 dark:text-green-400">Calculation Result:</div>
              <div className="text-lg font-mono bg-green-50/30 dark:bg-green-900/10 p-3 rounded border border-green-200/30 dark:border-green-800/30 text-center">
                {parsed}
              </div>
            </div>
          );
        
        case 'datetime':
          return (
            <div className="space-y-2">
              <div className="font-medium text-sm text-purple-600 dark:text-purple-400">Date & Time:</div>
              <div className="text-sm bg-purple-50/30 dark:bg-purple-900/10 p-3 rounded border border-purple-200/30 dark:border-purple-800/30">
                {parsed}
              </div>
            </div>
          );
        
        case 'thinking':
          return (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <div className="font-medium text-sm text-orange-600 dark:text-orange-400">Thought Process:</div>
              <div className="text-xs leading-relaxed bg-orange-50/30 dark:bg-orange-900/10 p-3 rounded border border-orange-200/30 dark:border-orange-800/30">
                <SafeMarkdown content={parsed} />
              </div>
            </div>
          );
        
        case 'url_fetch':
          return (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              <div className="font-medium text-sm text-indigo-600 dark:text-indigo-400">Fetched Content:</div>
              <div className="text-xs leading-relaxed bg-indigo-50/30 dark:bg-indigo-900/10 p-3 rounded border border-indigo-200/30 dark:border-indigo-800/30">
                <div className="whitespace-pre-wrap break-words">{parsed}</div>
              </div>
            </div>
          );
        
        case 'code_analysis':
          return (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              <div className="font-medium text-sm text-emerald-600 dark:text-emerald-400">Code Analysis:</div>
              <div className="text-xs leading-relaxed bg-emerald-50/30 dark:bg-emerald-900/10 p-3 rounded border border-emerald-200/30 dark:border-emerald-800/30">
                <SafeMarkdown content={parsed} />
              </div>
            </div>
          );
        
        case 'memory':
          return (
            <div className="space-y-2">
              <div className="font-medium text-sm text-violet-600 dark:text-violet-400">Memory Operation:</div>
              <div className="text-sm bg-violet-50/30 dark:bg-violet-900/10 p-3 rounded border border-violet-200/30 dark:border-violet-800/30">
                {parsed}
              </div>
            </div>
          );
        
        default:
          return (
            <div className="max-h-64 overflow-y-auto">
              <div className="text-xs leading-relaxed bg-muted/30 p-3 rounded">
                <div className="whitespace-pre-wrap break-words">{parsed}</div>
              </div>
            </div>
          );
      }
    } catch {
      // If parsing fails, show raw result
      return (
        <div className="max-h-64 overflow-y-auto">
          <pre className="whitespace-pre-wrap text-xs leading-relaxed bg-muted/30 p-3 rounded break-words">{result}</pre>
        </div>
      );
    }
  };

  const getToolIcon = (toolName: string) => {
    switch (toolName) {
      case 'web_search':
        return <Search size={12} className="text-blue-500" />;
      case 'deep_search':
        return <Zap size={12} className="text-blue-600" />;
      case 'weather':
        return <CloudRain size={12} className="text-blue-400" />;
      case 'calculator':
        return <Calculator size={12} className="text-green-500" />;
      case 'datetime':
        return <Clock size={12} className="text-purple-500" />;
      case 'thinking':
        return <Brain size={12} className="text-orange-500" />;
      case 'memory':
        return <FileText size={12} className="text-indigo-500" />;
      case 'url_fetch':
        return <Link size={12} className="text-teal-500" />;
      case 'code_analysis':
        return <Code size={12} className="text-red-500" />;
      default:
        return <Wrench size={12} className="text-primary" />;
    }
  };

  const getToolDisplayName = (toolName: string) => {
    return toolName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const hasResults = group.calls.some(call => call.result);

  // Compact badge design - both with and without results
  return (
    <div className={cn(
      "inline-flex items-center transition-all duration-200 cursor-pointer",
      open ? "flex-col items-stretch w-full" : "max-w-fit"
    )}>
      <button
        onClick={toggleOpen}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all duration-200",
          "border border-border/50 bg-gradient-to-r shadow-sm hover:shadow-md",
          !open && "rounded-full hover:bg-background/80",
          open && "rounded-t-lg rounded-b-none w-full justify-between bg-background/60 border-b-0"
        )}
      >
        <div className="flex items-center gap-1.5">
          <div className={cn(
            "flex items-center justify-center rounded-full transition-colors",
            open ? "w-6 h-6 bg-primary/15" : "w-5 h-5 bg-primary/10"
          )}>
            {getToolIcon(group.name)}
          </div>
          <span className="whitespace-nowrap">
            {getToolDisplayName(group.name)}
            {group.count > 1 && (
              <span className="ml-1 px-1 py-0.5 text-xs bg-muted/60 rounded text-muted-foreground">
                {group.count}×
              </span>
            )}
          </span>
        </div>
        
        {hasResults && (
          <ChevronDown 
            size={12} 
            className={cn(
              "text-muted-foreground transition-transform duration-200 ml-1",
              open && "rotate-180"
            )} 
          />
        )}
      </button>
      
             {open && hasResults && (
         <div className="border border-t-0 border-border/50 rounded-b-lg bg-background/50 shadow-sm animate-in slide-in-from-top-2 duration-200">
          <div className="p-3">
            {group.count === 1 ? (
              // Single result - full width
              group.calls.map((call, idx) => (
                call.result && (
                  <div key={idx} className="p-3 bg-muted/30 rounded-lg overflow-hidden">
                    {formatToolResult(call.name, call.result)}
                  </div>
                )
              ))
            ) : (
              // Multiple results - side by side or stacked based on content type
              <div className={`${group.name === 'web_search' || group.name === 'deep_search' ? 'space-y-3' : 'grid grid-cols-1 lg:grid-cols-2 gap-3'}`}>
                {group.calls.map((call, idx) => (
                  call.result && (
                    <div key={idx} className="p-3 bg-muted/30 rounded-lg overflow-hidden">
                      <div className="text-xs text-muted-foreground mb-2 font-medium">
                        {group.name === 'web_search' || group.name === 'deep_search' 
                          ? `Search ${idx + 1}:` 
                          : `Result ${idx + 1}:`
                        }
                      </div>
                      {formatToolResult(call.name, call.result)}
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

ToolGroupBadge.displayName = 'ToolGroupBadge';

// Component for displaying reasoning content
const ReasoningSection = memo(({ thinking }: { thinking: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return (
    <div className="text-sm border border-slate-200/60 dark:border-slate-700/50 rounded-xl bg-gradient-to-r from-slate-50/50 to-gray-50/30 dark:from-slate-900/30 dark:to-gray-900/20 shadow-sm backdrop-blur-sm">
      <button
        onClick={toggleOpen}
        className="w-full flex items-center gap-3 p-3 hover:bg-slate-100/40 dark:hover:bg-slate-800/30 rounded-xl text-left transition-all duration-200 group"
      >
        <div className="p-2 bg-gradient-to-br from-slate-100 to-slate-200/80 dark:from-slate-800 dark:to-slate-700/80 rounded-lg shadow-sm group-hover:shadow-md transition-all duration-200">
          <Brain size={16} className="text-slate-600 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors" />
        </div>
        <div className="flex-1">
          <span className="font-semibold text-slate-700 dark:text-slate-300 block">
            Reasoning
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
            View model's thought process
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-2 py-1 bg-slate-200/60 dark:bg-slate-700/60 rounded-md">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              {isOpen ? "Hide" : "Show"}
            </span>
          </div>
          <ChevronDown 
            size={16} 
            className={`text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          />
        </div>
      </button>
      {isOpen && (
        <div className="mx-3 mb-3">
                        <div className="p-4 bg-card/60 rounded-lg border border-border/40 shadow-inner">
            <div className="prose prose-sm dark:prose-invert max-w-none prose-slate prose-headings:text-slate-800 dark:prose-headings:text-slate-200 prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-strong:text-slate-800 dark:prose-strong:text-slate-200">
              <SafeMarkdown content={thinking} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

ReasoningSection.displayName = 'ReasoningSection';

// New component for showing message versions
interface MessageVersionSelectorProps {
  conversationId: Id<"conversations">;
  currentBranchId: string;
  messagePosition: number; // Position of this message in the conversation
  onSwitchBranch: (branchId: string) => void;
}

const MessageVersionSelector = memo(function MessageVersionSelector({ conversationId, currentBranchId, messagePosition, onSwitchBranch }: MessageVersionSelectorProps) {
  const branchStats = useQuery(api.branches.getBranchStats, { conversationId });
  
  const formatTime = useCallback((timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return new Date(timestamp).toLocaleDateString();
  }, []);

  const handleSwitchBranch = useCallback((branchId: string) => {
    onSwitchBranch(branchId);
  }, [onSwitchBranch]);

  if (!branchStats || branchStats.length <= 1) return null;

  // Find branches that have messages at this position or beyond
  const relevantBranches = branchStats.filter(branch => {
    return branch.messageCount > messagePosition;
  });

  if (relevantBranches.length <= 1) return null;

  const currentBranch = branchStats.find(b => b.branchId === currentBranchId);

  return (
    <div className="flex items-center gap-2 mb-2 opacity-60 hover:opacity-100 transition-opacity">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-6 text-xs gap-1 px-2">
            <GitBranch size={10} />
            <span className="max-w-20 truncate">
              {currentBranch?.title?.replace(/^(Edit|Retry):\s*/, '') || currentBranchId}
            </span>
            <ChevronDown size={8} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <div className="px-2 py-1 text-xs font-medium text-muted-foreground border-b">
            Message Versions ({relevantBranches.length})
          </div>
          {relevantBranches.map((branch) => (
            <DropdownMenuItem
              key={branch.branchId}
              onClick={() => handleSwitchBranch(branch.branchId)}
              className={cn(
                "flex items-start justify-between text-xs p-2",
                branch.branchId === currentBranchId && "bg-muted"
              )}
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <GitBranch size={10} className="text-muted-foreground flex-shrink-0" />
                  <span className="font-medium truncate">
                    {branch.title}
                  </span>
                  {branch.branchId === currentBranchId && (
                    <Badge variant="secondary" className="text-xs px-1 py-0">
                      Current
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{branch.messageCount} msgs</span>
                  <span>•</span>
                  <span>{formatTime(branch.lastMessageAt)}</span>
                </div>
                
                {branch.parentBranchId && branch.parentBranchId !== "main" && (
                  <div className="text-xs text-muted-foreground">
                    ↳ from {branchStats.find(b => b.branchId === branch.parentBranchId)?.title?.slice(0, 20) || branch.parentBranchId}
                  </div>
                )}
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <div className="px-2 py-1 text-xs text-muted-foreground">
            💡 Different AI responses to compare
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <div className="text-xs text-muted-foreground">
        {relevantBranches.length} versions
      </div>
    </div>
  );
});

// Component to render file attachments with proper URL handling
function AttachmentRenderer({ attachment }: { attachment: any }) {
  const fileData = useQuery(api.files.getFile, 
    attachment.storageId ? { storageId: attachment.storageId } : "skip"
  );

  // Helper function to get file icon based on type
  const getFileIcon = (name: string, type: string) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('audio/')) return '🎵';
    if (type.startsWith('video/')) return '🎬';
    if (name.toLowerCase().endsWith('.pdf') || type === 'application/pdf') return '📄';
    if (name.toLowerCase().endsWith('.txt') || type === 'text/plain') return '📝';
    if (name.toLowerCase().endsWith('.csv') || type === 'text/csv') return '📊';
    if (name.toLowerCase().endsWith('.json') || type === 'application/json') return '📋';
    if (name.toLowerCase().endsWith('.md')) return '📖';
    return '📎';
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB'];
    let size = bytes;
    let i = 0;
    while (size >= 1024 && i < 2) {
      size /= 1024;
      i++;
    }
    return ` (${size.toFixed(1)} ${sizes[i]})`;
  };

  if (attachment.type === "image") {
    // If we have a storageId, use the file URL from the query
    if (attachment.storageId && fileData?.url) {
      return (
        <div className="space-y-2">
          <img 
            src={fileData.url} 
            alt={attachment.name || "Image"} 
            className="max-w-xs rounded-2xl shadow-sm border border-border/20 cursor-pointer hover:shadow-md transition-shadow" 
            onClick={() => fileData.url && window.open(fileData.url, '_blank')}
          />
          <div className="text-xs text-muted-foreground">
            {attachment.name}{formatFileSize(attachment.size)}
          </div>
        </div>
      );
    }
    // Fallback to the blob URL for immediate display (if available)
    else if (attachment.url) {
      return (
        <div className="space-y-2">
          <img 
            src={attachment.url} 
            alt={attachment.name || "Image"} 
            className="max-w-xs rounded-2xl shadow-sm border border-border/20" 
          />
          <div className="text-xs text-muted-foreground">
            {attachment.name}{formatFileSize(attachment.size)}
          </div>
        </div>
      );
    }
    // Show filename if no URL available
    else {
      return (
        <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border border-border/30">
          <span className="text-lg">{getFileIcon(attachment.name || '', 'image/')}</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{attachment.name || "Image"}</div>
            <div className="text-xs text-muted-foreground">Image file{formatFileSize(attachment.size)}</div>
          </div>
        </div>
      );
    }
  }

  // Handle audio files
  if (attachment.type === "audio") {
    if (attachment.storageId && fileData?.url) {
      return (
        <div className="space-y-2">
          <div className="border border-border/30 rounded-lg p-4 bg-muted/20">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🎵</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{attachment.name || "Audio"}</div>
                <div className="text-xs text-muted-foreground">
                  Audio file{formatFileSize(attachment.size)}
                </div>
              </div>
            </div>
            <audio 
              controls 
              className="w-full"
              src={fileData.url}
            >
              Your browser does not support the audio element.
            </audio>
          </div>
        </div>
      );
    } else if (attachment.url) {
      return (
        <div className="space-y-2">
          <div className="border border-border/30 rounded-lg p-4 bg-muted/20">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">🎵</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{attachment.name || "Audio"}</div>
                <div className="text-xs text-muted-foreground">
                  Audio file{formatFileSize(attachment.size)}
                </div>
              </div>
            </div>
            <audio 
              controls 
              className="w-full"
              src={attachment.url}
            >
              Your browser does not support the audio element.
            </audio>
          </div>
        </div>
      );
    }
  }

  // Handle video files
  if (attachment.type === "video") {
    if (attachment.storageId && fileData?.url) {
      return (
        <div className="space-y-2">
          <div className="border border-border/30 rounded-lg overflow-hidden bg-muted/20">
            <div className="flex items-center gap-3 p-3 border-b border-border/30">
              <span className="text-xl">🎬</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{attachment.name || "Video"}</div>
                <div className="text-xs text-muted-foreground">
                  Video file{formatFileSize(attachment.size)}
                </div>
              </div>
            </div>
            <video 
              controls 
              className="w-full max-h-96"
              src={fileData.url}
            >
              Your browser does not support the video element.
            </video>
          </div>
        </div>
      );
    } else if (attachment.url) {
      return (
        <div className="space-y-2">
          <div className="border border-border/30 rounded-lg overflow-hidden bg-muted/20">
            <div className="flex items-center gap-3 p-3 border-b border-border/30">
              <span className="text-xl">🎬</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{attachment.name || "Video"}</div>
                <div className="text-xs text-muted-foreground">
                  Video file{formatFileSize(attachment.size)}
                </div>
              </div>
            </div>
            <video 
              controls 
              className="w-full max-h-96"
              src={attachment.url}
            >
              Your browser does not support the video element.
            </video>
          </div>
        </div>
      );
    }
  }

  // For non-media files, show a rich file preview
  if (attachment.storageId && fileData?.url) {
    const icon = getFileIcon(attachment.name || '', fileData.fileType || '');
    const isPDF = attachment.name?.toLowerCase().endsWith('.pdf') || fileData.fileType === 'application/pdf';
    
    return (
      <div className="space-y-2">
        {isPDF ? (
          <div className="border border-border/30 rounded-lg overflow-hidden">
            <iframe
              src={fileData.url}
              className="w-full h-96"
              title={attachment.name || "PDF Document"}
              style={{ minHeight: '400px' }}
            />
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border/30 hover:bg-muted/40 transition-colors cursor-pointer"
               onClick={() => fileData.url && window.open(fileData.url, '_blank')}>
            <span className="text-2xl">{icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{attachment.name || "File"}</div>
              <div className="text-xs text-muted-foreground">
                {fileData.fileType || 'Unknown type'}{formatFileSize(attachment.size)}
              </div>
              {attachment.extractedText && (
                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  Text extracted for AI analysis
                </div>
              )}
            </div>
            <div className="text-xs text-muted-foreground">Click to view</div>
          </div>
        )}
        
        {/* Show extracted text preview if available */}
        {attachment.extractedText && attachment.extractedText.length > 50 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              View extracted text ({attachment.extractedText.length} characters)
            </summary>
            <div className="mt-2 p-3 bg-muted/20 rounded border text-muted-foreground whitespace-pre-wrap">
              {attachment.extractedText.slice(0, 500)}
              {attachment.extractedText.length > 500 && '...'}
            </div>
          </details>
        )}
      </div>
    );
  }

  // Fallback for files without proper URLs
  const icon = getFileIcon(attachment.name || '', attachment.contentType || '');
  return (
    <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border/30">
      <span className="text-2xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{attachment.name || "File"}</div>
        <div className="text-xs text-muted-foreground">
          {attachment.contentType || 'File'}{formatFileSize(attachment.size)}
        </div>
        {attachment.extractedText && (
          <div className="text-xs text-muted-foreground mt-1">
            Text content available for AI analysis
          </div>
        )}
      </div>
    </div>
  );
}

export const MessageBubble = memo(function MessageBubble({ message, messagePosition, currentBranchId, isStreaming, isSharedView, onCopyMessage, onEditMessage, onRetryMessage, onBranchOff, onSwitchBranch }: MessageBubbleProps) {
  const preferences = useQuery(api.preferences.get);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  const [isHovered, setIsHovered] = useState(false);
  
  // Memoize computed values to prevent recalculation
  const messageFlags = useMemo(() => ({
    isUser: message.role === "user",
    isAssistant: message.role === "assistant",
    isTool: message.role === "tool",
    isError: message.isError
  }), [message.role, message.isError]);
  
  const { isUser, isAssistant, isTool, isError } = messageFlags;

  const groupedToolCalls = useMemo(() => 
    message.toolCalls ? groupToolCalls(message.toolCalls) : [], 
    [message.toolCalls]
  );

  // Memoize the message content to prevent re-renders during streaming
  const messageContent = useMemo(() => message.content, [message.content]);
  
  // Helper function to format generation metrics
  const formatMetrics = useCallback((metrics: typeof message.generationMetrics) => {
    if (!metrics) return null;
    
    const parts = [];
    if (metrics.provider && metrics.model) {
      parts.push(`${metrics.provider}/${metrics.model}`);
    }
    if (metrics.completionTokens) {
      parts.push(`${metrics.completionTokens} tokens`);
    }
    if (metrics.generationTimeMs) {
      const seconds = (metrics.generationTimeMs / 1000).toFixed(1);
      parts.push(`${seconds}s`);
    }
    if (metrics.tokensPerSecond && metrics.tokensPerSecond > 0) {
      parts.push(`${metrics.tokensPerSecond.toFixed(1)} t/s`);
    }
    
    return parts.join(' • ');
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editedContent.trim() !== message.content) {
      void onEditMessage?.(message._id, editedContent.trim());
    }
    setIsEditing(false);
  }, [editedContent, message.content, message._id, onEditMessage]);

  const handleCancelEdit = useCallback(() => {
    setEditedContent(message.content);
    setIsEditing(false);
  }, [message.content]);

  const handleStartEdit = useCallback(() => {
    setEditedContent(message.content);
    setIsEditing(true);
  }, [message.content]);

  // Memoized callback handlers to prevent re-renders
  const handleCopyMessage = useCallback(() => {
    void onCopyMessage?.(message._id);
  }, [onCopyMessage, message._id]);

  const handleRetryMessage = useCallback(() => {
    void onRetryMessage?.(message._id);
  }, [onRetryMessage, message._id]);

  const handleBranchOff = useCallback(() => {
    void onBranchOff?.(message._id);
  }, [onBranchOff, message._id]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  if (isTool && preferences?.showToolOutputs) {
    // Parse the tool content to extract tool name and result
    let toolName = "Tool";
    let toolResult = message.content;
    
    // Try to extract tool name from common patterns
    const weatherMatch = message.content.match(/Weather for ([^:]+):/);
    const searchMatch = message.content.match(/Search results for "([^"]+)":/);
    
    if (weatherMatch) {
      toolName = "Weather";
      toolResult = message.content;
    } else if (searchMatch) {
      toolName = "Web Search";
      toolResult = message.content;
    } else if (message.content.includes("Current date and time:")) {
      toolName = "Date & Time";
    } else if (message.content.includes("Result:")) {
      toolName = "Calculator";
    }

    return (
      <div className="flex items-start gap-3 max-w-4xl mx-auto px-4 py-3">
        <div className="p-2 bg-blue-500/10 rounded-lg mt-1 flex-shrink-0">
          <Terminal size={16} className="text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {toolName}
            </span>
            <span className="text-xs text-muted-foreground px-2 py-1 bg-muted/50 rounded-full">
              Tool Output
            </span>
          </div>
          <div className="bg-gradient-to-br from-muted/30 to-muted/50 rounded-xl p-4 border border-border/50">
            <SafeMarkdown content={dedent(toolResult).trim()} />
          </div>
        </div>
      </div>
    );
  }

  if (isTool && !preferences?.showToolOutputs) {
    return null;
  }

  return (
    <div className={cn('flex items-start gap-2 sm:gap-4 group', isUser && 'justify-end')}>
      {!isUser && (
        <Avatar className={cn("w-10 h-10 border-2 hidden sm:flex", isError ? "border-red-200 dark:border-red-800" : "border-border/20")}>
          <AvatarFallback className={cn(isError ? "bg-red-100 dark:bg-red-900/50" : "bg-gradient-to-br from-primary/20 to-primary/10")}>
            {isError ? (
              <X size={20} className="text-red-500 dark:text-red-400" />
            ) : (
              <Bot size={20} className="text-primary" />
            )}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn('max-w-full sm:max-w-[75%] space-y-3', isUser ? 'order-1 items-end' : 'order-2 items-start')}>
        {/* Message Version Selector - Show for assistant messages when there are multiple branches */}
        {!isSharedView && isAssistant && messagePosition !== undefined && currentBranchId && onSwitchBranch && (
          <MessageVersionSelector
            conversationId={message.conversationId}
            currentBranchId={currentBranchId}
            messagePosition={messagePosition}
            onSwitchBranch={onSwitchBranch}
          />
        )}

                <Card
          className={cn(
            "px-4 sm:px-6 py-3 sm:py-4 shadow-sm border-border/50 backdrop-blur-sm transition-all duration-200 break-words overflow-hidden",
            isUser
              ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground dark:text-background rounded-3xl rounded-br-lg shadow-md'
              : isError
              ? 'bg-red-50/50 dark:bg-red-950/30 border-red-200 dark:border-red-800 rounded-3xl rounded-bl-lg shadow-sm'
              : 'bg-card/50 rounded-3xl rounded-bl-lg'
          )}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Attachments rendering */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-3 space-y-3">
              {message.attachments.map((attachment, index) => (
                <div key={`attachment-${index}`}>
                  <AttachmentRenderer attachment={attachment} />
                </div>
              ))}
            </div>
          )}

          {/* Reasoning content rendering - Only show if enabled and thinking exists */}
          {message.thinking && preferences?.showThinking && (
            <div className="mb-4">
              <ReasoningSection thinking={message.thinking} />
            </div>
          )}

          {/* Error Message Display */}
        {isError && (
          <div className="mb-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-2">
              <X size={16} className="text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                  AI Provider Error
                </h4>
                <p className="text-xs text-red-700 dark:text-red-300">
                  There was an issue with the AI response. The error details are shown below.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Message Content - Editable for User Messages */}
          {isEditing && isUser ? (
            <div className="space-y-3">
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[100px] resize-none border-border/50 focus:border-primary/50"
                placeholder="Edit your message..."
                autoFocus
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  className="h-8 px-3"
                >
                  <Check size={14} className="mr-1" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="h-8 px-3"
                >
                  <X size={14} className="mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className={cn(
              "break-words overflow-wrap-anywhere",
              isUser && "text-primary-foreground dark:text-background [&_*]:text-primary-foreground [&_*]:dark:text-background",
              isError && "text-red-800 dark:text-red-200 bg-red-50/50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200/50 dark:border-red-800/50"
            )}>
              <SafeMarkdown content={messageContent} />
              {isStreaming && (
                <div className="inline-flex items-center gap-1 ml-2">
                  <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              )}
            </div>
          )}

          {/* Tool calls rendering */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="mt-3">
              <ToolCallsGroup toolCalls={message.toolCalls} />
            </div>
          )}

          {/* Generation Metrics for Assistant Messages - Only show on hover and when enabled */}
          {isAssistant && message.generationMetrics && preferences?.showMessageMetadata && isHovered && (
            <div className="mt-3 pt-3 border-t border-border/20 animate-in fade-in-0 duration-200">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Database size={12} />
                <span>{formatMetrics(message.generationMetrics)}</span>
                {message.isEdited && (
                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                    Edited
                  </Badge>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Message Actions and Timestamp */}
        <div className={cn("flex items-center gap-2 px-2 opacity-30 group-hover:opacity-100 transition-opacity duration-200", isUser ? 'flex-row-reverse' : 'flex-row')}>
          <div className="text-xs text-muted-foreground">
            {new Date(message._creationTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </div>
          
          {/* Action Buttons - Hidden in shared view */}
          {!isSharedView && (
            <div className="flex items-center gap-1">
              {/* Copy Button */}
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0 hover:bg-muted/70 transition-colors"
                onClick={handleCopyMessage}
                title="Copy message"
              >
                <Copy size={12} />
              </Button>
              
              {/* Edit Button for User Messages */}
              {isUser && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 w-7 p-0 hover:bg-muted/70 transition-colors"
                  onClick={handleStartEdit}
                  title="Edit message"
                >
                  <Edit2 size={12} />
                </Button>
              )}
              
              {/* Retry Button for Assistant Messages */}
              {isAssistant && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 w-7 p-0 hover:bg-muted/70 transition-colors"
                  onClick={handleRetryMessage}
                  title="Retry response"
                >
                  <RotateCcw size={12} />
                </Button>
              )}
              
              {/* Branch Off Button - Only for Assistant Messages */}
              {isAssistant && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 w-7 p-0 hover:bg-muted/70 transition-colors"
                  onClick={handleBranchOff}
                  title="Branch off here"
                >
                  <GitBranch size={12} />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {isUser && (
        <Avatar className="w-10 h-10 order-2 border-2 border-border/20 hidden sm:flex">
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10">
            <User size={20} className="text-primary" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
});
