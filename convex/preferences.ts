import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const get = query({
  args: {},
  handler: async (ctx) => {
    try {
      const userId = await getAuthUserId(ctx);

      if (!userId) {
        return {
          aiProvider: "google" as const,
          model: "gemini-2.5-flash-preview-05-20",
          temperature: 0.7,
          maxTokens: 128000,
          enabledTools: ["web_search", "calculator", "datetime", "canvas"],
          favoriteModels: [],
          modelReasoningEfforts: {},
          hideUserInfo: false,
          showToolOutputs: false,
          showMessageMetadata: false,
          showThinking: false,
          systemPrompt:
            "You are ErzenAI, a highly capable and versatile AI assistant designed to help users with a wide range of tasks and conversations. You can engage in natural dialogue, answer questions, provide explanations, help with creative writing, coding, analysis, problem-solving, and much more.\n\n## Core Capabilities\n- **General Conversation**: You can chat naturally about any topic, tell jokes, share stories, provide entertainment, and engage in casual conversation without needing any tools\n- **Knowledge & Information**: You have extensive knowledge across many domains and can answer questions directly from your training\n- **Creative Tasks**: Writing, brainstorming, creative problem-solving, storytelling, and artistic guidance\n- **Technical Help**: Coding, debugging, system administration, technical explanations\n- **Analysis & Reasoning**: Breaking down complex problems, logical reasoning, decision-making support\n\n## Tool Usage Guidelines\nYou have access to specialized tools, but use them strategically:\n- **Only use tools when you genuinely need real-time/current information or specialized capabilities**\n- **Don't use tools for things you can answer directly** (like jokes, explanations, general knowledge, creative tasks)\n- **Web search**: For current events, recent information, or when you need to verify latest details\n- **Calculator**: For complex mathematical computations only\n- **Memory**: To remember user preferences or important conversation context across sessions\n- **Other tools**: Use when their specific capabilities are genuinely needed\n\n## Communication Style\n- Be natural, friendly, and conversational\n- Adapt your tone to match the user's style and needs\n- Provide clear, helpful responses\n- Ask follow-up questions when clarification would be helpful\n- Be concise but thorough\n\nRemember: You're a capable AI assistant who can handle most requests directly. Tools are there to enhance your capabilities when needed, not replace your core conversational and analytical abilities.",
          useCustomSystemPrompt: false,
          imageModel: "fast-image-ai" as const,
          theme: "system" as const,
          colorTheme: "default",
        };
      }

      const preferences = await ctx.db
        .query("userPreferences")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .unique();

      // Default values
      const defaults = {
        aiProvider: "google" as const,
        model: "gemini-2.5-flash-preview-05-20",
        temperature: 0.7,
        maxTokens: 128000,
        enabledTools: ["web_search", "calculator", "datetime", "canvas"],
        favoriteModels: [],
        modelReasoningEfforts: {},
        hideUserInfo: false,
        showToolOutputs: false,
        showMessageMetadata: false,
        showThinking: true,
        systemPrompt:
          "You are ErzenAI, a highly capable and versatile AI assistant designed to help users with a wide range of tasks and conversations. You can engage in natural dialogue, answer questions, provide explanations, help with creative writing, coding, analysis, problem-solving, and much more.\n\n## Core Capabilities\n- **General Conversation**: You can chat naturally about any topic, tell jokes, share stories, provide entertainment, and engage in casual conversation without needing any tools\n- **Knowledge & Information**: You have extensive knowledge across many domains and can answer questions directly from your training\n- **Creative Tasks**: Writing, brainstorming, creative problem-solving, storytelling, and artistic guidance\n- **Technical Help**: Coding, debugging, system administration, technical explanations\n- **Analysis & Reasoning**: Breaking down complex problems, logical reasoning, decision-making support\n\n## Tool Usage Guidelines\nYou have access to specialized tools, but use them strategically:\n- **Only use tools when you genuinely need real-time/current information or specialized capabilities**\n- **Don't use tools for things you can answer directly** (like jokes, explanations, general knowledge, creative tasks)\n- **Web search**: For current events, recent information, or when you need to verify latest details\n- **Calculator**: For complex mathematical computations only\n- **Memory**: To remember user preferences or important conversation context across sessions\n- **Other tools**: Use when their specific capabilities are genuinely needed\n\n## Communication Style\n- Be natural, friendly, and conversational\n- Adapt your tone to match the user's style and needs\n- Provide clear, helpful responses\n- Ask follow-up questions when clarification would be helpful\n- Be concise but thorough\n\nRemember: You're a capable AI assistant who can handle most requests directly. Tools are there to enhance your capabilities when needed, not replace your core conversational and analytical abilities.",
        useCustomSystemPrompt: false,
        imageModel: "fast-image-ai" as const,
        theme: "system" as const,
        colorTheme: "default",
      };

      // Merge existing preferences with defaults for missing fields
      const result = preferences
        ? {
            aiProvider: preferences.aiProvider ?? defaults.aiProvider,
            model: preferences.model ?? defaults.model,
            temperature: preferences.temperature ?? defaults.temperature,
            maxTokens: preferences.maxTokens ?? defaults.maxTokens,
            enabledTools: preferences.enabledTools ?? defaults.enabledTools,
            favoriteModels:
              preferences.favoriteModels ?? defaults.favoriteModels,
            modelReasoningEfforts: (() => {
              // Migration: Convert old reasoningEffort to new modelReasoningEfforts structure
              let modelReasoningEfforts: Record<string, string | number> =
                preferences.modelReasoningEfforts ??
                defaults.modelReasoningEfforts;
              if (
                preferences.reasoningEffort &&
                preferences.model &&
                !modelReasoningEfforts[preferences.model]
              ) {
                modelReasoningEfforts = {
                  ...modelReasoningEfforts,
                  [preferences.model]: preferences.reasoningEffort,
                };
              }
              return modelReasoningEfforts;
            })(),
            hideUserInfo: preferences.hideUserInfo ?? defaults.hideUserInfo,
            showToolOutputs:
              preferences.showToolOutputs ?? defaults.showToolOutputs,
            showMessageMetadata:
              preferences.showMessageMetadata ?? defaults.showMessageMetadata,
            showThinking: preferences.showThinking ?? defaults.showThinking,
            systemPrompt: preferences.systemPrompt ?? defaults.systemPrompt,
            useCustomSystemPrompt:
              preferences.useCustomSystemPrompt ??
              defaults.useCustomSystemPrompt,
            imageModel: preferences.imageModel ?? ("fast-image-ai" as const),
            theme: preferences.theme ?? defaults.theme,
            colorTheme: preferences.colorTheme ?? defaults.colorTheme,
          }
        : defaults;

      return result;
    } catch (error) {
      console.error("Error in preferences.get:", error);
      // Return default preferences if there's any error
      return {
        aiProvider: "google" as const,
        model: "gemini-2.5-flash-preview-05-20",
        temperature: 0.7,
        maxTokens: 1000,
        enabledTools: ["web_search", "calculator", "datetime", "canvas"],
        favoriteModels: [],
        modelReasoningEfforts: {},
        hideUserInfo: false,
        showToolOutputs: false,
        showMessageMetadata: false,
        showThinking: false,
        systemPrompt:
          "You are ErzenAI, a highly capable and versatile AI assistant designed to help users with a wide range of tasks and conversations. You can engage in natural dialogue, answer questions, provide explanations, help with creative writing, coding, analysis, problem-solving, and much more.\n\n## Core Capabilities\n- **General Conversation**: You can chat naturally about any topic, tell jokes, share stories, provide entertainment, and engage in casual conversation without needing any tools\n- **Knowledge & Information**: You have extensive knowledge across many domains and can answer questions directly from your training\n- **Creative Tasks**: Writing, brainstorming, creative problem-solving, storytelling, and artistic guidance\n- **Technical Help**: Coding, debugging, system administration, technical explanations\n- **Analysis & Reasoning**: Breaking down complex problems, logical reasoning, decision-making support\n\n## Tool Usage Guidelines\nYou have access to specialized tools, but use them strategically:\n- **Only use tools when you genuinely need real-time/current information or specialized capabilities**\n- **Don't use tools for things you can answer directly** (like jokes, explanations, general knowledge, creative tasks)\n- **Web search**: For current events, recent information, or when you need to verify latest details\n- **Calculator**: For complex mathematical computations only\n- **Memory**: To remember user preferences or important conversation context across sessions\n- **Other tools**: Use when their specific capabilities are genuinely needed\n\n## Communication Style\n- Be natural, friendly, and conversational\n- Adapt your tone to match the user's style and needs\n- Provide clear, helpful responses\n- Ask follow-up questions when clarification would be helpful\n- Be concise but thorough\n\nRemember: You're a capable AI assistant who can handle most requests directly. Tools are there to enhance your capabilities when needed, not replace your core conversational and analytical abilities.",
        useCustomSystemPrompt: false,
        imageModel: "fast-image-ai" as const,
        theme: "system" as const,
        colorTheme: "default",
      };
    }
  },
});

