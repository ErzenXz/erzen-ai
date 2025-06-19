import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useAction, usePaginatedQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Sidebar } from "./Sidebar";
import { ChatArea } from "./ChatArea";
import { MessageInput } from "./MessageInput";

import { Menu, Settings, GitBranch, ChevronDown, Trash2, MessageSquare, Clock, Hash, Plus, MoreHorizontal } from 'lucide-react';
import { SignOutButton } from "../SignOutButton";
import { ModeToggle } from "./ModeToggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getModelInfo } from "@/lib/models";
import { useMediaQuery } from "@/lib/hooks";
import { toast } from "sonner";

// Import types from MessageInput
import type { AttachmentData } from "./MessageInput";

// Define the valid tool types to match backend (including dynamic MCP tools)
type ValidTool = string;

interface BranchManagerProps {
  conversationId: Id<"conversations">;
  currentBranchId: string;
  onSwitchBranch: (branchId: string) => void;
  onDeleteBranch: (branchId: string) => void;
}

function BranchManager({ conversationId, currentBranchId, onSwitchBranch, onDeleteBranch }: BranchManagerProps) {
  const branchStats = useQuery(api.branches.getBranchStats, { conversationId });
  
  if (!branchStats || branchStats.length <= 1) return null;

  const currentBranch = branchStats.find(b => b.branchId === currentBranchId);
  
  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 sm:gap-2 max-w-28 sm:max-w-48">
          <GitBranch size={14} />
          <span className="truncate">
            {currentBranch?.title || currentBranchId}
          </span>
          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
            {branchStats.length}
          </Badge>
          <ChevronDown size={12} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        <div className="px-3 py-2 text-sm font-medium text-muted-foreground border-b">
          Conversation Branches ({branchStats.length})
        </div>
        
        <div className="max-h-64 overflow-y-auto">
          {branchStats.map((branch) => (
            <DropdownMenuItem
              key={branch.branchId}
              onClick={() => onSwitchBranch(branch.branchId)}
              className={cn(
                "flex items-start justify-between p-3 cursor-pointer",
                branch.branchId === currentBranchId && "bg-muted"
              )}
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <GitBranch size={12} className="text-muted-foreground flex-shrink-0" />
                  <span className="font-medium truncate text-sm">
                    {branch.title}
                  </span>
                  {branch.branchId === currentBranchId && (
                    <Badge variant="default" className="text-xs px-1.5 py-0">
                      Current
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Hash size={10} />
                    <span>{branch.messageCount} messages</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={10} />
                    <span>{formatTime(branch.lastMessageAt)}</span>
                  </div>
                </div>
                
                {branch.parentBranchId && (
                  <div className="text-xs text-muted-foreground">
                    ↳ Branched from {branchStats.find(b => b.branchId === branch.parentBranchId)?.title || branch.parentBranchId}
                  </div>
                )}
              </div>
              
              {branch.branchId !== "main" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal size={12} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteBranch(branch.branchId);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 size={12} className="mr-2" />
                      Delete Branch
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </DropdownMenuItem>
          ))}
        </div>
        
        <DropdownMenuSeparator />
        <div className="px-3 py-2 text-xs text-muted-foreground">
          💡 Edit messages or retry responses to create new branches
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ChatInterface() {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [currentConversationId, setCurrentConversationId] = useState<Id<"conversations"> | null>(null);
  const [currentBranchId, setCurrentBranchId] = useState<string>("main");
  const [sidebarOpen, setSidebarOpen] = useState(false); // Will be set correctly in useEffect
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [currentGenerationController, setCurrentGenerationController] = useState<AbortController | null>(null);
  const [lastMessageId, setLastMessageId] = useState<Id<"messages"> | null>(null);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);
  
  const messages = useQuery(
    api.messages.list,
    currentConversationId ? { 
      conversationId: currentConversationId,
      branchId: currentBranchId,
      paginationOpts: { numItems: 50, cursor: null }
    } : "skip"
  );
  
  const createConversation = useMutation(api.conversations.create);
  const createConversationWithFirstMessage = useMutation(api.conversations.createWithFirstMessage);
  const addMessage = useMutation(api.messages.add);
  const generateStreamingResponse = useAction(api.ai.generateStreamingResponse);
  const generateTitle = useAction(api.conversations.generateTitle);
  const preferences = useQuery(api.preferences.get);
  const cleanupOldToolMessages = useMutation(api.messages.cleanupOldToolMessages);
  const cleanupDuplicatedContent = useMutation(api.messages.cleanupDuplicatedContent);
  const migrateMessagesToMainBranch = useMutation(api.messages.migrateMessagesToMainBranch);
  const initializeMainBranch = useMutation(api.branches.initializeMainBranch);
  const cancelGeneration = useMutation(api.conversations.cancelGeneration);
  const clearCancellation = useMutation(api.conversations.clearCancellation);
  const generationState = useQuery(
    api.conversations.checkGenerationState,
    currentConversationId ? { conversationId: currentConversationId } : "skip"
  );

  const branchStats = useQuery(
    api.branches.getBranchStats,
    currentConversationId ? { conversationId: currentConversationId } : "skip"
  );

  // Sync the local generating state with the server state
  // This handles cases where the page is refreshed during generation
  useEffect(() => {
    if (generationState) {
      if (generationState.isGenerating && !isGenerating) {
        // Server thinks we're generating but UI doesn't - restore generating state
        setIsGenerating(true);
        setLastMessageId(generationState.messageId || null);
      } else if (!generationState.isGenerating && isGenerating) {
        // Server finished generation but UI still thinks we're generating - clear state
        setIsGenerating(false);
        setCurrentGenerationController(null);
      }
    }
  }, [generationState?.isGenerating, isGenerating]); // Only watch the specific property
  
  const currentBranch = useQuery(
    api.branches.getCurrentBranch,
    currentConversationId ? { conversationId: currentConversationId } : "skip"
  );

  const switchBranch = useMutation(api.branches.switchBranch);
  const deleteBranch = useMutation(api.branches.deleteBranch);

  useEffect(() => {
    if (typeof currentBranch === 'string') {
      setCurrentBranchId(currentBranch);
    }
  }, [currentBranch]);

  useEffect(() => {
    if (isDesktop) {
      setMobileSidebarOpen(false);
    } else {
      // On mobile, sync sidebarOpen with mobileSidebarOpen, default to closed
      setSidebarOpen(false);
    }
  }, [isDesktop]);

  // Watch for completion of AI generation by monitoring the last message
  useEffect(() => {
    if (isGenerating && lastMessageId && messages?.page) {
      const lastMessage = messages.page.find(m => m._id === lastMessageId);
      
      // Check if the message has generation metrics (indicates completion)
      if (lastMessage?.generationMetrics && !lastMessage.isError) {
        // Generation is complete - batch all state updates in a single effect
        const timeoutId = setTimeout(() => {
          setIsGenerating(false);
          setCurrentGenerationController(null);
          setLastMessageId(null);
        }, 0); // Use timeout to batch state updates
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [messages?.page?.length, isGenerating, lastMessageId]); // Use length instead of entire messages array

  // Auto-migrate and initialize branches when conversation changes
  useEffect(() => {
    if (currentConversationId) {
      const initializeConversation = async () => {
        try {
          // Initialize main branch if it doesn't exist
          await initializeMainBranch({ conversationId: currentConversationId });
          
          // Migrate any unbranded messages to main branch
          await migrateMessagesToMainBranch({ conversationId: currentConversationId });
          
          // Cleanup old messages
          await cleanupOldToolMessages({ conversationId: currentConversationId });
          await cleanupDuplicatedContent({ conversationId: currentConversationId });
        } catch (error) {
          console.error("Failed to initialize conversation:", error);
        }
      };
      
      setIsGenerating(false);
      void initializeConversation();
      
      // Instantly scroll to bottom when conversation loads
      setShouldScrollToBottom(true);
    }
  }, [currentConversationId, initializeMainBranch, migrateMessagesToMainBranch, cleanupOldToolMessages, cleanupDuplicatedContent]);

  // Set sidebar state based on screen size
  useEffect(() => {
    setSidebarOpen(isDesktop);
  }, [isDesktop]);

  const handleNewConversation = useCallback(async () => {
    try {
      const conversationId = await createConversation({
        title: "New Chat",
      });
      setCurrentConversationId(conversationId);
      setCurrentBranchId("main");
      if(!isDesktop) {
        setMobileSidebarOpen(false);
      }
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  }, [createConversation, isDesktop]);

  // Stop current generation
  const handleStopGeneration = useCallback(async () => {
    if (currentConversationId && currentGenerationController) {
      try {
        // Set cancellation flag to stop the generation
        await cancelGeneration({
          conversationId: currentConversationId,
        });
        
        // Also abort the controller for immediate UI feedback
        currentGenerationController.abort();
        setCurrentGenerationController(null);
        setIsGenerating(false);
      } catch (error) {
        console.error("Failed to stop generation:", error);
        // Fallback: just stop the UI
        currentGenerationController.abort();
        setCurrentGenerationController(null);
        setIsGenerating(false);
      }
    }
  }, [currentConversationId, currentGenerationController, cancelGeneration]);

  const handleSendMessage = async (
    content: string, 
    attachments?: AttachmentData[], 
    selectedModel?: { provider: string; model: string; thinkingBudget?: string | number },
    enabledTools?: ValidTool[]
  ) => {
    if (!content.trim() && (!attachments || attachments.length === 0)) return;
    if (isGenerating) return; // Prevent sending while generating

    // Create new AbortController for this generation
    const controller = new AbortController();
    setCurrentGenerationController(controller);
    setIsGenerating(true);
    setShouldScrollToBottom(true); // Trigger scroll to bottom when sending

    try {
      let conversationId = currentConversationId;

      // Optimized flow: Create conversation and add first message in single operation
      if (!conversationId) {
        const result = await createConversationWithFirstMessage({
          title: content.slice(0, 50) + (content.length > 50 ? "..." : ""),
          content,
          attachments: attachments?.map(att => ({
            type: att.type,
            url: att.url,
            name: att.name,
            size: att.size,
            storageId: att.storageId,
            extractedText: att.extractedText,
          })),
        });
        conversationId = result.conversationId;
        setCurrentConversationId(conversationId);
      } else {
        // Add user message for existing conversation
        await addMessage({
          conversationId,
          branchId: currentBranchId,
          role: "user",
          content,
          attachments: attachments?.map(att => ({
            type: att.type,
            url: att.url,
            name: att.name,
            size: att.size,
            storageId: att.storageId,
            extractedText: att.extractedText,
          })),
        });
      }

      const messageList = messages?.page || [];
      const messageHistory = messageList.map((msg) => {
        // Handle multimodal messages
        if (msg.attachments && msg.attachments.length > 0) {
          const content: Array<{type: "text", text: string} | {type: "image", image: string} | {type: "file", data: string, mimeType: string}> = [];
          
          // Add text content if present
          if (msg.content.trim()) {
            content.push({
              type: "text",
              text: msg.content
            });
          }
          
          // Process attachments based on model capabilities
          const modelInfo = getModelInfo(selectedModel?.model || preferences?.model || "gemini-2.5-flash-preview-05-20");
          const isMultimodal = modelInfo.isMultimodal;
          
          msg.attachments.forEach(attachment => {
            if (attachment.type === "image" && attachment.storageId) {
              if (isMultimodal) {
                // For multimodal models, pass image directly
                content.push({
                  type: "image",
                  image: attachment.storageId // Use storageId, will be converted to public URL in backend
                });
              } else {
                // For non-multimodal models, add image description to text
                content.push({
                  type: "text",
                  text: `[Image: ${attachment.name}] - Image content cannot be processed by this model. Please use a multimodal model to analyze images.`
                });
              }
            } else if (attachment.type === "audio" && attachment.storageId) {
              if (isMultimodal) {
                // For multimodal models, pass audio directly
                content.push({
                  type: "file",
                  data: attachment.storageId,
                  mimeType: attachment.mimeType || 'audio/mpeg'
                });
              } else {
                content.push({
                  type: "text",
                  text: `[Audio: ${attachment.name}] - Audio content cannot be processed by this model. Please use a multimodal model to analyze audio.`
                });
              }
            } else if (attachment.type === "video" && attachment.storageId) {
              if (isMultimodal) {
                // For multimodal models, pass video directly
                content.push({
                  type: "file",
                  data: attachment.storageId,
                  mimeType: attachment.mimeType || 'video/mp4'
                });
              } else {
                content.push({
                  type: "text",
                  text: `[Video: ${attachment.name}] - Video content cannot be processed by this model. Please use a multimodal model to analyze video.`
                });
              }
            } else if (attachment.type === "file" && attachment.storageId) {
              // Determine file type for better handling
              const fileName = attachment.name.toLowerCase();
              const isAudio = fileName.includes('.mp3') || fileName.includes('.wav') || fileName.includes('.mp4') || fileName.includes('.webm') || fileName.includes('.ogg');
              const isVideo = fileName.includes('.mp4') || fileName.includes('.webm') || fileName.includes('.avi') || fileName.includes('.mov');
              const isPdf = fileName.endsWith('.pdf');
              const isDocument = isPdf || fileName.includes('document');
              
              if (isMultimodal && (isAudio || isVideo || isPdf || isDocument)) {
                // For multimodal models, pass supported media/document files directly
                let mimeType = 'application/octet-stream';
                if (isPdf) mimeType = 'application/pdf';
                else if (isAudio) {
                  if (fileName.includes('.mp3')) mimeType = 'audio/mpeg';
                  else if (fileName.includes('.wav')) mimeType = 'audio/wav';
                  else if (fileName.includes('.mp4')) mimeType = 'audio/mp4';
                  else if (fileName.includes('.webm')) mimeType = 'audio/webm';
                  else if (fileName.includes('.ogg')) mimeType = 'audio/ogg';
                } else if (isVideo) {
                  if (fileName.includes('.mp4')) mimeType = 'video/mp4';
                  else if (fileName.includes('.webm')) mimeType = 'video/webm';
                  else if (fileName.includes('.avi')) mimeType = 'video/avi';
                  else if (fileName.includes('.mov')) mimeType = 'video/mov';
                }
                
                content.push({
                  type: "file",
                  data: attachment.storageId,
                  mimeType: mimeType
                });
              } else if (attachment.extractedText) {
                // For all models, use extracted text if available
                content.push({
                  type: "text",
                  text: `[File: ${attachment.name}]\n${attachment.extractedText}`
                });
              } else {
                // Fallback for files without extracted text
                const fileType = isAudio ? 'Audio' : isVideo ? 'Video' : 'File';
                content.push({
                  type: "text",
                  text: `[${fileType}: ${attachment.name}] - Content could not be extracted.`
                });
              }
            }
          });

          return {
            role: msg.role as "user" | "assistant" | "system",
            content: content
          };
        }
        
        // Handle text-only messages
        return {
          role: msg.role as "user" | "assistant" | "system",
          content: msg.content,
        };
      });

      // Add the current user message with attachments if any
      if (attachments && attachments.length > 0) {
        const userContent: Array<{type: "text", text: string} | {type: "image", image: string} | {type: "file", data: string, mimeType: string}> = [];
        
        // Add text content if present
        if (content.trim()) {
          userContent.push({
            type: "text",
            text: content
          });
        }
        
        // Process current message attachments
        const modelInfo = getModelInfo(selectedModel?.model || preferences?.model || "gemini-2.5-flash-preview-05-20");
        const isMultimodal = modelInfo.isMultimodal;
        
        attachments.forEach(attachment => {
          if (attachment.type === "image" && attachment.storageId) {
            if (isMultimodal) {
              userContent.push({
                type: "image",
                image: attachment.storageId // Use storageId, will be converted to public URL in backend
              });
            } else {
              userContent.push({
                type: "text",
                text: `[Image: ${attachment.name}] - Image content cannot be processed by this model. Please use a multimodal model to analyze images.`
              });
            }
          } else if (attachment.type === "audio" && attachment.storageId) {
            if (isMultimodal) {
              userContent.push({
                type: "file",
                data: attachment.storageId,
                mimeType: attachment.mimeType || 'audio/mpeg'
              });
            } else {
              userContent.push({
                type: "text",
                text: `[Audio: ${attachment.name}] - Audio content cannot be processed by this model. Please use a multimodal model to analyze audio.`
              });
            }
          } else if (attachment.type === "video" && attachment.storageId) {
            if (isMultimodal) {
              userContent.push({
                type: "file",
                data: attachment.storageId,
                mimeType: attachment.mimeType || 'video/mp4'
              });
            } else {
              userContent.push({
                type: "text",
                text: `[Video: ${attachment.name}] - Video content cannot be processed by this model. Please use a multimodal model to analyze video.`
              });
            }
          } else if (attachment.type === "file" && attachment.storageId) {
            // Determine file type for better handling
            const fileName = attachment.name.toLowerCase();
            const isAudio = fileName.includes('.mp3') || fileName.includes('.wav') || fileName.includes('.mp4') || fileName.includes('.webm') || fileName.includes('.ogg');
            const isVideo = fileName.includes('.mp4') || fileName.includes('.webm') || fileName.includes('.avi') || fileName.includes('.mov');
            const isPdf = fileName.endsWith('.pdf');
            const isDocument = isPdf || fileName.includes('document');
            
            if (isMultimodal && (isAudio || isVideo || isPdf || isDocument)) {
              // For multimodal models, pass supported media/document files directly
              let mimeType = 'application/octet-stream';
              if (isPdf) mimeType = 'application/pdf';
              else if (isAudio) {
                if (fileName.includes('.mp3')) mimeType = 'audio/mpeg';
                else if (fileName.includes('.wav')) mimeType = 'audio/wav';
                else if (fileName.includes('.mp4')) mimeType = 'audio/mp4';
                else if (fileName.includes('.webm')) mimeType = 'audio/webm';
                else if (fileName.includes('.ogg')) mimeType = 'audio/ogg';
              } else if (isVideo) {
                if (fileName.includes('.mp4')) mimeType = 'video/mp4';
                else if (fileName.includes('.webm')) mimeType = 'video/webm';
                else if (fileName.includes('.avi')) mimeType = 'video/avi';
                else if (fileName.includes('.mov')) mimeType = 'video/mov';
              }
              
              userContent.push({
                type: "file",
                data: attachment.storageId,
                mimeType: mimeType
              });
            } else if (attachment.extractedText) {
              // For all models, use extracted text
              userContent.push({
                type: "text",
                text: `[File: ${attachment.name}]\n${attachment.extractedText}`
              });
            } else {
              const fileType = isAudio ? 'Audio' : isVideo ? 'Video' : 'File';
              userContent.push({
                type: "text",
                text: `[${fileType}: ${attachment.name}] - Content could not be extracted.`
              });
            }
          }
        });

        messageHistory.push({
          role: "user" as const,
          content: userContent,
        });
      } else {
        // Simple text message
        messageHistory.push({
          role: "user" as const,
          content,
        });
      }

      const provider = selectedModel?.provider || preferences?.aiProvider || "google";
      const model = selectedModel?.model || preferences?.model || "gemini-2.5-flash-preview-05-20";
      const temperature = preferences?.temperature || 1;
      const toolsFromPrefs = enabledTools || (preferences?.enabledTools as ValidTool[]) || [];
      
      // Check if the selected model supports tools
      const modelInfo = getModelInfo(model);
      const toolsToUse = modelInfo.supportsTools ? toolsFromPrefs : [];

      // Check if generation was cancelled before starting
      if (controller.signal.aborted) {
        return;
      }

      // Ensure conversationId is not null before proceeding
      if (!conversationId) {
        throw new Error("Failed to create or get conversation");
      }

      const result = await generateStreamingResponse({
        conversationId,
        branchId: currentBranchId,
        messages: messageHistory,
        provider: provider as any,
        model,
        temperature,
        enabledTools: toolsToUse,
        thinkingBudget: selectedModel?.thinkingBudget,
      });

      // Track the assistant message ID to detect completion
      if (result?.error) {
        // Backend reported an immediate failure – stop the spinner so the user isn't left waiting.
        setIsGenerating(false);
        setCurrentGenerationController(null);
      } else if (result?.messageId) {
        setLastMessageId(result.messageId);
      } else {
        // If no message ID, stop generating after a timeout
        setTimeout(() => {
          setIsGenerating(false);
          setCurrentGenerationController(null);
        }, 2000);
      }

    } catch (error) {
      // Check if the error is due to cancellation
      if (error instanceof Error && error.name === 'AbortError') {
        setIsGenerating(false);
        setCurrentGenerationController(null);
        return;
      }
      
      console.error("Failed to send message:", error);
      
      // Show a more user-friendly error with actionable advice
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      let toastMessage = "Failed to send message";
      let toastDescription = "Please try again in a moment";
      
      // Provide specific guidance based on error type
      if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
        toastMessage = "Authentication Error";
        toastDescription = "API key is invalid. Please check your settings and try again.";
      } else if (errorMessage.includes("403") || errorMessage.includes("Forbidden")) {
        toastMessage = "Access Denied";
        toastDescription = "API key lacks required permissions. Please check your API key settings.";
      } else if (errorMessage.includes("429") || errorMessage.includes("rate limit")) {
        toastMessage = "Rate Limit Exceeded";
        toastDescription = "Too many requests. Please wait a moment before trying again.";
      } else if (errorMessage.includes("quota") || errorMessage.includes("billing")) {
        toastMessage = "Quota/Billing Issue";
        toastDescription = "API quota reached or billing issue. Check your account or add your own API key.";
      } else if (errorMessage.includes("timeout")) {
        toastMessage = "Connection Timeout";
        toastDescription = "The AI service is taking too long to respond. Please try again.";
      } else if (errorMessage.includes("model") && errorMessage.includes("not found")) {
        toastMessage = "Model Not Available";
        toastDescription = "The selected AI model is not available. Please try a different model.";
      }
      
      toast.error(toastMessage, {
        description: toastDescription,
        action: {
          label: "Open Settings",
          onClick: () => {
            window.history.pushState({}, '', '/settings');
            window.dispatchEvent(new PopStateEvent('popstate'));
          },
        },
      });
      
      // Only stop generating on actual errors, not on successful streaming start
      setIsGenerating(false);
      setCurrentGenerationController(null);
    }
  };

  const handleSwitchBranch = useCallback(async (branchId: string) => {
    if (!currentConversationId) return;
    
    try {
      await switchBranch({
        conversationId: currentConversationId,
        branchId,
      });
      setCurrentBranchId(branchId);
    } catch (error) {
      console.error("Failed to switch branch:", error);
    }
  }, [currentConversationId, switchBranch]);

  const handleDeleteBranch = useCallback(async (branchId: string) => {
    if (!currentConversationId || branchId === "main") return;
    
    if (confirm("Are you sure you want to delete this branch? This action cannot be undone.")) {
      try {
        await deleteBranch({
          conversationId: currentConversationId,
          branchId,
        });
      } catch (error) {
        console.error("Failed to delete branch:", error);
      }
    }
  }, [currentConversationId, deleteBranch]);

  // Memoized callbacks for Sidebar
  const handleSelectConversation = useCallback((id: Id<"conversations">) => {
    setCurrentConversationId(id);
    setCurrentBranchId("main");
    if(!isDesktop) {
      setMobileSidebarOpen(false);
    }
  }, [isDesktop]);

  const handleToggleSidebar = useCallback(() => {
    if (isDesktop) {
      setSidebarOpen(prev => !prev);
    } else {
      setMobileSidebarOpen(prev => !prev);
    }
  }, [isDesktop]);

  // Memoized callback to prevent infinite loops
  const handleScrolled = useCallback(() => {
    setShouldScrollToBottom(false);
  }, []);

  // Memoized branch changed handler
  const handleBranchChanged = useCallback((branchId: string) => {
    setCurrentBranchId(branchId);
  }, []);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <TooltipProvider>
        {/* Sidebar for Mobile */}
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-40 h-full transition-transform duration-300 ease-in-out lg:hidden",
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <Sidebar
            currentConversationId={currentConversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            isSidebarOpen={mobileSidebarOpen}
            onToggleSidebar={handleToggleSidebar}
          />
        </div>

        {/* Sidebar for Desktop */}
        <div
          className={cn(
            "hidden lg:flex lg:flex-shrink-0 h-full transition-all duration-300 ease-in-out",
            sidebarOpen ? "w-80" : "w-0 overflow-hidden"
          )}
        >
           <Sidebar
            currentConversationId={currentConversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            isSidebarOpen={sidebarOpen}
            onToggleSidebar={handleToggleSidebar}
          />
        </div>

        {/* Overlay for mobile */}
        {!isDesktop && mobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-30"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        <div className="flex-1 flex flex-col min-h-0">
          <header className="border-b border-border/50 px-4 sm:px-6 py-3 flex items-center justify-between h-20 bg-background/80 backdrop-blur-sm sticky top-0 z-20">
            <div className="flex items-center gap-2 sm:gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleToggleSidebar}
                  className="rounded-xl h-10 w-10 sm:h-12 sm:w-12"
                >
                  <Menu size={22} />
                </Button>
             
              {currentConversationId && branchStats && branchStats.length > 1 && (
                <BranchManager
                  conversationId={currentConversationId}
                  currentBranchId={currentBranchId}
                  onSwitchBranch={(branchId) => void handleSwitchBranch(branchId)}
                  onDeleteBranch={(branchId) => void handleDeleteBranch(branchId)}
                />
              )}
            </div>

            <div className="flex items-center gap-1 sm:gap-3">
              <ModeToggle />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => {
                      window.history.pushState({}, '', '/settings');
                      window.dispatchEvent(new PopStateEvent('popstate'));
                    }} 
                    className="rounded-xl h-10 w-10 sm:h-12 sm:w-12"
                  >
                    <Settings size={22} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Settings</p>
                </TooltipContent>
              </Tooltip>
              <SignOutButton />
            </div>
          </header>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-h-0">
            <ChatArea 
              messages={messages?.page || []} 
              isGenerating={isGenerating} 
              conversationId={currentConversationId}
              currentBranchId={currentBranchId}
              shouldScrollToBottom={shouldScrollToBottom}
              onSwitchBranch={(branchId) => void handleSwitchBranch(branchId)}
              onBranchChanged={handleBranchChanged}
              onScrolled={handleScrolled}
            />
            
            <div className="border-t border-border/50 p-2 sm:p-4 bg-background/80 backdrop-blur-sm">
              <MessageInput 
                onSendMessage={(...args) => void handleSendMessage(...args)} 
                disabled={isGenerating}
                isGenerating={isGenerating}
                onStopGeneration={() => void handleStopGeneration()}
              />
            </div>
          </div>
        </div>


      </TooltipProvider>
    </div>
  );
}
