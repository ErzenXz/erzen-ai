"use node";

import { streamText } from "ai";
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

// Allow streaming responses up to 10 minutes (600 seconds) for long-running models like Gemini 2.5 Pro
export const maxDuration = 600;

export async function generateStreamingResponse(
  ctx: any,
  args: {
    conversationId: string;
    branchId?: string;
    messages: Array<{
      role: "user" | "assistant" | "system";
      content:
        | string
        | Array<{
            type: "text" | "image" | "file";
            text?: string;
            image?: string;
            file?: string;
            data?: string;
          }>;
    }>;
    provider?: SupportedProvider;
    model?: string;
    temperature?: number;
    enabledTools?: string[];
    thinkingBudget?: string | number;
  }
) {
  const provider = (args.provider as SupportedProvider) || "openai";
  const model = args.model ?? getDefaultModel(provider);
  const temperature = args.temperature ?? 1;
  const enabledTools = args.enabledTools ?? [];
  const branchId = args.branchId;

  let messageId: any = null;
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

    // Clear any existing cancellation flag to start fresh
    await ctx.runMutation(api.conversations.clearCancellation, {
      conversationId: args.conversationId,
    });

    // Check if the model supports multimodal and if we have image content
    const modelInfo = getModelInfo(model);

    // Convert storage URLs to public URLs for multimodal models
    const processedMessages = await Promise.all(
      args.messages.map(async (message) => {
        if (Array.isArray(message.content)) {
          const processedContent = await Promise.all(
            message.content.map(async (part) => {
              if (part.type === "image") {
                const imageValue = part.image;

                // Check if this is a storage ID (Convex storage IDs are alphanumeric)
                if (imageValue?.match(/^[a-z0-9]{28,}$/)) {
                  try {
                    const publicUrl = await ctx.storage.getUrl(
                      imageValue as any
                    );
                    if (publicUrl) {
                      return {
                        type: "image",
                        image: publicUrl,
                      };
                    } else {
                      console.warn(
                        `Failed to get public URL for storage ID: ${imageValue}`
                      );
                      return part;
                    }
                  } catch (error) {
                    console.error(
                      `Error getting public URL for storage ID ${imageValue}:`,
                      error
                    );
                    return part;
                  }
                }

                return part;
              } else if (part.type === "file") {
                const fileValue = (part as any).file ?? (part as any).data;

                // Check if this is a storage ID
                if (fileValue?.match?.(/^[a-z0-9]{28,}$/)) {
                  try {
                    // Get file metadata using the system table (recommended approach)
                    const fileMetadata = await ctx.db.system.get(fileValue);
                    const publicUrl = await ctx.storage.getUrl(fileValue);

                    if (publicUrl && fileMetadata) {
                      return {
                        type: "file",
                        data: publicUrl,
                        mimeType:
                          fileMetadata.contentType ??
                          "application/octet-stream",
                      };
                    } else {
                      console.warn(
                        `Failed to get public URL or metadata for file storage ID: ${fileValue}`
                      );
                      return part;
                    }
                  } catch (error) {
                    console.error(
                      `Error getting public URL for file storage ID ${fileValue}:`,
                      error
                    );
                    return part;
                  }
                }

                return part;
              }
              return part;
            })
          );
          return { ...message, content: processedContent };
        }
        return message;
      })
    );

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
        const content =
          typeof msg.content === "string"
            ? msg.content
            : msg.content
                .map((c) => (c.type === "text" ? c.text || "" : ""))
                .join(" ");
        return total + Math.ceil(content.length / 4); // Rough estimate: 4 chars per token
      }, 0);
      const estimatedOutputTokens = 2000; // Conservative estimate for credit check

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
    const hasTools = Object.keys(availableTools).length > 0;

    // Track generation start time
    const generationStartTime = Date.now();

    // Validate API key is available
    if (!apiKey) {
      throw new Error(
        `No API key available for ${provider}. Please configure your API key in settings or use a provider with built-in support.`
      );
    }

    // Create AI model instance with native thinking support
    const { model: streamingAiModel, providerOptions } = createAIModel({
      provider,
      model,
      apiKey,
      baseUrl: PROVIDER_BASE_URLS[provider],
      temperature,
      thinkingBudget: args.thinkingBudget,
    });

    // Get user preferences and instructions to build system prompt
    const userPreferences = await ctx.runQuery(api.preferences.get);
    const userInstructions = await ctx.runQuery(api.userInstructions.get);

    // Prepare messages with system prompt if enabled
    let messagesWithSystemPrompt = [...processedMessages];

    // Check if there's already a system message
    const hasSystemMessage = processedMessages.some(
      (msg) => msg.role === "system"
    );

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
        ...processedMessages,
      ];
    }

    // Create an empty assistant message first
    messageId = await ctx.runMutation(api.messages.add, {
      conversationId: args.conversationId,
      branchId: branchId,
      role: "assistant",
      content: "",
    });

    // Set generation state to track ongoing generation
    await ctx.runMutation(api.conversations.setGenerationState, {
      conversationId: args.conversationId,
      isGenerating: true,
      messageId: messageId,
    });

    // Generate the response using streamText - conditionally include tools
    const streamTextConfig: any = {
      model: streamingAiModel,
      messages: messagesWithSystemPrompt as any,
      temperature,
      maxSteps: 25,
      abortSignal: abortController.signal,
      onError: ({ error }: { error: Error }) => {
        console.error(`Streaming error for ${provider}/${model}:`, error);
        // Don't throw here, let it be handled in the catch block
        return `AI model error: ${error.message}`;
      },
      // Include native thinking support via provider options
      providerOptions,
    };

    // Only add tools if model supports them AND we have tools to add
    if (modelInfo.supportsTools && hasTools) {
      streamTextConfig.tools = availableTools;
    }

    const result = await (streamText(streamTextConfig) as any);

    let accumulatedContent = "";
    const toolCalls: any[] = [];
    let totalTokens = 0;
    let promptTokens = 0;
    let completionTokens = 0;
    let actualGenerationTime = 0;
    let accumulatedReasoning: string | undefined = undefined;
    let hasError = false;
    let errorMessage = "";

    // Process the full stream so we can detect tool calls in real time
    for await (const part of result.fullStream) {
      // Check for abort signal
      if (abortController?.signal.aborted) {
        const abortReason =
          abortController.signal.reason?.message || "Request was aborted";
        throw new Error(`Stream aborted: ${abortReason}`);
      }

      // Check for cancellation at the start of each iteration
      const isCancelled = await ctx.runQuery(
        api.conversations.checkCancellation,
        {
          conversationId: args.conversationId,
        }
      );

      if (isCancelled) {
        abortController?.abort(new Error("User cancelled generation"));

        await ctx.runMutation(api.messages.update, {
          messageId,
          content: accumulatedContent || "Generation was stopped by user.",
          thinking: accumulatedReasoning,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        });

        // Clear the cancellation flag
        await ctx.runMutation(api.conversations.clearCancellation, {
          conversationId: args.conversationId,
        });

        clearTimeout(timeoutId);
        return {
          messageId,
          content: accumulatedContent || "Generation was stopped by user.",
          usingUserKey,
          generationMetrics: {
            provider,
            model,
            generationTimeMs: Date.now() - generationStartTime,
            temperature,
          },
        };
      }

      const partStartTime = Date.now();

      // Handle error parts in the stream
      if (part.type === "error") {
        hasError = true;
        errorMessage =
          part.error?.message || "Unknown streaming error occurred";
        console.error(`Stream error for ${provider}/${model}:`, part.error);

        // Update message with error content
        await ctx.runMutation(api.messages.update, {
          messageId,
          content: accumulatedContent || `Error: ${errorMessage}`,
          thinking: accumulatedReasoning,
          isError: true,
        });

        // Don't break here - let the stream complete and handle in outer catch
        continue;
      }

      // Text deltas
      if (part.type === "text-delta") {
        const newDelta = part.textDelta ?? "";
        if (newDelta) {
          accumulatedContent += newDelta;
          completionTokens += Math.ceil(newDelta.length / 4);
        }

        // Update message content incrementally
        await ctx.runMutation(api.messages.update, {
          messageId,
          content: accumulatedContent.trim(),
          thinking: accumulatedReasoning,
        });
      }

      // Reasoning deltas
      if (part.type === "reasoning-delta") {
        const reasoningDelta =
          part.textDelta ?? part.reasoningDelta ?? part.reasoning ?? "";
        if (reasoningDelta) {
          accumulatedReasoning = (accumulatedReasoning || "") + reasoningDelta;

          await ctx.runMutation(api.messages.update, {
            messageId,
            content: accumulatedContent.trim(),
            thinking: accumulatedReasoning,
          });
        }
      }

      // Native thinking from providers (Google, Anthropic, OpenAI)
      if (part.type === "reasoning") {
        const reasoningText = part.textDelta ?? part.reasoning ?? "";
        if (reasoningText) {
          accumulatedReasoning = (accumulatedReasoning || "") + reasoningText;
          await ctx.runMutation(api.messages.update, {
            messageId,
            content: accumulatedContent.trim(),
            thinking: accumulatedReasoning,
          });
        }
      }

      // Handle reasoning finish
      if (part.type === "reasoning-finish") {
        accumulatedReasoning =
          part.text ?? part.reasoning ?? accumulatedReasoning;

        // Update message with final reasoning content
        if (accumulatedReasoning) {
          await ctx.runMutation(api.messages.update, {
            messageId,
            content: accumulatedContent.trim(),
            thinking: accumulatedReasoning,
          });
        }
      }

      // Track token usage if available
      if (part.type === "finish" && part.usage) {
        totalTokens = part.usage.totalTokens || totalTokens;
        promptTokens = part.usage.promptTokens || promptTokens;
        completionTokens = part.usage.completionTokens || completionTokens;
      }

      // Tool calls emitted by the model
      if (part.type === "tool-call") {
        const toolCall = {
          id: part.toolCallId || `tool_${Date.now()}`,
          name: part.toolName,
          arguments: JSON.stringify(part.args),
          result: undefined,
        };

        toolCalls.push(toolCall);

        // Persist tool call immediately for UI feedback
        await ctx.runMutation(api.messages.update, {
          messageId,
          content: accumulatedContent,
          toolCalls,
        });
      }

      // Tool results
      if (part.type === "tool-result") {
        // Handle thinking tool specially
        if (part.toolName === "thinking") {
          const thinkingText =
            typeof part.result === "string"
              ? part.result
              : JSON.stringify(part.result, null, 2);

          accumulatedReasoning =
            (accumulatedReasoning || "") + `\n${thinkingText}`;

          await ctx.runMutation(api.messages.update, {
            messageId,
            content: accumulatedContent.trim(),
            thinking: accumulatedReasoning,
          });
        }

        const toolCallIndex = toolCalls.findIndex(
          (call) => call.id === part.toolCallId
        );
        if (toolCallIndex >= 0) {
          toolCalls[toolCallIndex].result = JSON.stringify(part.result);

          await ctx.runMutation(api.messages.update, {
            messageId,
            content: accumulatedContent,
            toolCalls,
          });
        }

        // Check user preferences for separate tool output cards
        const userPreferences = await ctx.runQuery(api.preferences.get);
        if (userPreferences?.showToolOutputs) {
          await ctx.runMutation(api.messages.add, {
            conversationId: args.conversationId,
            branchId: branchId,
            role: "tool",
            content:
              typeof part.result === "string"
                ? part.result
                : JSON.stringify(part.result, null, 2),
            toolCallId: part.toolCallId,
          });
        }
      }

      actualGenerationTime += Date.now() - partStartTime;

      // Brief pause for smooth streaming
      await new Promise((r) => setTimeout(r, 10));
    }

    clearTimeout(timeoutId);

    // If there was an error in the stream, throw it now
    if (hasError) {
      throw new Error(errorMessage || "Stream encountered an error");
    }

    // Calculate generation metrics
    const generationEndTime = Date.now();
    const totalTimeMs = generationEndTime - generationStartTime;
    const tokensPerSecond =
      completionTokens > 0 && actualGenerationTime > 0
        ? completionTokens / (actualGenerationTime / 1000)
        : 0;

    const generationMetrics = {
      provider,
      model,
      tokensUsed: totalTokens || completionTokens,
      promptTokens: promptTokens || undefined,
      completionTokens: completionTokens || undefined,
      generationTimeMs: actualGenerationTime,
      tokensPerSecond: Math.round(tokensPerSecond * 100) / 100,
      temperature,
    };

    // Use the final, resolved values from the SDK for the canonical state
    let finalContent: string;
    let finalThinking: string | undefined;

    try {
      finalContent = (await result.text).trim();
      finalThinking = (await result.reasoning)?.trim() ?? "";
    } catch (resultError) {
      console.error(
        `Error getting final result for ${provider}/${model}:`,
        resultError
      );
      // Fallback to accumulated content if final result fails
      finalContent = accumulatedContent.trim();
      finalThinking = accumulatedReasoning?.trim();
    }

    // Final update to the message
    await ctx.runMutation(api.messages.update, {
      messageId,
      content:
        finalContent ||
        "I apologize, but I couldn't generate a response. The model may have returned empty content or encountered an issue during generation.",
      thinking: finalThinking || undefined,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      generationMetrics,
    });

    // Clear the cancellation flag and generation state
    await ctx.runMutation(api.conversations.clearCancellation, {
      conversationId: args.conversationId,
    });

    // Update usage if using built-in keys
    if (!usingUserKey) {
      // Deduct credits based on actual token usage
      const actualInputTokens = generationMetrics.promptTokens || 0;
      const actualOutputTokens = generationMetrics.completionTokens || 0;

      if (actualInputTokens > 0 || actualOutputTokens > 0) {
        try {
          await ctx.runMutation(api.usage.deductCredits, {
            model,
            inputTokens: actualInputTokens,
            outputTokens: actualOutputTokens,
          });
        } catch (creditError) {
          console.warn("Failed to deduct credits:", creditError);
          // Don't fail the whole request for credit deduction errors
        }
      }
    }

    return {
      messageId,
      content: finalContent,
      usingUserKey,
      generationMetrics,
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

    // Clear generation state on error
    try {
      await ctx.runMutation(api.conversations.clearCancellation, {
        conversationId: args.conversationId,
      });
    } catch (clearError) {
      // Ignore clearance errors
    }

    // Update the existing message with error information
    if (messageId) {
      try {
        await ctx.runMutation(api.messages.update, {
          messageId,
          content: errorMessage,
          generationMetrics: { provider, model, generationTimeMs: 0 },
          isError: true,
        });
      } catch (updateError) {
        // If updating fails, create a new message as fallback
        await ctx.runMutation(api.messages.add, {
          conversationId: args.conversationId,
          branchId: branchId,
          role: "assistant",
          content: errorMessage,
          generationMetrics: { provider, model, generationTimeMs: 0 },
          isError: true,
        });
      }
    } else {
      // If messageId is null, create a new message
      await ctx.runMutation(api.messages.add, {
        conversationId: args.conversationId,
        branchId: branchId,
        role: "assistant",
        content: errorMessage,
        generationMetrics: { provider, model, generationTimeMs: 0 },
        isError: true,
      });
    }

    return {
      messageId: messageId ?? undefined,
      error: errorMessage,
      usingUserKey,
    };
  }
}
