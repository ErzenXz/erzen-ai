"use client"

import { useState, useEffect } from "react"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Bot } from 'lucide-react'
import { AIModel } from "@/lib/types"
import { fetchModels } from "@/lib/api"

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
          a.description.localeCompare(b.description)
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
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[240px] gap-2">
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
        <SelectValue placeholder="Select a model">
          {selectedModel?.description}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Available Models</SelectLabel>
          {models.map((model) => (
            <SelectItem
              key={model.model}
              value={model.model}
              className="flex items-center gap-2"
            >
              <div className="flex flex-col gap-0.5">
                <span>{model.description}</span>
                <span className="text-xs text-muted-foreground">
                  {model.name}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
