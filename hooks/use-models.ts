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
      setError(null);

      // Load from IndexedDB first
      const cachedModels = await db.getModels();
      if (cachedModels.length > 0) {
        setModels(cachedModels);
      }

      // Then fetch from API
      try {
        const availableModels = await fetchModels();
        if (availableModels && availableModels.length > 0) {
          const sortedModels = availableModels.sort((a, b) =>
            a.description.localeCompare(b.description)
          );

          await db.saveModels(sortedModels);
          setModels(sortedModels);
        } else if (cachedModels.length === 0) {
          // Only set error if we have no cached models
          setError("No models available");
        }
      } catch (apiError) {
        console.error("Failed to fetch models from API:", apiError);
        // Only set error if we have no cached models
        if (cachedModels.length === 0) {
          setError("Failed to load models");
        }
      }
    } catch (err) {
      console.error("Error in useModels hook:", err);
      setError("Failed to load models");
    } finally {
      setIsLoading(false);
    }
  };

  return { models, isLoading, error };
}
