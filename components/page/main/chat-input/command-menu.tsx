"use client"

import { useState, useRef, useEffect } from "react"
import { Bot, Trash, Wand, FileText, Image, Zap, HelpCircle } from "lucide-react"

interface CommandMenuProps {
  onCommandSelect: (command: string) => void
  isOpen: boolean
  inputValue: string
}

export function CommandMenu({ onCommandSelect, isOpen, inputValue }: CommandMenuProps) {
  const [search, setSearch] = useState("")
  const menuRef = useRef<HTMLDivElement>(null)

  // Extract command from input value
  useEffect(() => {
    if (inputValue.startsWith("/")) {
      const command = inputValue.split(" ")[0].substring(1)
      setSearch(command)
    }
  }, [inputValue])

  const commands = [
    {
      id: "clear",
      name: "Clear conversation",
      description: "Clear the current conversation",
      icon: <Trash className="h-4 w-4 text-muted-foreground" />,
      action: "/clear",
    },
    {
      id: "generate",
      name: "Generate",
      description: "Generate content with AI",
      icon: <Wand className="h-4 w-4 text-muted-foreground" />,
      action: "/generate",
    },
    {
      id: "summarize",
      name: "Summarize",
      description: "Summarize the conversation",
      icon: <FileText className="h-4 w-4 text-muted-foreground" />,
      action: "/summarize",
    },
    {
      id: "image",
      name: "Generate image",
      description: "Generate an image with AI",
      icon: <Image className="h-4 w-4 text-muted-foreground" />,
      action: "/image",
    },
    {
      id: "help",
      name: "Help",
      description: "Show available commands",
      icon: <HelpCircle className="h-4 w-4 text-muted-foreground" />,
      action: "/help",
    },
    {
      id: "code",
      name: "Code",
      description: "Generate code snippet",
      icon: <Zap className="h-4 w-4 text-muted-foreground" />,
      action: "/code",
    },
    {
      id: "ask",
      name: "Ask AI",
      description: "Ask a specific question to AI",
      icon: <Bot className="h-4 w-4 text-muted-foreground" />,
      action: "/ask",
    },
  ]

  const filteredCommands = commands.filter(
    (command) =>
      command.name.toLowerCase().includes(search.toLowerCase()) ||
      command.action.toLowerCase().includes(search.toLowerCase()),
  )

  if (!isOpen) {
    return null
  }

  return (
    <div
      ref={menuRef}
      className="absolute top-0 left-0 right-0 z-50 transform -translate-y-full bg-popover rounded-md border shadow-md overflow-hidden"
      style={{ width: "300px", marginBottom: "8px" }}
    >
      <div className="p-2 border-b">
        <p className="text-sm font-medium">Commands</p>
      </div>
      <div className="max-h-[300px] overflow-y-auto">
        {filteredCommands.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">No commands found</div>
        ) : (
          <div className="py-1">
            {filteredCommands.map((command) => (
              <button
                key={command.id}
                className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-muted focus:bg-muted outline-none"
                onClick={() => onCommandSelect(command.action)}
              >
                <div className="flex-shrink-0">{command.icon}</div>
                <div>
                  <p className="text-sm font-medium">{command.name}</p>
                  <p className="text-xs text-muted-foreground">{command.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
