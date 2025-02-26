"use client";

import { useState } from "react";
import { useChat } from "@/hooks/use-chat";
import { useAuth } from "@/hooks/use-auth";
import { ChatMessage } from "@/components/chat-message";
import { ChatThreadList } from "@/components/chat-thread-list";
import { ModelSelector } from "@/components/model-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Globe, Brain } from "lucide-react";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedModel || !user) return;

    const content = message;
    setMessage("");
    await sendMessage(content, selectedModel, browseMode, reasoning);
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
            <div className="flex gap-4">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                disabled={isLoading || !user}
              />
              <Button type="submit" disabled={isLoading || !selectedModel || !user}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </form>
        </footer>
      </div>
    </div>
  );
}