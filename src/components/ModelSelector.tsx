import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Star } from "lucide-react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PROVIDER_CONFIGS, getModelDisplayName, getModelInfo } from "@/lib/models";
import { ModelTooltip } from "./ModelTooltip";

interface ModelSelectorProps {
  selectedProvider: string;
  selectedModel: string;
  onModelSelect: (provider: string, model: string) => void;
  /** Current enabled tool ids */
  enabledTools?: string[];
  /** Callback called when tools are toggled in parent component */
  onToolsChange?: (tools: string[]) => void;
}

export function ModelSelector({ selectedProvider, selectedModel, onModelSelect }: ModelSelectorProps) {
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [activeTab, setActiveTab] = useState<"favorites" | "all">("favorites");
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const modelSelectorRef = useRef<HTMLDivElement>(null);

  const preferences = useQuery(api.preferences.get);
  const userApiKeys = useQuery(api.apiKeys.list) || [];
  const toggleFavoriteModel = useMutation(api.preferences.toggleFavoriteModel);
  const getAvailableProviders = useAction(api.ai.getAvailableProviders);

  const favoriteModels = preferences?.favoriteModels || [];

  // Load available providers on mount
  useEffect(() => {
    const loadProviders = async () => {
      try {
        const providers = await getAvailableProviders();
        setAvailableProviders(providers);
      } catch (error) {
        console.error("Failed to load available providers:", error);
        // Fallback to basic logic
        const fallbackProviders = Object.keys(PROVIDER_CONFIGS).filter(provider => {
          if (provider === "openai" || provider === "google") return true;
          return userApiKeys.some(key => key.provider === provider && key.hasKey);
        });
        setAvailableProviders(fallbackProviders);
      }
    };
    void loadProviders();
  }, [getAvailableProviders, userApiKeys]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target as Node)) {
        setShowModelSelector(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleModelSelectInternal = (provider: string, model: string) => {
    onModelSelect(provider, model);
    setShowModelSelector(false);
  };

  const handleToggleFavorite = (e: React.MouseEvent, provider: string, model: string) => {
    e.stopPropagation();
    void toggleFavoriteModel({ provider, model });
  };

  const isFavorite = (provider: string, model: string) => {
    return favoriteModels.some(fav => fav.provider === provider && fav.model === model);
  };

  const getFavoriteModels = () => {
    return favoriteModels.filter(fav => 
      availableProviders.includes(fav.provider) &&
      PROVIDER_CONFIGS[fav.provider]?.models.includes(fav.model)
    );
  };

  return (
    <div className="relative" ref={modelSelectorRef}>
      <Button
        variant="outline"
        onClick={() => setShowModelSelector(!showModelSelector)}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 h-7 text-xs transition-all font-normal border-border/50",
          "hover:border-border hover:bg-muted/50",
          showModelSelector && "bg-muted border-border"
        )}
      >
        <span className="text-xs">{PROVIDER_CONFIGS[selectedProvider].icon}</span>
        <span className="text-muted-foreground max-w-24 truncate text-xs">
          {getModelDisplayName(selectedModel)}
        </span>
        <ChevronDown size={12} className={cn(
          "transition-transform text-muted-foreground/70", 
          showModelSelector && 'rotate-180'
        )} />
      </Button>

      {showModelSelector && (
        <div className="absolute bottom-full mb-2 left-0 bg-popover border border-border rounded-md shadow-md z-[9999] min-w-72 max-h-72 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-border bg-muted/30">
            <button
              onClick={() => setActiveTab("favorites")}
              className={cn(
                "flex-1 px-3 py-2 text-xs font-medium transition-colors",
                activeTab === "favorites"
                  ? "bg-background text-foreground border-b border-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Star size={12} className="inline mr-1" />
              Favorites
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={cn(
                "flex-1 px-3 py-2 text-xs font-medium transition-colors",
                activeTab === "all"
                  ? "bg-background text-foreground border-b border-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              All Models
            </button>
          </div>

          <div className="overflow-y-auto max-h-56">
            {activeTab === "favorites" ? (
              <div>
                {getFavoriteModels().length > 0 ? (
                  getFavoriteModels().map(fav => {
                    const modelInfo = getModelInfo(fav.model);
                    return (
                      <ModelTooltip key={`${fav.provider}:${fav.model}`} modelInfo={modelInfo}>
                        <button
                          onClick={() => handleModelSelectInternal(fav.provider, fav.model)}
                          className={cn(
                            "w-full text-left px-3 py-2 hover:bg-muted/50 text-xs flex items-center justify-between transition-colors",
                            selectedProvider === fav.provider && selectedModel === fav.model
                              ? 'bg-accent text-accent-foreground'
                              : 'text-foreground'
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs">{PROVIDER_CONFIGS[fav.provider]?.icon}</span>
                            <span className="text-xs font-medium">{getModelDisplayName(fav.model)}</span>
                          </div>
                          <Star size={12} className="text-yellow-500 fill-current flex-shrink-0" />
                        </button>
                      </ModelTooltip>
                    );
                  })
                ) : (
                  <div className="p-4 text-xs text-muted-foreground text-center">
                    No favorites yet. Star models to add them here.
                  </div>
                )}
              </div>
            ) : (
              <div>
                {availableProviders.map(provider => (
                  <div key={provider} className="border-b border-border/50 last:border-b-0">
                    <div className="px-3 py-1.5 bg-muted/20 font-medium text-xs text-muted-foreground flex items-center gap-2">
                      <span className="text-xs">{PROVIDER_CONFIGS[provider]?.icon}</span>
                      <span>{PROVIDER_CONFIGS[provider]?.name}</span>
                      {PROVIDER_CONFIGS[provider]?.isBuiltIn && (
                        <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] rounded-sm font-medium">Built-in</span>
                      )}
                    </div>
                    {PROVIDER_CONFIGS[provider]?.models.map(model => {
                      const modelInfo = getModelInfo(model);
                      return (
                        <ModelTooltip key={model} modelInfo={modelInfo}>
                          <button
                            onClick={() => handleModelSelectInternal(provider, model)}
                            className={cn(
                              "w-full text-left px-3 py-2 hover:bg-muted/50 text-xs flex items-center justify-between transition-colors",
                              selectedProvider === provider && selectedModel === model
                                ? 'bg-accent text-accent-foreground'
                                : 'text-foreground'
                            )}
                          >
                            <span className="text-xs">{getModelDisplayName(model)}</span>
                            <div
                              onClick={(e) => handleToggleFavorite(e, provider, model)}
                              className="p-1 hover:bg-muted rounded flex-shrink-0 cursor-pointer"
                            >
                              <Star 
                                size={12} 
                                className={cn(
                                  "transition-colors",
                                  isFavorite(provider, model) 
                                    ? "text-yellow-500 fill-current" 
                                    : "text-muted-foreground hover:text-foreground"
                                )} 
                              />
                            </div>
                          </button>
                        </ModelTooltip>
                      );
                    })}
                  </div>
                ))}
                
                {availableProviders.length <= 2 && (
                  <div className="p-3 text-xs text-muted-foreground text-center">
                    Add API keys in settings for more providers
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
