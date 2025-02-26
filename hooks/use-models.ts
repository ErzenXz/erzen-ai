"use client";

import { useState, useEffect } from "react";
import { AIModel } from "@/lib/types";
import { fetchModels } from "@/lib/api";
import { db } from "@/lib/db";

export function useModels() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setIsLoading(true);

      // Load from IndexedDB first
      const cachedModels = await db.getModels();
      if (cachedModels.length > 0) {
        setModels(cachedModels);
      }

      // Then fetch from API
      const availableModels = await fetchModels();
      const sortedModels = availableModels.sort((a, b) =>
        a.description.localeCompare(b.description)
      );

      await db.saveModels(sortedModels);
      setModels(sortedModels);
    } catch (err) {
      setError("Failed to load models");
    } finally {
      setIsLoading(false);
    }
  };

  return { models, isLoading, error };
}
