"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"

interface TextSelectionButtonProps {
  onEditWithAI: (selectedText: string) => void
}

export function TextSelectionButton({ onEditWithAI }: Readonly<TextSelectionButtonProps>) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [selectedText, setSelectedText] = useState("")
  const buttonRef = useRef<HTMLDivElement>(null)

  // Helper function to check if a node is within a chat message
  const isNodeWithinChatMessage = (node: Node): boolean => {
    let currentNode: Node | null = node;

    while (currentNode && currentNode !== document.body) {
      if (currentNode instanceof HTMLElement) {
        // Check if this is a chat message article with the specific aria-label
        if (currentNode.tagName === 'ARTICLE' &&
            currentNode.getAttribute('aria-label')?.includes('message')) {
          // Double check that it has the expected structure of a chat message
          const hasUserOrBotIcon = currentNode.querySelector('.rounded-full') !== null;
          const hasMessageContent = currentNode.querySelector('.prose-content') !== null ||
                                   currentNode.querySelector('.streaming-content') !== null;

          if (hasUserOrBotIcon || hasMessageContent) {
            return true;
          }
        }

        // If we reach any of these containers, we're not in a chat message
        if (currentNode.classList.contains('chat-input-container') ||
            currentNode.tagName === 'HEADER' ||
            currentNode.tagName === 'FOOTER' ||
            currentNode.classList.contains('sidebar') ||
            currentNode.classList.contains('floating-chat-input')) {
          return false;
        }
      }
      currentNode = currentNode.parentNode;
    }

    return false;
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();

      // Check if we have a valid selection
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        setIsVisible(false);
        return;
      }

      const text = selection.toString().trim();
      if (!text) {
        setIsVisible(false);
        return;
      }

      // Get the selection range
      const range = selection.getRangeAt(0);
      const node = range.startContainer;

      // Check if the selection is within a chat message
      if (!isNodeWithinChatMessage(node)) {
        setIsVisible(false);
        return;
      }

      // Store the selected text
      setSelectedText(text);

      // Position the button above the selection
      const rect = range.getBoundingClientRect();
      setPosition({
        top: rect.top - 40,
        left: rect.left + rect.width / 2,
      });

      setIsVisible(true);
    };

    // Add event listeners
    document.addEventListener("selectionchange", handleSelectionChange)
    document.addEventListener("mouseup", handleSelectionChange)

    // Clean up
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange)
      document.removeEventListener("mouseup", handleSelectionChange)
    }
  }, [])

  // Handle click outside to hide the button
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsVisible(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleClick = () => {
    if (selectedText) {
      onEditWithAI(selectedText)
      setIsVisible(false)
    }
  }

  if (!isVisible) {
    return null
  }

  return (
    <div
      ref={buttonRef}
      className="fixed z-50 transform -translate-x-1/2 animate-in fade-in-0 slide-in-from-top-2 duration-300 drop-shadow-lg"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <Button
        size="sm"
        variant="secondary"
        className="shadow-md flex items-center gap-1.5 px-3 py-1 h-8 bg-background/90 backdrop-blur-sm border border-border hover:bg-accent hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 text-foreground"
        onClick={handleClick}
      >
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium">Ask AI about this</span>
      </Button>
    </div>
  )
}
