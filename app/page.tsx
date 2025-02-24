'use client';

import { useState } from 'react';
import { useChat } from '@/hooks/use-chat';
import { useAuth } from '@/hooks/use-auth';
import { ChatMessage } from '@/components/chat-message';
import { ChatThreadList } from '@/components/chat-thread-list';
import { ModelSelector } from '@/components/model-selector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2 } from 'lucide-react';

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
  } = useChat();

  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [selectedModel, setSelectedModel] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedModel || !user) return;

    const content = message;
    setMessage('');
    await sendMessage(content, selectedModel);
  };

  // Show nothing while loading or redirecting
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
        onLoadMore={loadMoreThreads}
        hasMore={hasMore}
      />
      
      <div className="flex-1 flex flex-col">
        <header className="border-b p-4">
          <ModelSelector
            value={selectedModel}
            onChange={setSelectedModel}
          />
        </header>

        <ScrollArea className="flex-1 p-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {currentThread?.messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
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
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </form>
        </footer>
      </div>
    </div>
  );
}