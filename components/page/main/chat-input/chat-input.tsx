"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Send, Upload, X, Loader2, Mic, MicOff, Globe, Brain, Binoculars } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import TextareaAutosize from "react-textarea-autosize"
import { CommandMenu } from "./command-menu"
import { EmojiPicker } from "./emoji-picker"
import { ModelSelector } from "@/components/page/main/model-selector"

interface ChatInputProps {
  message: string
  onMessageChange: (message: string) => void
  onSubmit: (e: React.FormEvent) => void
  onStop?: () => void
  onToggleFileUpload: () => void
  isLoading: boolean
  isDisabled: boolean
  isProcessingFiles: boolean
  uploadedFilesCount: number
  showFileUpload: boolean
  onClearFiles: () => void
  placeholder?: string
  maxLength?: number
  onCommandExecute?: (command: string) => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  selectedModel?: string
  onModelChange?: (model: string) => void
  models?: any[]
  browseMode?: boolean
  onBrowseModeChange?: (value: boolean) => void
  reasoning?: boolean
  onReasoningChange?: (value: boolean) => void
  research?: boolean
  onResearchChange?: (value: boolean) => void
}

export function ChatInput({
  message,
  onMessageChange,
  onSubmit,
  onStop,
  onToggleFileUpload,
  isLoading,
  isDisabled,
  isProcessingFiles,
  uploadedFilesCount,
  showFileUpload,
  onClearFiles,
  placeholder = "Type your message...",
  onCommandExecute,
  onKeyDown,
  selectedModel,
  onModelChange,
  models,
  browseMode,
  onBrowseModeChange,
  reasoning,
  onReasoningChange,
  research,
  onResearchChange,
}: ChatInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const commandMenuContainerRef = useRef<HTMLDivElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [showCommandMenu, setShowCommandMenu] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Focus the input when the component mounts
  useEffect(() => {
    if (inputRef.current && !isDisabled) {
      inputRef.current.focus()
    }
  }, [isDisabled])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key to close command menu
      if (e.key === "Escape" && showCommandMenu) {
        setShowCommandMenu(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [showCommandMenu])

  // Handle clicks outside the command menu to close it
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        showCommandMenu &&
        commandMenuContainerRef.current &&
        !commandMenuContainerRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowCommandMenu(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showCommandMenu])

  // Add a separate effect to detect slash commands
  useEffect(() => {
    // Check if message starts with a slash
    if (message.startsWith("/")) {
      setShowCommandMenu(true)
    } else {
      setShowCommandMenu(false)
    }
  }, [message])

  // Handle recording timer
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
      setRecordingTime(0)
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
    }
  }, [isRecording])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Allow parent component to handle keyboard events first
    if (onKeyDown) {
      onKeyDown(e);
      // If the event was prevented by the parent handler, don't continue
      if (e.defaultPrevented) {
        return;
      }
    }

    // Submit on Enter without Shift key
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      const form = e.currentTarget.form
      if (form) form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }))
    }

    // Open command menu when typing slash at the beginning of the input
    if (e.key === "/" && e.currentTarget.selectionStart === 0) {
      setShowCommandMenu(true)
    }

    // Format text with keyboard shortcuts
    if (e.ctrlKey) {
      switch (e.key) {
        case "b": // Bold
          e.preventDefault()
          applyFormat("**")
          break
        case "i": // Italic
          e.preventDefault()
          applyFormat("_")
          break
        case "e": // Code
          e.preventDefault()
          applyFormat("`")
          break
        case "k": // Link
          e.preventDefault()
          applyFormat("[](url)")
          break
      }
    }
  }

  // Apply formatting to selected text or insert at cursor
  const applyFormat = (format: string) => {
    if (!inputRef.current) return

    const input = inputRef.current
    const start = input.selectionStart
    const end = input.selectionEnd
    const selectedText = message.substring(start, end)

    let newText = message
    let newCursorPos = start

    if (format === "```\n") {
      // Handle code block
      newText = message.substring(0, start) + "```\n" + selectedText + "\n```" + message.substring(end)
      newCursorPos = start + 4 + selectedText.length
    } else if (format === "[](url)") {
      // Handle link
      if (selectedText) {
        newText = message.substring(0, start) + "[" + selectedText + "](url)" + message.substring(end)
        newCursorPos = start + selectedText.length + 3
      } else {
        newText = message.substring(0, start) + "[](url)" + message.substring(end)
        newCursorPos = start + 1
      }
    } else if (format === "- " || format === "1. " || format === "> ") {
      // Handle lists and quotes (line start)
      const lineStart = message.lastIndexOf("\n", start - 1) + 1
      newText = message.substring(0, lineStart) + format + message.substring(lineStart)
      newCursorPos = lineStart + format.length + (end - start)
    } else {
      // Handle inline formatting (bold, italic, code)
      newText = message.substring(0, start) + format + selectedText + format + message.substring(end)
      newCursorPos = selectedText ? end + 2 * format.length : start + format.length
    }

    onMessageChange(newText)

    // Set cursor position after state update
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }

  // Handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    if (!inputRef.current) return

    const input = inputRef.current
    const start = input.selectionStart
    const end = input.selectionEnd

    const newText = message.substring(0, start) + emoji + message.substring(end)
    onMessageChange(newText)

    // Set cursor position after the inserted emoji
    setTimeout(() => {
      if (inputRef.current) {
        const newPosition = start + emoji.length
        inputRef.current.focus()
        inputRef.current.setSelectionRange(newPosition, newPosition)
      }
    }, 0)
  }

  // Handle command selection
  const handleCommandSelect = (command: string) => {
    onMessageChange(command + " ")
    setShowCommandMenu(false)

    // Focus the input after selecting a command
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }, 0)

    if (onCommandExecute) {
      onCommandExecute(command)
    }
  }

  // Handle voice recording
  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop()
      }
      setIsRecording(false)
    } else {
      try {
        // Start recording
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
        const audioChunks: BlobPart[] = []

        recorder.addEventListener("dataavailable", (event) => {
          audioChunks.push(event.data)
        })

        recorder.addEventListener("stop", async () => {
          const audioBlob = new Blob(audioChunks, { type: "audio/webm" })

          try {
            // Send the audio blob to our API endpoint
            const formData = new FormData()
            formData.append("audio", audioBlob)

            const response = await fetch("/api/transcribe/stt", {
              method: "POST",
              body: formData,
            })

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`)
            }

            const data = await response.json()
            if (data.error) {
              throw new Error(data.error)
            }

            // Add transcription to message
            const transcription = data.transcript.trim()
            if (transcription) {
              onMessageChange(message + (message ? " " : "") + transcription)
            }
          } catch (error) {
            console.error("Transcription error:", error)
            alert("Failed to transcribe audio. Please try again.")
          } finally {
            // Clean up
            stream.getTracks().forEach(track => track.stop())
            setMediaRecorder(null)
          }
        })

        recorder.start()
        setMediaRecorder(recorder)
        setIsRecording(true)
      } catch (err) {
        console.error("Error accessing microphone:", err)
        alert("Could not access your microphone. Please check permissions.")
      }
    }
  }

  // Handle image paste
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        // We have an image! Let's process it
        const file = items[i].getAsFile()
        if (file) {
          // Prevent the default paste behavior for images
          e.preventDefault()

          // Here you would typically handle the image file
          // For example, you might want to upload it or add it to your files array
          alert("Image pasted! This would typically be uploaded.")
          break
        }
      }
    }
  }

  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <TooltipProvider>
      {/* Model selector (shows only if props provided) */}
      {onModelChange && models && (
        <div className="mb-2 flex justify-end">
          <ModelSelector value={selectedModel ?? ""} onChange={onModelChange} />
        </div>
      )}
      <div className="animate-apple-fade">
        <form onSubmit={onSubmit} className="w-full relative">
          <div className="flex gap-2 transition-all duration-300 ease-in-out">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant={uploadedFilesCount > 0 ? "default" : "outline"}
                  size="icon"
                  className={cn(
                    "h-12 w-12 flex-shrink-0 transition-all duration-200",
                    uploadedFilesCount > 0 && "bg-primary text-primary-foreground shadow-md",
                  )}
                  onClick={onToggleFileUpload}
                >
                  {uploadedFilesCount > 0 ? (
                    <div className="relative">
                      <Upload className="w-5 h-5" />
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] text-secondary-foreground font-bold shadow-sm">
                        {uploadedFilesCount}
                      </span>
                    </div>
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{showFileUpload ? "Hide file upload" : "Attach files"}</TooltipContent>
            </Tooltip>

            <div
              className={cn(
                "flex-1 flex flex-col bg-background rounded-xl transition-all duration-300",
                "border shadow-soft",
                isFocused ? "ring-2 ring-primary/20 border-primary/30 shadow-md" : "hover:border-primary/20",
                isDisabled && "opacity-60",
              )}
            >
              <div className="relative flex items-center" ref={commandMenuContainerRef}>
                {showCommandMenu && (
                  <div className="absolute left-4 top-0 transform -translate-y-[calc(100%+8px)]">
                    <CommandMenu onCommandSelect={handleCommandSelect} isOpen={showCommandMenu} inputValue={message} />
                  </div>
                )}

                <TextareaAutosize
                  ref={inputRef}
                  value={message}
                  onChange={(e) => onMessageChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder={isRecording ? "Listening..." : placeholder}
                  disabled={isDisabled || isRecording}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  className={cn(
                    "flex-1 px-4 py-3 bg-transparent border-0 resize-none focus:outline-none",
                    "text-base placeholder:text-muted-foreground/70",
                    "min-h-[48px] max-h-[200px]",
                    "transition-all duration-300 ease-in-out",
                  )}
                  maxRows={6}
                />

                <div className="flex items-center gap-1 px-2">
                  {isRecording ? (
                    <div className="flex items-center gap-2 mr-2 text-destructive animate-pulse">
                      <span className="text-xs font-medium">{formatTime(recordingTime)}</span>
                      <span className="h-2 w-2 rounded-full bg-destructive"></span>
                    </div>
                  ) : null}

                  <EmojiPicker onEmojiSelect={handleEmojiSelect} />

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-9 w-9 rounded-full hover:bg-muted",
                          isRecording && "text-destructive bg-destructive/10",
                        )}
                        onClick={toggleRecording}
                      >
                        {isRecording ? (
                          <MicOff className="h-5 w-5" />
                        ) : (
                          <Mic className="h-5 w-5 text-muted-foreground" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">{isRecording ? "Stop recording" : "Voice input"}</TooltipContent>
                  </Tooltip>

                  {uploadedFilesCount > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-muted-foreground hover:text-foreground"
                          onClick={onClearFiles}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Clear all files</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="submit"
                  className={cn(
                    "h-12 w-12 flex-shrink-0 transition-all duration-300",
                    message.trim() || uploadedFilesCount > 0 ? "bg-primary" : "bg-primary/70",
                    "shadow-md hover:shadow-lg hover:-translate-y-1",
                  )}
                  disabled={
                    isLoading || isProcessingFiles || isDisabled || (message.trim() === "" && uploadedFilesCount === 0)
                  }
                >
                  {isLoading || isProcessingFiles ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Send message</TooltipContent>
            </Tooltip>

            {isLoading && (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={onStop}
                aria-label="Stop generating"
              >
                <div className="animate-spin">
                  <Loader2 size={20} />
                </div>
              </Button>
            )}
          </div>

          {uploadedFilesCount > 0 && !showFileUpload && (
            <div className="mt-2 flex items-center text-xs text-muted-foreground animate-fadeIn">
              <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs font-medium">
                {uploadedFilesCount} file{uploadedFilesCount !== 1 ? "s" : ""} attached
              </span>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 ml-2 text-xs"
                onClick={onToggleFileUpload}
              >
                Show files
              </Button>
            </div>
          )}
        </form>
      </div>
    </TooltipProvider>
  )
}
