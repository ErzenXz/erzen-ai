"use client"

import React, { useState, useEffect } from "react"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Bot, Sparkles, Zap, Brain, AlertCircle } from 'lucide-react'
import { AIModel } from "@/lib/types"
import { fetchModels } from "@/lib/api"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { readFileAsText } from "@/lib/utils"

// Utility functions
const getModelIcon = (modelDescription: string) => {
  if (modelDescription.toLowerCase().includes('gemini')) return Sparkles;
  if (modelDescription.toLowerCase().includes('gpt')) return Zap;
  if (modelDescription.toLowerCase().includes('claude')) return Brain;
  return Bot;
}

const getModelCapabilityTag = (modelDescription: string) => {
  if (modelDescription.toLowerCase().includes('pro') || 
      modelDescription.toLowerCase().includes('ultra') || 
      modelDescription.toLowerCase().includes('gpt-4')) {
    return 'Advanced';
  }
  if (modelDescription.toLowerCase().includes('fast') || 
      modelDescription.toLowerCase().includes('flash')) {
    return 'Fast';
  }
  return 'Standard';
}

interface ModelSelectorProps {
  value: string
  onChange: (value: string) => void
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [models, setModels] = useState<AIModel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadModels() {
      try {
        setIsLoading(true)
        const availableModels = await fetchModels()
        const sortedModels = availableModels.sort((a, b) =>
          a.description.localeCompare(b.type)
        )
        setModels(sortedModels)
        if (!value && sortedModels.length > 0) {
          const geminiFlash = sortedModels.find(
            (model) => model.description === "Gemini Flash 2.0"
          )
          onChange(geminiFlash ? geminiFlash.model : sortedModels[0].model)
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
            <SelectTrigger className="w-[240px] gap-2 bg-background/80 backdrop-blur-sm hover:bg-accent/50 transition-colors border-primary/10 shadow-sm">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : selectedModel ? (
                <span className="flex items-center gap-2">
                  {React.createElement(getModelIcon(selectedModel.description), {
                    className: "h-4 w-4 text-primary"
                  })}
                </span>
              ) : (
                <Bot className="h-4 w-4 text-muted-foreground" />
              )}
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
              const ModelIcon = getModelIcon(model.description)
              const capability = getModelCapabilityTag(model.description)
              
              return (
                <SelectItem
                  key={model.model}
                  value={model.model}
                  className="flex py-3 cursor-pointer focus:bg-primary/5 focus:text-primary hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <ModelIcon className="h-5 w-5 text-primary/70" />
                    </div>
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{model.description}</span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs px-1.5 py-0 ${
                            capability === 'Advanced' 
                              ? 'bg-blue-500/10 text-blue-500 border-blue-500/30' 
                              : capability === 'Fast' 
                                ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                                : 'bg-green-500/10 text-green-500 border-green-500/30'
                          }`}
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