export const update = mutation({
  args: {
    aiProvider: v.optional(
      v.union(
        v.literal("openai"),
        v.literal("anthropic"),
        v.literal("google"),
        v.literal("openrouter"),
        v.literal("groq"),
        v.literal("deepseek"),
        v.literal("grok"),
        v.literal("cohere"),
        v.literal("mistral")
      )
    ),
    model: v.optional(v.string()),
    temperature: v.optional(v.number()),
    enabledTools: v.optional(v.array(v.string())),
    favoriteModels: v.optional(
      v.array(
        v.object({
          provider: v.string(),
          model: v.string(),
        })
      )
    ),
    modelReasoningEfforts: v.optional(
      v.record(v.string(), v.union(v.string(), v.number()))
    ),
    hideUserInfo: v.optional(v.boolean()),
    showToolOutputs: v.optional(v.boolean()),
    showMessageMetadata: v.optional(v.boolean()),
    showThinking: v.optional(v.boolean()),
    systemPrompt: v.optional(v.string()),
    useCustomSystemPrompt: v.optional(v.boolean()),
    imageModel: v.optional(v.string()),
    theme: v.optional(
      v.union(v.literal("light"), v.literal("dark"), v.literal("system"))
    ),
    colorTheme: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    const updateData = {
      userId,
      aiProvider:
        args.aiProvider ?? existing?.aiProvider ?? ("google" as const),
      model: args.model ?? existing?.model ?? "gemini-2.5-flash-preview-05-20",
      temperature: args.temperature ?? existing?.temperature ?? 0.7,
      enabledTools: args.enabledTools ??
        existing?.enabledTools ?? [
          "web_search",
          "calculator",
          "datetime",
          "canvas",
        ],
      favoriteModels: args.favoriteModels ?? existing?.favoriteModels ?? [],
      modelReasoningEfforts:
        args.modelReasoningEfforts ?? existing?.modelReasoningEfforts ?? {},
      hideUserInfo: args.hideUserInfo ?? existing?.hideUserInfo ?? false,
      showToolOutputs:
        args.showToolOutputs ?? existing?.showToolOutputs ?? false,
      showMessageMetadata:
        args.showMessageMetadata ?? existing?.showMessageMetadata ?? false,
      showThinking: args.showThinking ?? existing?.showThinking ?? false,
      systemPrompt:
        args.systemPrompt ??
        existing?.systemPrompt ??
        "You are ErzenAI, a highly capable and versatile AI assistant designed to help users with a wide range of tasks and conversations. You can engage in natural dialogue, answer questions, provide explanations, help with creative writing, coding, analysis, problem-solving, and much more.\n\n## Core Capabilities\n- **General Conversation**: You can chat naturally about any topic, tell jokes, share stories, provide entertainment, and engage in casual conversation without needing any tools\n- **Knowledge & Information**: You have extensive knowledge across many domains and can answer questions directly from your training\n- **Creative Tasks**: Writing, brainstorming, creative problem-solving, storytelling, and artistic guidance\n- **Technical Help**: Coding, debugging, system administration, technical explanations\n- **Analysis & Reasoning**: Breaking down complex problems, logical reasoning, decision-making support\n\n## Tool Usage Guidelines\nYou have access to specialized tools, but use them strategically:\n- **Only use tools when you genuinely need real-time/current information or specialized capabilities**\n- **Don't use tools for things you can answer directly** (like jokes, explanations, general knowledge, creative tasks)\n- **Web search**: For current events, recent information, or when you need to verify latest details\n- **Calculator**: For complex mathematical computations only\n- **Memory**: To remember user preferences or important conversation context across sessions\n- **Other tools**: Use when their specific capabilities are genuinely needed\n\n## Communication Style\n- Be natural, friendly, and conversational\n- Adapt your tone to match the user's style and needs\n- Provide clear, helpful responses\n- Ask follow-up questions when clarification would be helpful\n- Be concise but thorough\n\nRemember: You're a capable AI assistant who can handle most requests directly. Tools are there to enhance your capabilities when needed, not replace your core conversational and analytical abilities.",
      useCustomSystemPrompt:
        args.useCustomSystemPrompt ?? existing?.useCustomSystemPrompt ?? true,
      imageModel:
        args.imageModel ?? existing?.imageModel ?? ("fast-image-ai" as const),
      theme: args.theme ?? existing?.theme ?? ("system" as const),
      colorTheme: args.colorTheme ?? existing?.colorTheme ?? "default",
    };

    if (existing) {
      await ctx.db.patch(existing._id, updateData);
    } else {
      await ctx.db.insert("userPreferences", updateData);
    }
  },
});

