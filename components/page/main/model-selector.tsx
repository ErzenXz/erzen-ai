"use client"

import React, { useState, useEffect } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Bot, Sparkles, Zap, Brain, Flame, Cpu, Cloud, BrainCircuit, Pin, PinOff } from 'lucide-react'
import { AIModel } from "@/lib/types"
import { fetchModels } from "@/lib/api"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Utility functions
const getProviderIcon = (modelType: string) => {
  const type = modelType.toLowerCase();
  
  // Check for provider names in the type field
  if (type.includes('google') || type.includes('gemini')) return Sparkles; // Google/Gemini
  if (type.includes('openai') || type.includes('gpt')) return Zap; // OpenAI/GPT
  if (type.includes('anthropic') || type.includes('claude')) return Brain; // Claude/Anthropic
  if (type.includes('groq')) return Flame; // Groq
  if (type.includes('openrouter')) return BrainCircuit; // OpenRouter
  if (type.includes('fireworks')) return Cpu; // Fireworks
  if (type.includes('mistral')) return Cloud; // Mistral

  return Bot; // Default
}


// Default preferred models by name (these will be matched against model descriptions)
const DEFAULT_PREFERRED_MODELS = [
  "Gemini Flash 2.5",
  "GPT 4.1",
  "GPT 4o",
  "Llama 4 Scout",
  "Claude 3.5 Sonnet",
];

interface ModelSelectorProps {
  readonly value: string
  readonly onChange: (value: string) => void
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [models, setModels] = useState<AIModel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("preferred")
  const [preferredModels, setPreferredModels] = useState<string[]>([])

  // Load preferred models from localStorage on mount
  useEffect(() => {
    try {
      const savedPreferredModels = localStorage.getItem("preferredModels");
      if (savedPreferredModels) {
        setPreferredModels(JSON.parse(savedPreferredModels));
      } else {
        setPreferredModels(DEFAULT_PREFERRED_MODELS);
        localStorage.setItem("preferredModels", JSON.stringify(DEFAULT_PREFERRED_MODELS));
      }
    } catch (err) {
      console.error("Error loading preferred models:", err);
      setPreferredModels(DEFAULT_PREFERRED_MODELS);
    }
  }, []);

  // Save preferred models to localStorage whenever they change
  useEffect(() => {
    try {
      if (preferredModels.length > 0) {
        localStorage.setItem("preferredModels", JSON.stringify(preferredModels));
        console.log("Saved preferred models:", preferredModels);
      }
    } catch (err) {
      console.error("Error saving preferred models:", err);
    }
  }, [preferredModels]);

  useEffect(() => {
    const loadModels = async () => {
      try {
        setIsLoading(true)
        const availableModels = await fetchModels()

        // Sort by createdAt in descending order (newest first)
        // Create a copy of the array before sorting to avoid mutating the original
        const modelsCopy = [...availableModels]

        // Define the sort comparison function
        const sortByCreatedDate = (a: AIModel, b: AIModel) => {
          // Convert dates to timestamps for comparison
          const dateA = new Date(a.createdAt).getTime()
          const dateB = new Date(b.createdAt).getTime()
          
          // Sort in descending order (newest first)
          return dateB - dateA
        }

        // Apply the sort
        modelsCopy.sort(sortByCreatedDate)
        const sortedModels = modelsCopy

        setModels(sortedModels)
        
        if (!value && sortedModels.length > 0) {
          // Always try to set Gemini Flash 2.5 as the default model
          const geminiModel = sortedModels.find(
            (model) => model.description.includes("Gemini Flash 2.5")
          )
          
          if (geminiModel) {
            // If Gemini Flash 2.5 is available, set it as the default
            onChange(geminiModel.model)
          } else {
            // Fallback options if Gemini Flash 2.5 is not available
            const fallbackModel = sortedModels.find(
              (model) => model.description === "Llama 4 Maverick"
            )
            onChange(fallbackModel ? fallbackModel.model : sortedModels[0].model)
          }
        }
        
      } catch (err) {
        setError("Failed to load models")
      } finally {
        setIsLoading(false)
      }
    }
    loadModels()
  }, [value, onChange])

  // Find the selected model to display only its description
  const selectedModel = models.find(model => model.model === value)

  // Check if a model is pinned
  const isPinned = (modelDescription: string) => {
    return preferredModels.includes(modelDescription);
  };
  
  // Filter models based on user preferences
  const filteredModels = models.filter(model => 
    preferredModels.includes(model.description)
  );

