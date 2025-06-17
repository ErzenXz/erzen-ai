import { useState, useRef, useEffect, forwardRef, memo } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ArrowUp, Sparkles, Wrench, Search, Calculator, Clock, CloudRain, ChevronDown, Zap, Brain, Bot, Star, Plus, Eye, Cpu, DollarSign, Layers, StopCircle, BarChart3, ListTodo, Link, BookOpen, Code, Database, Camera } from "lucide-react";
import { AiOutlineDocker, AiOutlineOpenAI } from "react-icons/ai";
import { RiClaudeFill } from "react-icons/ri";
import { SiGooglegemini, SiX } from "react-icons/si";
import { TbBolt, TbRoute, TbWind } from "react-icons/tb";
import { HiLightningBolt } from "react-icons/hi";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PROVIDER_CONFIGS, getModelInfo, formatTokenCount, formatPricing } from "@/lib/models";
import { FileAttachment } from "./FileAttachment";
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// A simple hook to check for desktop screen sizes
const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isDesktop;
};

type AiProvider = "openai" | "anthropic" | "google" | "openrouter" | "groq" | "deepseek" | "grok" | "cohere" | "mistral";

// Define the valid tool types to match backend
type ValidTool = "web_search" | "deep_search" | "weather" | "datetime" | "calculator" | "thinking" | "memory" | "url_fetch" | "code_analysis" | "document_qa" | "task_planner" | "data_analysis" | "image_generation";

export interface AttachmentData {
  type: "image" | "file" | "audio" | "video";
  url: string;
  name: string;
  size?: number;
  storageId?: Id<"_storage">;
  extractedText?: string;
  mimeType?: string;
  isUploading?: boolean;
  uploadProgress?: number;
}

interface MessageInputProps {
  onSendMessage: (content: string, attachments?: AttachmentData[], selectedModel?: { provider: string; model: string; thinkingBudget?: string | number }, enabledTools?: ValidTool[]) => void;
  disabled?: boolean;
  isGenerating?: boolean;
  onStopGeneration?: () => void;
}

const ChatTextarea = forwardRef<HTMLTextAreaElement, any>((props, ref) => {
  return (
    <Textarea
      ref={ref}
      {...props}
      rows={1}
      placeholder="Message ErzenAI..."
      className="flex-1 resize-none border-0 shadow-none focus-visible:ring-0 bg-transparent py-3 px-0 text-base placeholder:text-muted-foreground/60 min-h-[40px] max-h-40"
    />
  );
});

// Helper function to get tool icons
const getToolIcon = (toolId: string) => {
  switch (toolId) {
    case 'web_search':
      return Search;
    case 'deep_search':
      return Zap;
    case 'weather':
      return CloudRain;
    case 'calculator':
      return Calculator;
    case 'datetime':
      return Clock;
    case 'thinking':
      return Brain;
    case 'memory':
      return Database;
    case 'url_fetch':
      return Link;
    case 'code_analysis':
      return Code;
    case 'document_qa':
      return BookOpen;
    case 'task_planner':
      return ListTodo;
    case 'data_analysis':
      return BarChart3;
    case 'image_generation':
      return Camera;
    default:
      return Wrench;
  }
};

// Helper function to get user-friendly thinking budget labels
const getThinkingBudgetLabel = (budget: string | number): string => {
  if (typeof budget === 'string') {
    return budget.charAt(0).toUpperCase() + budget.slice(1);
  }
  
  // Map numeric values to friendly names
  switch (budget) {
    case 0: return "Off";
    case 1024: return "Low";
    case 2048: return "Medium";
    case 4096: return "High";
    case 8192: return "Very High";
    case 12000: return "Max";
    case 15000: return "Max";
    case 24576: return "Max";
    default: return `${budget} tokens`;
  }
};

// Helper function to get thinking budget indicator
const getThinkingBudgetIndicator = (budget: string | number | undefined): { text: string; icon: React.ComponentType<{ size: number; className?: string }> } => {
  if (budget === undefined || budget === 0) {
    return { text: "", icon: Brain };
  }
  
  if (typeof budget === 'string') {
    return { text: budget.charAt(0).toUpperCase(), icon: Brain };
  }
  
  // Map numeric values to short indicators and icons
  switch (budget) {
    case 1024: return { text: "L", icon: Brain };
    case 2048: return { text: "M", icon: Brain };
    case 4096: return { text: "H", icon: Brain };
    case 8192: return { text: "VH", icon: Zap };
    case 12000:
    case 15000:
    case 24576: return { text: "MAX", icon: Sparkles };
    default: return { text: "?", icon: Brain };
  }
};

