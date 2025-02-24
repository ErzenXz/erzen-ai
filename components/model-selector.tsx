'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AIModel } from '@/lib/types';
import { fetchModels } from '@/lib/api';

interface ModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [models, setModels] = useState<AIModel[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadModels() {
      try {
        const availableModels = await fetchModels();
        const sortedModels = availableModels.sort((a, b) =>
          a.description.localeCompare(b.description)
        );
        setModels(sortedModels);
        if (!value && sortedModels.length > 0) {
          const geminiFlash = sortedModels.find(
            (model) => model.description === "Gemini Flash 2.0"
          );
          onChange(geminiFlash ? geminiFlash.model : sortedModels[0].model);
        }
      } catch (err) {
        setError('Failed to load models');
      }
    }
    loadModels();
  }, [value, onChange]);

  if (error) {
    return <div className="text-destructive text-sm">{error}</div>;
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select a model" />
      </SelectTrigger>
      <SelectContent>
        {models.map((model) => (
          <SelectItem key={model.model} value={model.model}>
            {model.description}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}