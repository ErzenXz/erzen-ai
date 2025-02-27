"use client";

import { useState, useEffect } from "react";
import { useChat } from "@/hooks/use-chat";
import { useAuth } from "@/hooks/use-auth";
import { ChatMessage } from "@/components/chat-message";
import { ChatThreadList } from "@/components/chat-thread-list";
import { ModelSelector } from "@/components/model-selector";
import { FileUpload } from "@/components/file-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Globe, Brain, Paperclip, X, Upload } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function Home() {
  const {
    threads,
    currentThread,
    isLoading,
    error,
    sendMessage,
    createThread,
    setCurrentThread,
    loadMoreThreads,
    hasMore,
    searchQuery,
    setSearchQuery,
  } = useChat();

  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [browseMode, setBrowseMode] = useState(false);
  const [reasoning, setReasoning] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && uploadedFiles.length === 0) || !selectedModel || !user) return;

    let content = message;

    // If there are files, add their content to the message
    if (uploadedFiles.length > 0) {
      const fileContents = await Promise.all(
        uploadedFiles.map(async (file) => {
          const text = await file.text();
          return `(${file.name})\n------------------\n${text}\n------------------\n`;
        })
      );
      
      content = fileContents.join("\n") + (message ? "\n\n" + message : "");
    }

    setMessage("");
    setUploadedFiles([]);
    setShowFileUpload(false);
    await sendMessage(content, selectedModel, browseMode, reasoning);
  };

  const handleFilesChange = (files: File[]) => {
    setUploadedFiles(files);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <ChatThreadList
        threads={threads}
        currentThreadId={currentThread?.id ?? null}
        onThreadSelect={(id) => setCurrentThread(id)}
        onNewThread={createThread}
        onRenameThread={(threadId) => {
          // Implement rename logic
        }}
        onDuplicateThread={(threadId) => {
          // Implement duplicate logic
        }}
        onDeleteThread={(threadId) => {
          // Implement delete logic
        }}
        onLoadMore={loadMoreThreads}
        hasMore={hasMore}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      
      <div className="flex-1 flex flex-col">
        <header className="border-b p-4 flex items-center gap-4">
          <ModelSelector
            value={selectedModel}
            onChange={setSelectedModel}
          />
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              <span className="text-sm font-medium">Web Search</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <Input
                  type="checkbox"
                  checked={browseMode}
                  onChange={(e) => {
                    setBrowseMode(e.target.checked);
                    if (!e.target.checked) {
                      setReasoning(false);
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer 
                  peer-focus:ring-2 peer-focus:ring-blue-300 dark:bg-gray-700 
                  peer-checked:bg-blue-600 relative before:content-[''] before:absolute 
                  before:top-0.5 before:left-0.5 before:bg-white before:border 
                  before:rounded-full before:h-5 before:w-5 before:transition-all 
                  peer-checked:before:translate-x-full"></div>
              </label>
            </div>
            {browseMode && (
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                <span className="text-sm font-medium">Reasoning</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <Input
                    type="checkbox"
                    checked={reasoning}
                    onChange={(e) => setReasoning(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer 
                    peer-focus:ring-2 peer-focus:ring-blue-300 dark:bg-gray-700 
                    peer-checked:bg-blue-600 relative before:content-[''] before:absolute 
                    before:top-0.5 before:left-0.5 before:bg-white before:border 
                    before:rounded-full before:h-5 before:w-5 before:transition-all 
                    peer-checked:before:translate-x-full"></div>
                </label>
              </div>
            )}
          </div>
        </header>

        <ScrollArea className="flex-1 p-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {currentThread?.messages.map((msg, index) => (
              <ChatMessage 
                key={msg.id} 
                message={msg} 
                isLast={index === currentThread.messages.length - 1}
              />
            ))}
            {error && (
              <div className="p-4 text-sm text-destructive bg-destructive/10 rounded-lg">
                {error}
              </div>
            )}
          </div>
        </ScrollArea>

        <footer className="border-t p-4">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            {showFileUpload && (
              <FileUpload onFilesChange={handleFilesChange} />
            )}
            
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      type="button" 
                      variant={uploadedFiles.length > 0 ? "default" : "outline"}
                      size="icon" 
                      className="h-10 w-10 flex-shrink-0"
                      onClick={() => setShowFileUpload(!showFileUpload)}
                    >
                      {uploadedFiles.length > 0 ? (
                        <div className="relative">
                          <Upload className="w-5 h-5 text-primary-foreground" />
                          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[10px] text-secondary-foreground font-bold">
                            {uploadedFiles.length}
                          </span>
                        </div>
                      ) : (
                        <Upload className="w-5 h-5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {showFileUpload ? "Hide file upload" : "Attach files"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <div className="flex-1 flex items-center bg-background border rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={uploadedFiles.length > 0 
                    ? `${uploadedFiles.length} file(s) attached. Add a message or send...` 
                    : "Type your message..."}
                  disabled={isLoading || !user}
                  className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                
                {uploadedFiles.length > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 mr-1"
                          onClick={() => {
                            setUploadedFiles([]);
                            setShowFileUpload(false);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Clear all files</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      type="submit" 
                      className="h-10 flex-shrink-0"
                      disabled={isLoading || !selectedModel || !user || (message.trim() === "" && uploadedFiles.length === 0)}
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Send message</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {uploadedFiles.length > 0 && !showFileUpload && (
              <div className="mt-2 flex items-center text-xs text-muted-foreground">
                <Paperclip className="w-3 h-3 mr-1" />
                <span>{uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} attached</span>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 ml-2 text-xs"
                  onClick={() => setShowFileUpload(true)}
                >
                  Show files
                </Button>
              </div>
            )}
          </form>
        </footer>
      </div>
    </div>
  );
}