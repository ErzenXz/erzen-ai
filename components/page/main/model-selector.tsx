"use client"

import React, { useState, useEffect } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Bot, Sparkles, Zap, Brain, Flame, Cpu, Cloud, BrainCircuit } from 'lucide-react'
import { AIModel } from "@/lib/types"
import { fetchModels } from "@/lib/api"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"

// Utility functions
const getProviderIcon = (modelType: string) => {
  const type = modelType.toLowerCase();
  console.log(`Provider type: ${type}`);

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

const getModelCapabilityTag = (modelDescription: string) => {
  if (modelDescription.toLowerCase().includes('pro') ||
      modelDescription.toLowerCase().includes('thinking')) {
    return 'Advanced';
  }
  if (modelDescription.toLowerCase().includes('fast') ||
      modelDescription.toLowerCase().includes('flash')) {
    return 'Fast';
  }
  return 'Standard';
}

interface ModelSelectorProps {
  readonly value: string
  readonly onChange: (value: string) => void
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [models, setModels] = useState<AIModel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

          // Log the dates for debugging
          console.log(`Comparing: ${a.description} (${a.createdAt}) vs ${b.description} (${b.createdAt})`);

          // Sort in descending order (newest first)
          return dateB - dateA
        }

        // Apply the sort
        modelsCopy.sort(sortByCreatedDate)
        const sortedModels = modelsCopy

        // Log the sorted models
        console.log('Sorted models (newest first):', sortedModels.map(m => `${m.description} (${m.createdAt})`))

        setModels(sortedModels)
        
        if (!value && sortedModels.length > 0) {
          // Try to find Llama 4 Scout as the default model
          const llamaScout = sortedModels.find(
            (model) => model.description.includes("Llama 4 Scout")
          )
          // Fallback to Gemini Flash 2.0 if Llama 4 Scout is not available
          const geminiFlash = sortedModels.find(
            (model) => model.description === "Gemini Flash 2.0"
          )
          // Use Llama 4 Scout if available, otherwise Gemini Flash, otherwise first model
          onChange(llamaScout ? llamaScout.model : 
            geminiFlash ? geminiFlash.model : 
            sortedModels[0].model)
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
            <SelectTrigger className="w-[240px] gap-2 bg-background/80 backdrop-blur-sm hover:bg-accent/50 hover:bg-opacity-80 transition-all duration-200 border-primary/10 shadow-sm group">
              {(() => {
                if (isLoading) {
                  return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
                }

                if (selectedModel) {
                  return (
                    <span className="flex items-center gap-2">
                      {React.createElement(getProviderIcon(selectedModel.type), {
                        className: "h-4 w-4 text-primary/80 group-hover:text-primary transition-colors duration-200"
                      })}
                    </span>
                  );
                }

                return <Bot className="h-4 w-4 text-muted-foreground" />;
              })()}
              <SelectValue placeholder="Select a model" className="flex items-center">
                {selectedModel?.description}
              </SelectValue>
            </SelectTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {selectedModel ? `${selectedModel.type} - ${selectedModel.description}` : "Select an AI model"}
          </TooltipContent>
        </Tooltip>
        <SelectContent className="bg-background/80 backdrop-blur-sm border-primary/10 shadow-md rounded-lg" align="center">
          <div className="max-h-[300px] overflow-y-auto py-1">
            {models.map((model) => {
              const ProviderIcon = getProviderIcon(model.type)
              const capability = getModelCapabilityTag(model.description)

              return (
                <SelectItem
                  key={model.model}
                  value={model.model}
                  className="flex py-3 cursor-pointer focus:bg-primary/5 focus:text-primary hover:bg-accent/50 hover:bg-opacity-80 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <ProviderIcon className="h-5 w-5 text-primary/70 group-hover:text-primary transition-colors duration-200" />
                    </div>
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{model.description}</span>
                        <Badge
                          variant="outline"
                          className={`text-xs px-1.5 py-0 ${(() => {
                            if (capability === 'Advanced') {
                              return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
                            }
                            if (capability === 'Fast') {
                              return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
                            }
                            return 'bg-green-500/10 text-green-500 border-green-500/30';
                          })()}`}
                        >
                          {capability}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground truncate">
                        {model.type}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              )
            })}
          </div>
        </SelectContent>
      </Select>
    </TooltipProvider>
  )
}
