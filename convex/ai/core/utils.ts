"use node";

import { generateText } from "ai";
import { api } from "../../_generated/api";
import { getProviderApiKey } from "../providers";
import { SUPPORTED_PROVIDERS } from "../providers/constants";
import { createAIModel } from "../providers";
import { PROVIDER_BASE_URLS } from "../providers/constants";

export async function generateTitle(
  ctx: any,
  userMessage: string
): Promise<string> {
  const provider = "groq";
  const model = "llama-3.1-8b-instant";

  // Get user's API key for Groq
  const apiKeyRecord = await ctx.runQuery(api.apiKeys.getByProvider, {
    provider,
  });

  const { apiKey, usingUserKey } = getProviderApiKey(provider, apiKeyRecord);

  if (!apiKey) {
    throw new Error(
      `No API key available for ${provider}. ${!usingUserKey ? "Add your own Groq API key in settings for unlimited usage." : ""}`
    );
  }

  const { model: titleAiModel } = createAIModel({
    provider,
    model,
    apiKey,
    baseUrl: PROVIDER_BASE_URLS[provider],
    skipMiddleware: true,
  });

  const result = await generateText({
    model: titleAiModel,
    messages: [
      {
        role: "system",
        content:
          'You are a title generation specialist. Create precise, informative conversation titles based on user messages.\n\nRules:\n- Use 2-5 words maximum\n- Be specific and descriptive\n- Focus on the main topic or request\n- Use nouns and verbs, avoid filler words\n- Don\'t use quotes or special characters\n- Make it immediately clear what the conversation is about\n\nExamples:\nUser: "How do I fix this Python error?" → "Python Error Fix"\nUser: "I need recipe ideas for dinner" → "Dinner Recipe Ideas" \nUser: "Explain quantum physics concepts" → "Quantum Physics Explanation"\nUser: "Help me plan a trip to Japan" → "Japan Travel Planning"\nUser: "What\'s the weather like today?" → "Today\'s Weather"\nUser: "Can you write a story about dragons?" → "Dragon Story Writing"\nUser: "I\'m having relationship problems" → "Relationship Advice"\nUser: "How to optimize my code performance?" → "Code Performance Optimization"\n\nRespond with ONLY the title, nothing else.',
      },
      {
        role: "user",
        content: userMessage.slice(0, 200), // Limit input length
      },
    ],
    temperature: 0.3,
    maxTokens: 75,
  });

  // Clean up the response and ensure it's good
  let title = result.text
    .trim()
    .replace(/['""`]/g, "") // Remove quotes and backticks
    .replace(/[^\w\s-]/g, "") // Remove special characters except spaces and hyphens
    .split(" ")
    .filter((word) => word.length > 0) // Remove empty strings
    .slice(0, 7) // Max 7 words
    .join(" ");

  // Ensure title is meaningful and not too generic
  if (
    !title ||
    title.length < 3 ||
    title.toLowerCase().match(/^(chat|help|question|talk|conversation)$/)
  ) {
    // Try to extract keywords from user message as fallback
    const words = userMessage
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(
        (word) =>
          word.length > 3 &&
          ![
            "what",
            "how",
            "can",
            "you",
            "help",
            "please",
            "with",
            "about",
            "would",
            "could",
            "should",
          ].includes(word)
      );

    if (words.length > 0) {
      title = words
        .slice(0, 3)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    } else {
      title = "New Chat";
    }
  }

  return title || "New Chat";
}

export async function getAvailableProviders(ctx: any): Promise<string[]> {
  const availableProviders: string[] = [];

  // Get user's API keys
  const userApiKeys = await ctx.runQuery(api.apiKeys.list);

  for (const provider of SUPPORTED_PROVIDERS) {
    let hasApiKey = false;

    // Check if user has API key in database
    const userApiKey = userApiKeys.find(
      (key: any) => key.provider === provider && key.hasKey
    );
    if (userApiKey) {
      hasApiKey = true;
    } else {
      // Check if there's a built-in API key in environment variables
      const { apiKey } = getProviderApiKey(provider);
      hasApiKey = !!apiKey;
    }

    if (hasApiKey) {
      availableProviders.push(provider);
    }
  }

  return availableProviders;
}