export const updateModelReasoningEffort = mutation({
  args: {
    model: v.string(),
    reasoningEffort: v.union(v.string(), v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    const currentReasoningEfforts = existing?.modelReasoningEfforts || {};
    const updatedReasoningEfforts = {
      ...currentReasoningEfforts,
      [args.model]: args.reasoningEffort,
    };

    if (existing) {
      await ctx.db.patch(existing._id, {
        modelReasoningEfforts: updatedReasoningEfforts,
      });
    } else {
      // Create new preferences with default values
      await ctx.db.insert("userPreferences", {
        userId,
        aiProvider: "google",
        model: "gemini-2.5-flash-preview-05-20",
        temperature: 0.7,
        enabledTools: ["web_search", "calculator", "datetime"],
        favoriteModels: [],
        modelReasoningEfforts: updatedReasoningEfforts,
      });
    }

    return null;
  },
});

export const toggleFavoriteModel = mutation({
  args: {
    provider: v.string(),
    model: v.string(),
  },
  returns: v.array(
    v.object({
      provider: v.string(),
      model: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    const currentFavorites = existing?.favoriteModels || [];

    // Check if this model is already a favorite
    const existingIndex = currentFavorites.findIndex(
      (fav) => fav.provider === args.provider && fav.model === args.model
    );

    let newFavorites;
    if (existingIndex >= 0) {
      // Remove from favorites
      newFavorites = currentFavorites.filter(
        (_, index) => index !== existingIndex
      );
    } else {
      // Add to favorites
      newFavorites = [
        ...currentFavorites,
        { provider: args.provider, model: args.model },
      ];
    }

    if (existing) {
      await ctx.db.patch(existing._id, { favoriteModels: newFavorites });
    } else {
      // Create new preferences with default values
      await ctx.db.insert("userPreferences", {
        userId,
        aiProvider: "google",
        model: "gemini-2.5-flash-preview-05-20",
        temperature: 0.7,
        enabledTools: ["web_search", "calculator", "datetime"],
        favoriteModels: newFavorites,
      });
    }

    return newFavorites;
  },
});
