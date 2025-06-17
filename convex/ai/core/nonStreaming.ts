"use node";

import { generateText } from "ai";
import { api } from "../../_generated/api";
import { createAvailableTools } from "../tools";
import {
  createAIModel,
  getProviderApiKey,
  getDefaultModel,
  getModelInfo,
  SupportedProvider,
} from "../providers";
import { PROVIDER_BASE_URLS } from "../providers/constants";
import { getUserFriendlyErrorMessage } from "../utils/errors";

export async function generateNonStreamingResponse(
  ctx: any,
  args: {
    conversationId: string;
    branchId?: string;
    messages: Array<{
      role: "user" | "assistant" | "system";
      content: string;
    }>;
    provider?: SupportedProvider;
    model?: string;
    temperature?: number;
    enabledTools?: string[];
  }
) {
  const provider = (args.provider as SupportedProvider) || "openai";
  const model = args.model ?? getDefaultModel(provider);
  const temperature = args.temperature ?? 1;
  const enabledTools = args.enabledTools ?? [];
  const branchId = args.branchId;

  let usingUserKey = false;
  let abortController: AbortController | null = null;

  try {
    // Create an AbortController for timeout handling
    abortController = new AbortController();

    // Set timeout based on provider - Gemini models need longer timeouts
    const timeoutMs = provider === "google" ? 600000 : 300000; // 10 min for Google, 5 min for others
    const timeoutId = setTimeout(() => {
      if (abortController && !abortController.signal.aborted) {
        abortController.abort(
          new Error(`Request timeout after ${timeoutMs / 1000} seconds`)
        );
      }
    }, timeoutMs);

    // Get user's API key for the provider
    const apiKeyRecord = await ctx.runQuery(api.apiKeys.getByProvider, {
      provider,
    });

    const { apiKey, usingUserKey: isUsingUserKey } = getProviderApiKey(
      provider,
      apiKeyRecord?.apiKey
    );
    usingUserKey = isUsingUserKey;

    // Only check usage limits if using built-in keys
    if (!usingUserKey) {
      // Estimate token usage for credit check (rough estimate)
      const estimatedInputTokens = args.messages.reduce((total, msg) => {
        return total + Math.ceil(msg.content.length / 4); // Rough estimate: 4 chars per token
      }, 0);
      const estimatedOutputTokens = 2000; // Conservative estimate

      const creditCheck = await ctx.runQuery(api.usage.checkCreditsAvailable, {
        model,
        estimatedInputTokens,
        estimatedOutputTokens,
      });

      if (!creditCheck.hasCredits) {
        throw new Error(
          `Insufficient credits. Required: ${creditCheck.requiredCredits}, Available: ${creditCheck.availableCredits}. Add your own API keys in settings for unlimited usage.`
        );
      }

      if (creditCheck.wouldExceedSpending) {
        throw new Error(
          `This request would exceed your monthly spending limit. Add your own API keys in settings for unlimited usage.`
        );
      }
    }

    // Create tools based on enabled tools and model capabilities
    const availableTools = createAvailableTools(
      ctx,
      enabledTools,
      model,
      usingUserKey
    );

    // Check if model supports tools
    const modelInfo = getModelInfo(model);
    const hasTools = Object.keys(availableTools).length > 0;

    // Validate API key is available
    if (!apiKey) {
      throw new Error(
        `No API key available for ${provider}. Please configure your API key in settings or use a provider with built-in support.`
      );
    }

    // Get user preferences and instructions to build system prompt
    const userPreferences = await ctx.runQuery(api.preferences.get);
    const userInstructions = await ctx.runQuery(api.userInstructions.get);

    // Prepare messages with system prompt if enabled
    let messagesWithSystemPrompt = [...args.messages];

    // Check if there's already a system message
    const hasSystemMessage = args.messages.some((msg) => msg.role === "system");

    if (!hasSystemMessage) {
      let systemContent = "";

      if (
        userPreferences?.useCustomSystemPrompt &&
        userPreferences?.systemPrompt
      ) {
        // Use custom system prompt
        systemContent = userPreferences.systemPrompt;
      } else {
        // Use default system prompt when custom is disabled
        systemContent =
          "You are ErzenAI, a highly capable and versatile AI assistant designed to help users with a wide range of tasks and conversations. You can engage in natural dialogue, answer questions, provide explanations, help with creative writing, coding, analysis, problem-solving, and much more.\n\n## Core Capabilities\n- **General Conversation**: You can chat naturally about any topic, tell jokes, share stories, provide entertainment, and engage in casual conversation without needing any tools\n- **Knowledge & Information**: You have extensive knowledge across many domains and can answer questions directly from your training\n- **Creative Tasks**: Writing, brainstorming, creative problem-solving, storytelling, and artistic guidance\n- **Technical Help**: Coding, debugging, system administration, technical explanations\n- **Analysis & Reasoning**: Breaking down complex problems, logical reasoning, decision-making support\n\n## Tool Usage Guidelines\nYou have access to specialized tools, but use them strategically:\n- **Only use tools when you genuinely need real-time/current information or specialized capabilities**\n- **Don't use tools for things you can answer directly** (like jokes, explanations, general knowledge, creative tasks)\n- **Web search**: For current events, recent information, or when you need to verify latest details\n- **Calculator**: For complex mathematical computations only\n- **Memory**: To remember user preferences or important conversation context across sessions\n- **Other tools**: Use when their specific capabilities are genuinely needed\n\n## Communication Style\n- Be natural, friendly, and conversational\n- Adapt your tone to match the user's style and needs\n- Provide clear, helpful responses\n- Ask follow-up questions when clarification would be helpful\n- Be concise but thorough\n\nRemember: You're a capable AI assistant who can handle most requests directly. Tools are there to enhance your capabilities when needed, not replace your core conversational and analytical abilities.";
      }

      // Add user instructions if available
      if (userInstructions && userInstructions.trim()) {
        systemContent +=
          "\n\nAdditional user instructions:\n" + userInstructions;
      }

      // Add system prompt at the beginning
      messagesWithSystemPrompt = [
        {
          role: "system" as const,
          content: systemContent,
        },
        ...args.messages,
      ];
    }

    // Create AI model instance with native thinking support
    const { model: nonStreamingAiModel, providerOptions } = createAIModel({
      provider,
      model,
      apiKey,
      baseUrl: PROVIDER_BASE_URLS[provider],
      temperature,
    });

    // Generate the response using generateText - conditionally include tools
    const generateTextConfig: any = {
      model: nonStreamingAiModel,
      messages: messagesWithSystemPrompt as any,
      temperature,
      maxSteps: 25,
      abortSignal: abortController.signal,
      // Include native thinking support via provider options
      providerOptions,
    };

    // Only add tools if model supports them AND we have tools to add
    if (modelInfo.supportsTools && hasTools) {
      generateTextConfig.tools = availableTools;
    }

    const result = await generateText(generateTextConfig);

    clearTimeout(timeoutId);

    // Only update usage if using built-in keys
    if (!usingUserKey) {
      // Estimate token usage for credit deduction (since we don't have exact metrics in non-streaming)
      const inputTokens = args.messages.reduce((total, msg) => {
        return total + Math.ceil(msg.content.length / 4); // Rough estimate: 4 chars per token
      }, 0);
      const outputTokens = Math.ceil((result.text || "").length / 4); // Estimate output tokens

      if (inputTokens > 0 || outputTokens > 0) {
        try {
          await ctx.runMutation(api.usage.deductCredits, {
            model,
            inputTokens,
            outputTokens,
          });
        } catch (creditError) {
          console.warn("Failed to deduct credits:", creditError);
          // Don't fail the whole request for credit deduction errors
        }
      }
    }

    // Save the assistant's response with proper tool calls format
    const toolCalls =
      result.toolCalls?.map((call, index) => {
        const toolResult = result.toolResults?.[index] as any;
        return {
          id: call.toolCallId || `tool_${Date.now()}_${index}`,
          name: call.toolName,
          arguments: JSON.stringify(call.args),
          result: toolResult?.result
            ? JSON.stringify(toolResult.result)
            : undefined,
        };
      }) || undefined;

    // Ensure thinking doesn't contain duplicate content
    let finalContent =
      result.text?.trim() ||
      (typeof result.reasoning === "string" ? result.reasoning.trim() : "");

    let finalThinking =
      typeof result.reasoning === "string" ? result.reasoning.trim() : "";

    if (!finalContent && finalThinking) {
      finalContent = finalThinking;
      finalThinking = "";
    }

    await ctx.runMutation(api.messages.add, {
      conversationId: args.conversationId,
      branchId: branchId,
      role: "assistant",
      content:
        finalContent ||
        "I apologize, but I couldn't generate a response. The model may have returned empty content or encountered an issue during generation.",
      thinking: finalThinking || undefined,
      toolCalls,
    });

    return {
      text: result.text,
      toolCalls: result.toolCalls,
      usingUserKey,
    };
  } catch (error) {
    // Clear timeout if it exists
    if (abortController) {
      abortController.abort();
    }

    let errorMessage: string;

    // Handle timeout errors specifically
    if (error instanceof Error && error.message.includes("timeout")) {
      errorMessage = `The ${provider} model (${model}) timed out. This can happen with complex requests or when the model is under heavy load. Please try again or consider using a different model.`;
    } else if (error instanceof Error && error.message.includes("aborted")) {
      errorMessage = `Request was cancelled: ${error.message}`;
    } else {
      errorMessage = getUserFriendlyErrorMessage(error, provider, usingUserKey);
    }

    console.error(`Generation error for ${provider}/${model}:`, error);

    // Save error message as assistant response
    await ctx.runMutation(api.messages.add, {
      conversationId: args.conversationId,
      branchId: branchId,
      role: "assistant",
      content: errorMessage,
      generationMetrics: { provider, model, generationTimeMs: 0 },
      isError: true,
    });

    return {
      error: errorMessage,
      usingUserKey,
    };
  }
}