  // Toggle pin/unpin a model
  const togglePinModel = (modelDescription: string, e: React.MouseEvent) => {
    // Prevent the event from bubbling up to parent elements
    e.preventDefault();
    e.stopPropagation();
    
    console.log("Toggling pin for model:", modelDescription);
    
    // Store the exact model description for more precise matching
    if (preferredModels.includes(modelDescription)) {
      // Remove from preferred
      console.log("Removing from preferred models");
      const newPreferred = preferredModels.filter(m => m !== modelDescription);
      console.log("New preferred models:", newPreferred);
      setPreferredModels(newPreferred);
    } else {
      // Add to preferred
      console.log("Adding to preferred models");
      const updatedPreferred = [...preferredModels, modelDescription];
      console.log("Updated preferred models:", updatedPreferred);
      setPreferredModels(updatedPreferred);
    }
  };

  if (error) {
    return (
      <div className="text-sm text-destructive flex items-center gap-2">
        <Bot className="h-4 w-4" />
        {error}
      </div>
    )
  }

  return (
    <TooltipProvider>
      <Select value={value} onValueChange={onChange}>
        <Tooltip>
          <TooltipTrigger asChild>
            <SelectTrigger className="w-[180px] gap-1.5 h-7 px-2 py-1 text-xs bg-background/80 hover:bg-accent/50 border-0 shadow-none rounded-full backdrop-blur-sm transition-colors">
              {(() => {
                if (isLoading) {
                  return <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />;
                }

                if (selectedModel) {
                  return (
                    <span className="flex items-center gap-1.5">
                      {React.createElement(getProviderIcon(selectedModel.type), {
                        className: "h-3.5 w-3.5 text-primary/80 group-hover:text-primary transition-colors duration-200"
                      })}
                    </span>
                  );
                }

                return <Bot className="h-3.5 w-3.5 text-muted-foreground" />;
              })()}
              <SelectValue placeholder="Select a model" className="flex items-center text-xs">
                {selectedModel?.description}
              </SelectValue>
            </SelectTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {selectedModel ? `${selectedModel.type} - ${selectedModel.description}` : "Select an AI model"}
          </TooltipContent>
        </Tooltip>
        <SelectContent className="bg-background/95 backdrop-blur-md border-0 shadow-lg rounded-xl max-w-[280px] p-2" align="center">
          <Tabs defaultValue="preferred" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="w-full mb-2 bg-accent/30 border-0 p-0.5 h-8 rounded-lg">
              <TabsTrigger value="preferred" className="flex-1 text-xs h-7 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">Preferred</TabsTrigger>
              <TabsTrigger value="all" className="flex-1 text-xs h-7 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">All Models</TabsTrigger>
            </TabsList>
            
            <TabsContent value="preferred" className="mt-0">
              {filteredModels.length === 0 ? (
                <div className="text-center py-2 text-xs text-muted-foreground">
                  No preferred models yet. Go to &ldquo;All Models&rdquo; to add some.
                </div>
              ) : (
                <div className="max-h-[220px] overflow-y-auto space-y-0.5 pr-1">
                  {filteredModels.map((model) => renderModelItem(model, togglePinModel, isPinned))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="all" className="mt-0">
              <div className="max-h-[220px] overflow-y-auto space-y-0.5 pr-1">
                {models.map((model) => renderModelItem(model, togglePinModel, isPinned))}
              </div>
            </TabsContent>
          </Tabs>
        </SelectContent>
      </Select>
    </TooltipProvider>
  )

  function renderModelItem(
    model: AIModel, 
    togglePin: (desc: string, e: React.MouseEvent) => void,
    isPinned: (desc: string) => boolean
  ) {
    const pinned = isPinned(model.description);
    
    return (
      <div 
        key={model.model}
        onClick={() => onChange(model.model)}
        className="flex py-1.5 px-2 cursor-pointer focus:bg-primary/5 text-sm focus:text-primary hover:bg-accent/40 transition-all duration-200 my-0.5 rounded-lg"
      >
        <div className="flex items-center justify-between w-full">
          <span className="font-medium text-xs truncate pr-2">
            {model.description}
          </span>
          
          {activeTab === "all" && (
            <div onClick={(e) => e.stopPropagation()}>
              <Button 
                type="button"
                variant="ghost" 
                size="icon" 
                className={`h-5 w-5 p-0.5 shrink-0 ${pinned ? 'text-primary' : 'text-muted-foreground'}`}
                onClick={(e) => togglePin(model.description, e)}
              >
                {pinned ? (
                  <PinOff className="h-3 w-3 hover:text-destructive" />
                ) : (
                  <Pin className="h-3 w-3 hover:text-primary" />
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }
}
