import { useEffect, useRef, useCallback, memo } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { MessageBubble } from "./MessageBubble";
import { MessageCircle, BotMessageSquare, Square } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getModelInfo } from "@/lib/models";
import { toast } from "sonner";

interface ChatAreaProps {
  messages: any[];
  isGenerating: boolean;
  conversationId: Id<"conversations"> | null;
  currentBranchId?: string;
  shouldScrollToBottom?: boolean;
  onSwitchBranch?: (branchId: string) => void;
  onBranchChanged?: (branchId: string) => void;
  onScrolled?: () => void;
}

export const ChatArea = memo(function ChatArea({ messages, isGenerating, conversationId, currentBranchId, shouldScrollToBottom, onSwitchBranch, onBranchChanged, onScrolled }: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastScrollPosition = useRef<number>(0);
  
  // Mutations for branching functionality
  const copyMessage = useMutation(api.messages.copyMessage);
  const editMessage = useMutation(api.messages.editMessage);
  const retryMessage = useMutation(api.messages.retryMessage);
  const branchOffConversation = useMutation(api.branches.branchOffConversation);
  const generateStreamingResponse = useAction(api.ai.generateStreamingResponse);
  
  // Query for preferences
  const preferences = useQuery(api.preferences.get);

  // Memoized scroll function to prevent recreation
  const scrollToBottom = useCallback((force = false) => {
    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Use timeout to batch scroll operations and prevent excessive calls
    scrollTimeoutRef.current = setTimeout(() => {
      if (messagesEndRef.current) {
        if (force) {
          // Immediate scroll for user actions
          messagesEndRef.current.scrollIntoView({ behavior: "auto" });
        } else {
          // Smooth scroll for other cases
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }
    }, force ? 0 : 50); // Longer delay for non-force scrolls to batch better
  }, []);

  // Handle scroll to bottom trigger from parent - with proper cleanup
  useEffect(() => {
    if (shouldScrollToBottom) {
      scrollToBottom(true); // Force immediate scroll when user sends message
      // Use a timeout to ensure onScrolled is called after scroll completes
      const timeoutId = setTimeout(() => {
        onScrolled?.(); // Notify parent that we've scrolled
      }, 50); // Give time for scroll to complete
      
      return () => clearTimeout(timeoutId);
    }
  }, [shouldScrollToBottom, onScrolled, scrollToBottom]);

  // Only auto-scroll during generation if we're near the bottom - OPTIMIZED
  useEffect(() => {
    if (isGenerating && !shouldScrollToBottom) {
      // Debounce this check to prevent excessive DOM queries
      const timeoutId = setTimeout(() => {
        const container = messagesEndRef.current?.parentElement?.parentElement;
        if (container) {
          const { scrollTop, scrollHeight, clientHeight } = container;
          const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
          
          // Only scroll if near bottom AND scroll position changed significantly
          if (isNearBottom && Math.abs(scrollTop - lastScrollPosition.current) > 50) {
            lastScrollPosition.current = scrollTop;
            scrollToBottom(); // Smooth scroll if near bottom
          }
        }
      }, 200); // Increase debounce time to reduce frequency
      
      return () => clearTimeout(timeoutId);
    }
  }, [messages?.length, isGenerating, shouldScrollToBottom]); // Remove scrollToBottom from deps to prevent recreation

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Action handlers
  const handleCopyMessage = useCallback(async (messageId: Id<"messages">) => {
    try {
      const message = messages.find(m => m._id === messageId);
      if (message) {
        await navigator.clipboard.writeText(message.content);
        toast.success("Copied to clipboard", {
          description: "Message content has been copied successfully",
        });
      }
    } catch (error) {
      console.error("Failed to copy message:", error);
      toast.error("Copy Failed", {
        description: "Unable to copy message to clipboard. Please try again.",
      });
    }
  }, [messages]);

  const handleEditMessage = useCallback(async (messageId: Id<"messages">, newContent: string) => {
    try {
      if (!conversationId) return;
      
      const result = await editMessage({
        messageId,
        newContent,
      });
      
      // If edit was successful, notify parent of branch change and automatically regenerate AI response
      if (result?.branchId) {
        // Notify parent component of the branch change
        onBranchChanged?.(result.branchId);
        
        // Get the conversation messages up to the edit point to regenerate
        const messageList = Array.isArray(messages) ? messages : [];
        const targetMessage = messageList.find(m => m._id === messageId);
        
        // Build message history including the new edited message
        const messageHistory = messageList
          .filter(msg => targetMessage && msg._creationTime < targetMessage._creationTime)
          .map((msg: any) => ({
            role: msg.role as "user" | "assistant" | "system",
            content: msg.content,
          }));
        
        // Add the edited message to the history
        messageHistory.push({
          role: "user" as const,
          content: newContent,
        });

        // Get user preferences for AI generation
        const provider = preferences?.aiProvider ?? "google";
        const model = preferences?.model ?? "gemini-2.5-flash-preview-05-20";
        const temperature = preferences?.temperature ?? 1;
        const toolsFromPrefs = (preferences?.enabledTools as any[]) || [];
        
        // Check if the selected model supports tools
        const modelInfo = getModelInfo(model);
        const enabledTools = modelInfo.supportsTools ? toolsFromPrefs : [];

        // Generate new response
        await generateStreamingResponse({
          conversationId,
          branchId: result.branchId,
          messages: messageHistory,
          provider: provider as any,
          model,
          temperature,
          enabledTools,
        });
      }
    } catch (error) {
      console.error("Failed to edit message:", error);
    }
  }, [conversationId, editMessage, onBranchChanged, messages, preferences, generateStreamingResponse]);

  const handleRetryMessage = useCallback(async (messageId: Id<"messages">) => {
    try {
      if (!conversationId) return;
      
      const result = await retryMessage({
        messageId,
      });
      
      // If retry was successful and needs regeneration, trigger AI
      if (result?.needsRegeneration && result?.branchId) {
        // Notify parent component of the branch change
        onBranchChanged?.(result.branchId);
        
        // Get the conversation messages up to the retry point to regenerate
        const messageList = Array.isArray(messages) ? messages : [];
        const targetMessage = messageList.find(m => m._id === messageId);
        const messageHistory = messageList
          .filter(msg => targetMessage && msg._creationTime < targetMessage._creationTime)
          .map((msg: any) => ({
            role: msg.role as "user" | "assistant" | "system",
            content: msg.content,
          }));

        // Get user preferences for AI generation
        const provider = preferences?.aiProvider || "google";
        const model = preferences?.model || "gemini-2.5-flash-preview-05-20";
        const temperature = preferences?.temperature || 1;
        const toolsFromPrefs = (preferences?.enabledTools as any[]) || [];
        
        // Check if the selected model supports tools
        const modelInfo = getModelInfo(model);
        const enabledTools = modelInfo.supportsTools ? toolsFromPrefs : [];

        // Generate new response
        await generateStreamingResponse({
          conversationId,
          branchId: result.branchId,
          messages: messageHistory,
          provider: provider as any,
          model,
          temperature,
          enabledTools,
        });
      }
    } catch (error) {
      console.error("Failed to retry message:", error);
      
      // Show specific error guidance
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      let toastMessage = "Retry Failed";
      let toastDescription = "Unable to retry the message. Please try again.";
      
      if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
        toastMessage = "Authentication Error";
        toastDescription = "API key is invalid. Please check your settings.";
      } else if (errorMessage.includes("429") || errorMessage.includes("rate limit")) {
        toastMessage = "Rate Limit Exceeded";
        toastDescription = "Too many requests. Please wait before retrying.";
      }
      
      toast.error(toastMessage, {
        description: toastDescription,
      });
    }
  }, [conversationId, retryMessage, onBranchChanged, messages, preferences, generateStreamingResponse]);

  const handleBranchOff = useCallback(async (messageId: Id<"messages">) => {
    try {
      if (!conversationId) return;
      
      const title = prompt("Enter title for new conversation:");
      if (title !== null && title.trim()) {
        await branchOffConversation({
          conversationId,
          branchPoint: messageId,
          title: title.trim(),
        });
      }
    } catch (error) {
      console.error("Failed to branch off conversation:", error);
    }
  }, [conversationId, branchOffConversation]);

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto">
          <div className="mb-4">
            <BotMessageSquare size={40} className="mx-auto text-primary" />
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-2">
            Welcome to ErzenAI
          </h2>
          <p className="text-muted-foreground mb-6 text-sm sm:text-base">
            Start a conversation to see what I can do.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            <div className="bg-muted/50 p-3 rounded-lg">
              <h3 className="font-semibold mb-1 text-sm sm:text-base">Multi-Provider AI</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">Access top models from OpenAI, Anthropic, Google, and more.</p>
            </div>
            <div className="bg-muted/50 p-3 rounded-lg hidden sm:block">
              <h3 className="font-semibold mb-1 text-sm sm:text-base">Smart Tools</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">Use MCP servers and tools like web search, calculator, and more.</p>
            </div>
            <div className="bg-muted/50 p-3 rounded-lg">
              <h3 className="font-semibold mb-1 text-sm sm:text-base">Multimodal</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">Analyze images and get rich, contextual answers.</p>
            </div>
             <div className="bg-muted/50 p-3 rounded-lg">
              <h3 className="font-semibold mb-1 text-sm sm:text-base">Conversation History</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">Your chats are saved and synced across devices.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-2 sm:p-6 md:p-8 bg-gradient-to-b from-background/50 to-background">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        {messages.length === 0 && !isGenerating ? (
          <div className="text-center py-16 sm:py-24">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl sm:rounded-3xl flex items-center justify-center">
              <MessageCircle size={32} className="text-primary" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold mb-2">Start your conversation</h3>
            <p className="text-muted-foreground text-sm sm:text-base">Ask me anything, and I'll help you out!</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <MessageBubble 
              key={message._id} 
              message={message} 
              messagePosition={index}
              currentBranchId={currentBranchId}
              isStreaming={isGenerating && index === messages.length - 1 && message.role === "assistant"}
              onCopyMessage={handleCopyMessage}
              onEditMessage={handleEditMessage}
              onRetryMessage={handleRetryMessage}
              onBranchOff={handleBranchOff}
              onSwitchBranch={onSwitchBranch}
            />
          ))
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
});