export const MessageInput = memo(function MessageInput({ onSendMessage, disabled, isGenerating, onStopGeneration }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<AttachmentData[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<AiProvider>("google");
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash-preview-05-20");
  const [enabledTools, setEnabledTools] = useState<ValidTool[]>([]);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [activeTab, setActiveTab] = useState<"favorites" | "all">("favorites");
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ bottom: number; left: number } | null>(null);
  const [selectedThinkingBudget, setSelectedThinkingBudget] = useState<string | number | undefined>(2048);
  const [availableTools, setAvailableTools] = useState<any[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelSelectorRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isDesktop = useIsDesktop();
  const preferences = useQuery(api.preferences.get);
  const updatePreferences = useMutation(api.preferences.update);
  const updateModelReasoningEffort = useMutation(api.preferences.updateModelReasoningEffort);
  const userApiKeys = useQuery(api.apiKeys.list) || [];
  const toggleFavoriteModel = useMutation(api.preferences.toggleFavoriteModel);
  const getAvailableProviders = useAction(api.ai.getAvailableProviders);
  const getAvailableTools = useAction(api.ai.getAvailableTools);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const storeFileMetadata = useMutation(api.files.storeFileMetadata);
  const extractTextFromFile = useAction(api.files.extractTextFromFile);

  const favoriteModels = preferences?.favoriteModels || [];

  // Get current model info
  const currentModelInfo = getModelInfo(selectedModel);
  const modelSupportsTools = currentModelInfo.supportsTools;
  const modelIsMultimodal = currentModelInfo.isMultimodal;
  const modelSupportsThinking = currentModelInfo.supportsThinking;
  const modelThinkingBudgets = currentModelInfo.thinkingBudgets;

  useEffect(() => {
    if (preferences) {
      setEnabledTools((preferences.enabledTools as ValidTool[]) ?? []);
      setSelectedProvider(preferences.aiProvider ?? "google");
      setSelectedModel(preferences.model ?? "gemini-2.5-flash-preview-05-20");
    }
  }, [preferences]);

  // Load saved reasoning effort for current model
  useEffect(() => {
    if (preferences && selectedModel) {
      const reasoningEfforts: Record<string, string | number> = preferences.modelReasoningEfforts || {};
      const savedReasoningEffort = reasoningEfforts[selectedModel];
      if (savedReasoningEffort !== undefined) {
        setSelectedThinkingBudget(savedReasoningEffort);
      } else {
        // Set default reasoning effort based on model type
        const modelInfo = getModelInfo(selectedModel);
        if (modelInfo.supportsThinking && modelInfo.thinkingBudgets) {
          if (Array.isArray(modelInfo.thinkingBudgets) && modelInfo.thinkingBudgets.length > 0) {
            const defaultBudget = modelInfo.thinkingBudgets[Math.floor(modelInfo.thinkingBudgets.length / 2)];
            setSelectedThinkingBudget(defaultBudget);
          }
        } else {
          setSelectedThinkingBudget(undefined);
        }
      }
    }
  }, [preferences, selectedModel]);

  // Load available providers
  useEffect(() => {
    const loadProviders = async () => {
      try {
        const providers = await getAvailableProviders();
        setAvailableProviders(providers);
      } catch (error) {
        console.error("Failed to load available providers:", error);
        const fallbackProviders = Object.keys(PROVIDER_CONFIGS).filter(provider => {
          if (provider === "openai" || provider === "google") return true;
          return userApiKeys.some(key => key.provider === provider && key.hasKey);
        });
        setAvailableProviders(fallbackProviders);
      }
    };
    void loadProviders();
  }, [getAvailableProviders, userApiKeys]);

  // Load available tools
  useEffect(() => {
    const loadTools = async () => {
      try {
        const toolsConfig = await getAvailableTools();
        const toolsArray = Object.values(toolsConfig).map(tool => ({
          ...tool,
          icon: getToolIcon(tool.id),
        }));
        setAvailableTools(toolsArray);
      } catch (error) {
        console.error("Failed to load available tools:", error);
        setAvailableTools([]);
      }
    };
    void loadTools();
  }, [getAvailableTools]);

  // Note: We don't auto-clear enabled tools when model doesn't support them
  // This preserves user preferences when switching between models
  // Tools are simply not sent to models that don't support them

  // Model selector outside click handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isClickInsideButton = modelSelectorRef.current?.contains(target);
      const isClickInsideDropdown = dropdownRef.current?.contains(target);

      if (!isClickInsideButton && !isClickInsideDropdown) {
        setShowModelSelector(false);
        setSearchQuery("");
        setDropdownPosition(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    adjustTextareaHeight();
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleFileUpload = async (files: FileList) => {
    if (!files.length) return;

    setIsUploadingFile(true);
    
    try {
      for (const file of Array.from(files)) {
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error("File Too Large", {
            description: `${file.name} is too large. Maximum size is 10MB.`,
          });
          continue;
        }

        // Check file type support based on current model
        const supportedImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
        const supportedFileTypes = ['application/pdf', 'text/plain', 'text/csv', 'application/json'];
        // Add audio support for multimodal models (video disabled for now)
        const supportedAudioTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/mp4', 'audio/webm', 'audio/ogg'];
        
        const isImage = supportedImageTypes.includes(file.type);
        const isAudio = supportedAudioTypes.includes(file.type);
        const isFile = supportedFileTypes.includes(file.type) || file.name.toLowerCase().endsWith('.txt') || file.name.toLowerCase().endsWith('.md');
        
        if (!isImage && !isFile && !isAudio) {
          toast.warning("Unsupported File Type", {
            description: `${file.name} - Supported types: Images (PNG, JPEG, GIF, WebP), Audio (MP3, WAV, MP4, WebM), PDFs, and text files. Video uploads are temporarily disabled.`,
          });
          continue;
        }

        // Provide guidance about multimodal vs text-only models
        if ((isImage || isAudio) && !modelIsMultimodal) {
          const mediaType = isImage ? 'Image' : 'Audio';
          toast.info(`${mediaType} Upload with Text Model`, {
            description: `${currentModelInfo.displayName} doesn't support ${mediaType.toLowerCase()} files directly. The content will be processed for text extraction where possible.`,
            action: {
              label: "Choose Multimodal Model",
              onClick: () => setShowModelSelector(true),
            },
          });
        }

        // Get file URL for immediate display (especially for images)
        const fileUrl = URL.createObjectURL(file);

        // Create attachment with immediate preview - determine attachment type
        let attachmentType: "image" | "file" | "audio" | "video" = "file";
        if (isImage) attachmentType = "image";
        else if (isAudio) attachmentType = "audio";
        
        const newAttachment: AttachmentData = {
          type: attachmentType,
          url: fileUrl,
          name: file.name,
          size: file.size,
          mimeType: file.type,
          isUploading: true,
          uploadProgress: 0,
        };

        // Add to attachments immediately so user sees the file right away
        setAttachments(prev => [...prev, newAttachment]);

        // Start the actual upload process
        try {
          // Generate upload URL
          const uploadUrl = await generateUploadUrl();
          
          // Update progress to 10%
          setAttachments(prev => prev.map(att => 
            att.url === fileUrl ? { ...att, uploadProgress: 10 } : att
          ));

          // Upload file to Convex storage
          const result = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          });

          if (!result.ok) {
            throw new Error(`Failed to upload ${file.name}`);
          }

          const { storageId } = await result.json();

          // Update progress to 50%
          setAttachments(prev => prev.map(att => 
            att.url === fileUrl ? { ...att, uploadProgress: 50 } : att
          ));

          // Extract text from file if it's not a media file or if using a non-multimodal model
          let extractedText = "";
          if ((!isImage && !isAudio) || !modelIsMultimodal) {
            try {
              extractedText = await extractTextFromFile({ 
                storageId, 
                fileType: file.type 
              });
            } catch (error) {
              console.error("Failed to extract text:", error);
              if (isAudio) {
                extractedText = `[Audio file: ${file.name}] - Audio transcription not available. Use a multimodal model for audio processing.`;
              } else {
                extractedText = `[Failed to extract text from ${file.name}]`;
              }
            }
          }

          // Update progress to 80%
          setAttachments(prev => prev.map(att => 
            att.url === fileUrl ? { ...att, uploadProgress: 80 } : att
          ));

          // Store file metadata
          await storeFileMetadata({
            storageId,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            extractedText,
          });

          // Update attachment with final data
          setAttachments(prev => prev.map(att => 
            att.url === fileUrl ? {
              ...att,
              storageId,
              extractedText,
              mimeType: file.type, // Ensure mimeType is preserved
              isUploading: false,
              uploadProgress: 100,
            } : att
          ));

          // Show success message with model-specific guidance
          if (isImage && modelIsMultimodal) {
            toast.success("Image uploaded successfully", {
              description: `${file.name} will be analyzed by the multimodal model.`,
            });
          } else if (isAudio && modelIsMultimodal) {
            toast.success("Audio uploaded successfully", {
              description: `${file.name} will be processed by the multimodal model.`,
            });
          } else if (isFile && modelIsMultimodal) {
            toast.success("File uploaded successfully", {
              description: `${file.name} - Content extracted and ready for analysis.`,
            });
          } else {
            toast.success("File uploaded successfully", {
              description: `${file.name} - Text content extracted for processing.`,
            });
          }

        } catch (uploadError) {
          console.error("Upload failed for file:", file.name, uploadError);
          // Remove the failed attachment
          setAttachments(prev => prev.filter(att => att.url !== fileUrl));
          toast.error("File Upload Failed", {
            description: `Failed to upload ${file.name}. Please check the file size and format.`,
          });
        }
      }
    } catch (error) {
      console.error("File upload failed:", error);
      toast.error("Upload Error", {
        description: "Failed to upload files. Please check your internet connection and try again.",
      });
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    void handleFileUpload(files);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if any attachments are still uploading
    const hasUploadingAttachments = attachments.some(att => att.isUploading);
    
    if (!message.trim() && attachments.length === 0 || disabled || hasUploadingAttachments) {
      if (hasUploadingAttachments) {
        toast.warning("Please wait", {
          description: "Files are still uploading. Please wait for upload to complete.",
        });
      }
      return;
    }

    // Check if using non-multimodal model with images
    const hasImages = attachments.some(att => att.type === "image");
    if (hasImages && !modelIsMultimodal) {
      toast.warning("Model Doesn't Support Images", {
        description: `${currentModelInfo.displayName} doesn't support images. Please choose a multimodal model or remove image attachments.`,
        action: {
          label: "Choose Model",
          onClick: () => setShowModelSelector(true),
        },
      });
      return;
    }

    onSendMessage(
      message, 
      attachments.length > 0 ? attachments : undefined,
      { 
        provider: selectedProvider, 
        model: selectedModel,
        thinkingBudget: modelSupportsThinking ? selectedThinkingBudget : undefined
      },
      modelSupportsTools ? enabledTools : [] // Only send tools if model supports them
    );
    setMessage("");
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };
  
  const handleToggleModelSelector = () => {
    if (showModelSelector) {
      setShowModelSelector(false);
    } else {
      if (isDesktop && modelSelectorRef.current) {
        const rect = modelSelectorRef.current.getBoundingClientRect();
        setDropdownPosition({
          bottom: window.innerHeight - rect.top + 8, // 8px margin above the button
          left: rect.left,
        });
      }
      setShowModelSelector(true);
    }
  };

  const handleModelSelect = (provider: string, model: string) => {
    const typedProvider = provider as AiProvider;
    setSelectedProvider(typedProvider);
    setSelectedModel(model);
    if (preferences) {
      void updatePreferences({ ...preferences, aiProvider: typedProvider, model });
    }
  };
  
  const handleToolsChange = (tools: ValidTool[]) => {
    setEnabledTools(tools);
    if (preferences) {
      void updatePreferences({ ...preferences, enabledTools: tools });
    }
  };

  /* Toggle a tool on/off, persisting the preference */
  const handleToggleTool = (toolId: ValidTool) => {
    const newTools = enabledTools.includes(toolId)
      ? enabledTools.filter((t) => t !== toolId)
      : [...enabledTools, toolId];
    handleToolsChange(newTools);
  };

  const handleModelSelectInternal = (provider: AiProvider, model: string) => {
    handleModelSelect(provider, model);
    setShowModelSelector(false);
    setSearchQuery("");
  };

  const handleToggleFavorite = async (e: React.MouseEvent, provider: string, model: string) => {
    e.stopPropagation();
    await toggleFavoriteModel({ provider, model });
  };

  const handleReasoningEffortChange = async (budget: string | number) => {
    setSelectedThinkingBudget(budget);
    await updateModelReasoningEffort({ 
      model: selectedModel, 
      reasoningEffort: budget 
    });
  };

  const isFavorite = (provider: string, model: string) => {
    return favoriteModels.some(fav => fav.provider === provider && fav.model === model);
  };

  const getFavoriteModels = () => {
    const filtered = favoriteModels.filter(fav =>
      availableProviders.includes(fav.provider) &&
      PROVIDER_CONFIGS[fav.provider as AiProvider]?.models.includes(fav.model)
    );

    if (!searchQuery) return filtered;

    return filtered.filter(fav => {
      const modelInfo = getModelInfo(fav.model);
      return modelInfo.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fav.model.toLowerCase().includes(searchQuery.toLowerCase());
    });
  };

  const getFilteredProviders = () => {
    if (!searchQuery) return availableProviders;

    return availableProviders.filter(provider => {
      const providerModels = PROVIDER_CONFIGS[provider as AiProvider].models;
      return providerModels.some(model => {
        const modelInfo = getModelInfo(model);
        return modelInfo.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          model.toLowerCase().includes(searchQuery.toLowerCase());
      });
    });
  };

  const getFilteredModels = (provider: string) => {
    const models = PROVIDER_CONFIGS[provider as AiProvider].models;
    if (!searchQuery) return models;

    return models.filter(model => {
      const modelInfo = getModelInfo(model);
      return modelInfo.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.toLowerCase().includes(searchQuery.toLowerCase());
    });
  };

  const getProviderIcon = (provider: string) => {
    const providerConfig = PROVIDER_CONFIGS[provider as AiProvider];
    switch (provider) {
      case "openai": return AiOutlineOpenAI;
      case "google": return SiGooglegemini;
      case "anthropic": return RiClaudeFill;
      case "openrouter": return TbRoute; 
      case "groq": return HiLightningBolt;
      case "deepseek": return AiOutlineDocker;
      case "grok": return SiX;
      case "cohere": return TbBolt;
      case "mistral": return TbWind;
      default: return Bot;
    }
  };

  const currentProvider = PROVIDER_CONFIGS[selectedProvider];
  const IconComponent = getProviderIcon(selectedProvider);

  return (
    <div 
      className="w-full max-w-4xl mx-auto px-4"
      onDrop={handleFileDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <form onSubmit={handleSubmit} className="relative">
                  <div className="flex flex-col gap-4 rounded-2xl border bg-gradient-to-br from-background/95 via-background/90 to-muted/30 backdrop-blur-sm shadow-xl p-4 mx-auto relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/3 via-transparent to-accent/3 pointer-events-none"></div>
            <div className="relative z-10">
        
        {/* File input (hidden) */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept="image/*,audio/*,.pdf,.doc,.docx,.txt,.md,.json,.csv"
          onChange={(e) => {
            if (e.target.files) {
              void handleFileUpload(e.target.files);
              e.target.value = ""; // Reset input
            }
          }}
        />

        {/* Attachment preview */}
        {attachments.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pb-3 border-b border-border/50">
            {attachments.map((attachment, index) => (
              <FileAttachment
                key={index}
                type={attachment.type}
                name={attachment.name}
                url={attachment.url}
                size={attachment.size}
                extractedText={attachment.extractedText}
                isUploading={attachment.isUploading}
                uploadProgress={attachment.uploadProgress}
                showRemove={true}
                onRemove={() => removeAttachment(index)}
                className="w-full"
              />
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-2">
          {/* Left side controls */}
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon"
                    className="h-9 w-9 rounded-lg"
                    onClick={handleFileSelect}
                    disabled={isUploadingFile}
                  >
                    <Plus size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{isUploadingFile ? "Uploading..." : "Attach files"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Model Selector with Rich Tooltips */}
            <div className="relative" ref={modelSelectorRef}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleToggleModelSelector}
                      className="h-9 px-2 sm:px-3 py-0 text-sm font-medium hover:bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-1.5">
                        <IconComponent size={14} />
                        <span className="max-w-[100px] sm:max-w-24 truncate">{currentModelInfo.displayName}</span>
                        <ChevronDown size={12} className={cn("transition-transform", showModelSelector && "rotate-180")} />
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-sm">
                    <div className="space-y-2">
                      <div className="font-medium">{currentModelInfo.displayName}</div>
                      <div className="text-xs space-y-1">
                        <div className="flex items-center gap-2">
                          <Cpu size={12} />
                          <span>Context: {formatTokenCount(currentModelInfo.contextWindow)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Layers size={12} />
                          <span>Output: {formatTokenCount(currentModelInfo.maxOutputTokens)}</span>
                        </div>
                        {currentModelInfo.pricing && (
                          <div className="flex items-center gap-2">
                            <DollarSign size={12} />
                            <span>
                              ${formatPricing(currentModelInfo.pricing.input)}/M in, 
                              ${formatPricing(currentModelInfo.pricing.output)}/M out
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Wrench size={12} />
                          <span>{currentModelInfo.supportsTools ? "Tools: Yes" : "Tools: No"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Eye size={12} />
                          <span>{currentModelInfo.isMultimodal ? "Vision: Yes" : "Vision: No"}</span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {currentModelInfo.description}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {showModelSelector && !isDesktop && createPortal(
                <div
                  className="fixed inset-0 bg-black/60 z-[9998]"
                  onClick={() => setShowModelSelector(false)}
                />,
                document.body
              )}

              {showModelSelector && createPortal(
                <div
                  ref={dropdownRef}
                  style={isDesktop && dropdownPosition ? { 
                    position: 'fixed',
                    bottom: `${dropdownPosition.bottom}px`, 
                    left: `${dropdownPosition.left}px`
                  } : {}}
                  className={cn(
                    "bg-popover border rounded-xl shadow-xl z-[9999] overflow-hidden flex flex-col",
                    isDesktop 
                      ? "h-[45vh] w-[400px]"
                      : "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md max-h-[80vh]"
                  )}
                >
                  {/* Search */}
                  <div className="p-3 border-b border-border/50">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search models..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex border-b border-border/50 text-sm">
                    <button
                      onClick={() => setActiveTab("favorites")}
                      className={cn(
                        "flex-1 px-4 py-3 font-medium transition-colors",
                        activeTab === "favorites"
                          ? "bg-primary/10 text-primary border-b-2 border-primary"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Star size={14} className="inline mr-2" />
                      Favorites
                    </button>
                    <button
                      onClick={() => setActiveTab("all")}
                      className={cn(
                        "flex-1 px-4 py-3 font-medium transition-colors",
                        activeTab === "all"
                          ? "bg-primary/10 text-primary border-b-2 border-primary"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      All Models
                    </button>
                  </div>

                  <div className="overflow-y-auto">
                    {activeTab === "favorites" ? (
                      <div className="p-2">
                        {getFavoriteModels().length > 0 ? (
                          getFavoriteModels().map(fav => {
                            const modelInfo = getModelInfo(fav.model);
                            return (
                              <TooltipProvider key={`${fav.provider}:${fav.model}`}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => handleModelSelectInternal(fav.provider as AiProvider, fav.model)}
                                      className={cn(
                                        "w-full text-left px-3 py-2.5 hover:bg-muted/50 text-sm rounded-lg flex items-center justify-between transition-colors",
                                        selectedProvider === fav.provider && selectedModel === fav.model
                                          ? 'bg-primary/10 text-primary'
                                          : 'text-foreground'
                                      )}
                                    >
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        {(() => {
                                          const IconComp = getProviderIcon(fav.provider);
                                          return <IconComp size={14} />;
                                        })()}
                                        <span className="font-medium truncate">{modelInfo.displayName}</span>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                          {modelInfo.parameters && (
                                            <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                                              {modelInfo.parameters}
                                            </span>
                                          )}
                                          {modelInfo.supportsTools && (
                                            <Wrench size={12} className="text-green-500" />
                                          )}
                                          {modelInfo.isMultimodal && (
                                            <Eye size={12} className="text-blue-500" />
                                          )}
                                          {modelInfo.supportsThinking && (
                                            <Brain size={12} className="text-purple-500" />
                                          )}
                                        </div>
                                      </div>
                                      <Star size={14} className="text-yellow-500 fill-current ml-2" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="left" className="max-w-sm">
                                    <div className="space-y-2">
                                      <div className="font-medium">{modelInfo.displayName}</div>
                                      <div className="text-xs space-y-1">
                                        <div>Provider: {PROVIDER_CONFIGS[fav.provider as AiProvider].name}</div>
                                        <div>Context: {formatTokenCount(modelInfo.contextWindow)}</div>
                                        <div>Max Output: {formatTokenCount(modelInfo.maxOutputTokens)}</div>
                                        {modelInfo.pricing && (
                                          <div>
                                            Pricing: ${formatPricing(modelInfo.pricing.input)}/M input, 
                                            ${formatPricing(modelInfo.pricing.output)}/M output
                                          </div>
                                        )}
                                        <div>Tools: {modelInfo.supportsTools ? "✓" : "✗"}</div>
                                        <div>Vision: {modelInfo.isMultimodal ? "✓" : "✗"}</div>
                                        <div>Capabilities: {modelInfo.capabilities.join(", ")}</div>
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {modelInfo.description}
                                      </div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })
                        ) : (
                          <div className="p-4 text-sm text-muted-foreground text-center">
                            {searchQuery ? "No matching favorites found." : "No favorites yet. Star models below to add them here."}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-2">
                        {getFilteredProviders().length > 0 ? (
                          getFilteredProviders().map(provider => {
                            const filteredModels = getFilteredModels(provider);
                            if (filteredModels.length === 0) return null;

                            return (
                              <div key={provider} className="mb-3">
                                <div className="px-3 py-2 bg-muted/30 text-sm font-medium text-muted-foreground flex items-center gap-3 rounded-lg">
                                  {(() => {
                                    const IconComp = getProviderIcon(provider);
                                    return <IconComp size={14} />;
                                  })()}
                                  {PROVIDER_CONFIGS[provider as AiProvider].name}
                                  {(provider === "openai" || provider === "google") && (
                                    <Badge variant="secondary" className="text-xs px-2 py-0.5">Built-in</Badge>
                                  )}
                                </div>
                                <div className="mt-1 space-y-1">
                                  {filteredModels.map(model => {
                                    const modelInfo = getModelInfo(model);
                                    return (
                                      <TooltipProvider key={model}>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <button
                                              onClick={() => handleModelSelectInternal(provider as AiProvider, model)}
                                              className={cn(
                                                "w-full text-left px-3 py-2.5 hover:bg-muted/50 text-sm rounded-lg flex items-center justify-between transition-colors",
                                                selectedProvider === provider && selectedModel === model
                                                  ? 'bg-primary/10 text-primary'
                                                  : 'text-foreground'
                                              )}
                                            >
                                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <span className="truncate">{modelInfo.displayName}</span>
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                  {modelInfo.parameters && (
                                                    <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                                                      {modelInfo.parameters}
                                                    </span>
                                                  )}
                                                  {modelInfo.supportsTools && (
                                                    <Wrench size={12} className="text-green-500" />
                                                  )}
                                                  {modelInfo.isMultimodal && (
                                                    <Eye size={12} className="text-blue-500" />
                                                  )}
                                                  {modelInfo.supportsThinking && (
                                                    <Brain size={12} className="text-purple-500" />
                                                  )}
                                                </div>
                                              </div>
                                              <div
                                                onClick={(e) => void handleToggleFavorite(e, provider, model)}
                                                className="p-1 hover:bg-muted rounded-md flex-shrink-0 cursor-pointer"
                                              >
                                                <Star
                                                  size={14}
                                                  className={isFavorite(provider, model) ? "text-yellow-500 fill-current" : "text-muted-foreground"}
                                                />
                                              </div>
                                            </button>
                                          </TooltipTrigger>
                                          <TooltipContent side="left" className="max-w-sm">
                                            <div className="space-y-2">
                                              <div className="font-medium">{modelInfo.displayName}</div>
                                              <div className="text-xs space-y-1">
                                                <div>Provider: {PROVIDER_CONFIGS[provider as AiProvider].name}</div>
                                                <div>Context: {formatTokenCount(modelInfo.contextWindow)}</div>
                                                <div>Max Output: {formatTokenCount(modelInfo.maxOutputTokens)}</div>
                                                {modelInfo.pricing && (
                                                  <div>
                                                    Pricing: ${formatPricing(modelInfo.pricing.input)}/M input, 
                                                    ${formatPricing(modelInfo.pricing.output)}/M output
                                                  </div>
                                                )}
                                                <div>Tools: {modelInfo.supportsTools ? "✓" : "✗"}</div>
                                                <div>Vision: {modelInfo.isMultimodal ? "✓" : "✗"}</div>
                                                <div>Capabilities: {modelInfo.capabilities.join(", ")}</div>
                                              </div>
                                              <div className="text-xs text-muted-foreground">
                                                {modelInfo.description}
                                              </div>
                                            </div>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-4 text-sm text-muted-foreground text-center">
                            No models found matching "{searchQuery}".
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>,
                document.body
              )}
            </div>
          </div>

          {/* Message Input */}
          <div className="flex-1 w-full px-0 sm:px-4">
            <ChatTextarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
            />
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-1 self-end">
            {/* Tools - Disabled if model doesn't support tools */}
            <Dialog>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={!modelSupportsTools}
                        className={cn(
                          "h-9 w-9 relative rounded-lg",
                          !modelSupportsTools 
                            ? "opacity-50 cursor-not-allowed" 
                              : enabledTools.length > 0 
                                ? "text-primary" 
                                : "text-muted-foreground"
                        )}
                      >
                        <Wrench size={16} />
                        {enabledTools.length > 0 && modelSupportsTools && (
                          <div className="absolute -top-1 -right-1 h-4 w-4 bg-primary rounded-full text-[10px] text-primary-foreground flex items-center justify-center">
                            {enabledTools.length}
                          </div>
                        )}
                      </Button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>
                      {!modelSupportsTools 
                        ? `Tools disabled - ${currentModelInfo.displayName} doesn't support tools` 
                        : `Tools ${enabledTools.length > 0 ? `(${enabledTools.length})` : ""}`
                      }
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {modelSupportsTools && (
                <DialogContent className="max-w-md w-[90vw]">
                  <DialogHeader>
                    <DialogTitle>Available Tools</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {availableTools.map((tool: any) => {
                      const IconComponent = tool.icon;
                      return (
                        <div key={tool.id} className="flex items-center justify-between">
                          <Label htmlFor={`tool-${tool.id}`} className="flex items-center gap-3 cursor-pointer">
                            <IconComponent size={16} />
                            <div className="flex flex-col">
                              <span className="font-medium">{tool.name}</span>
                              <span className="text-xs text-muted-foreground">{tool.description}</span>
                            </div>
                            {tool.premium && (
                              <Badge variant="secondary" className="ml-2 text-xs">Pro</Badge>
                            )}
                          </Label>
                          <Switch
                            id={`tool-${tool.id}`}
                            checked={enabledTools.includes(tool.id)}
                            onCheckedChange={() => handleToggleTool(tool.id)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </DialogContent>
              )}
            </Dialog>

            {/* Thinking Budget - Only show if model supports thinking AND has controllable budgets */}
            {modelSupportsThinking && modelThinkingBudgets && modelThinkingBudgets.length > 0 && (
              <DropdownMenu>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-9 w-9 relative rounded-lg",
                            selectedThinkingBudget !== undefined && selectedThinkingBudget !== 0
                              ? "text-primary" 
                              : "text-muted-foreground"
                          )}
                        >
                          {(() => {
                            const indicator = getThinkingBudgetIndicator(selectedThinkingBudget);
                            const IconComponent = indicator.icon;
                            return (
                              <>
                                <IconComponent size={16} />
                                {indicator.text && (
                                  <div className="absolute -top-1 -right-1 h-5 w-auto min-w-[20px] bg-primary text-primary-foreground rounded-full text-[10px] font-bold flex items-center justify-center px-1">
                                    {indicator.text}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>
                        Reasoning Effort{selectedThinkingBudget !== undefined ? ` (${getThinkingBudgetLabel(selectedThinkingBudget)})` : ""}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Reasoning Effort</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {modelThinkingBudgets.map((budget) => (
                    <DropdownMenuCheckboxItem
                      key={budget}
                      checked={selectedThinkingBudget === budget}
                      onCheckedChange={() => void handleReasoningEffortChange(budget)}
                    >
                      {getThinkingBudgetLabel(budget)}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Send/Stop Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type={isGenerating ? "button" : "submit"}
                    size="icon"
                    onClick={isGenerating ? onStopGeneration : undefined}
                    disabled={!isGenerating && (disabled || (!message.trim() && attachments.length === 0) || isUploadingFile || attachments.some(att => att.isUploading))}
                    className={cn(
                      "h-9 w-9 transition-all",
                      isGenerating
                        ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-md"
                        : (message.trim() || attachments.length > 0) && !attachments.some(att => att.isUploading)
                          ? "bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
                          : "bg-muted text-muted-foreground cursor-not-allowed rounded-lg"
                    )}
                  >
                    {isGenerating ? (
                      <StopCircle size={18} />
                    ) : (
                      <ArrowUp size={16} />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>
                    {isGenerating 
                      ? "Stop generation" 
                      : attachments.some(att => att.isUploading)
                        ? "Uploading files..."
                        : "Send message"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        </div>
      </div>
    </form>
    </div>
  );
});
