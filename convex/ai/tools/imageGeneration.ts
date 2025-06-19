import { tool } from "ai";
import { z } from "zod";
import { IMAGE_PROVIDERS, ImageModelId } from "../utils/imageProviders";
import { IMAGE_MODELS } from "../../../src/lib/models";
import { api } from "../../_generated/api";

export function createImageGenerationTool(ctx: any) {
  return tool({
    description:
      "Generate an image based on a text prompt. Creates high-quality images using AI and returns the image URL for display in the chat. Different providers have different costs - check your credits before generating.",
    parameters: z.object({
      prompt: z
        .string()
        .describe(
          "A detailed description of the image to generate. Be specific about style, colors, composition, and any important details."
        ),
      style: z
        .enum([
          "realistic",
          "artistic",
          "cartoon",
          "anime",
          "photography",
          "digital-art",
          "oil-painting",
          "watercolor",
        ])
        .optional()
        .describe("The style of the image to generate"),
      aspectRatio: z
        .enum(["1:1", "16:9", "9:16", "4:3", "3:4"])
        .optional()
        .describe("The aspect ratio of the generated image"),
    }),
    execute: async ({ prompt, style, aspectRatio }): Promise<string> => {
      try {
        // Get user preferences to determine which image model to use
        const preferences = await ctx.runQuery(api.preferences.get);
        const imageModel: ImageModelId =
          (preferences?.imageModel as ImageModelId) || "flux-1-schnell"; // Default to flux-1-schnell

        const provider = IMAGE_PROVIDERS[imageModel];
        if (!provider) {
          throw new Error(`Unknown image model: ${imageModel}`);
        }

        // Check if this provider requires an API key and if we're using user's key
        let usingUserKey = false;
        if (provider.requiresApiKey) {
          // For future providers that require API keys, we can add logic here
          // Currently Cloudflare models don't require user API keys
          usingUserKey = false;
        }

        // If using built-in keys, check credits first
        if (!usingUserKey) {
          const creditsCheck = await ctx.runQuery(
            api.usage.checkImageCreditsAvailable,
            {
              imageModel,
            }
          );

          const modelInfo = IMAGE_MODELS[imageModel];
          const modelName = modelInfo?.displayName || provider.name;
          const modelPrice = modelInfo?.pricing || 0.03;

          if (!creditsCheck.hasCredits) {
            return `❌ **Insufficient Credits for Image Generation**

You need **${creditsCheck.requiredCredits} credits** but only have **${creditsCheck.availableCredits} credits** remaining.

**💡 Solutions:**
- Add your own ${provider.name} API key in Settings → API Keys for unlimited usage
- Wait until your credits reset next month
- The image costs $${modelPrice.toFixed(3)} (${creditsCheck.requiredCredits} credits)

**Current Provider:** ${modelName} - $${modelPrice.toFixed(3)} per image`;
          }

          if (creditsCheck.wouldExceedSpending) {
            return `❌ **Monthly Spending Limit**

Generating this image would exceed your monthly spending limit.

**💡 Solutions:**
- Add your own ${provider.name} API key for unlimited usage
- Wait until next month when limits reset
- The image costs $${modelPrice.toFixed(3)} (${creditsCheck.requiredCredits} credits)`;
          }
        }

        // Generate the image
        const result = await provider.generateImage(
          ctx,
          { prompt, style, aspectRatio, modelId: imageModel },
          usingUserKey
        );

        // Deduct credits only if using built-in keys
        if (!usingUserKey) {
          const deductionResult = await ctx.runMutation(
            api.usage.deductImageCredits,
            {
              imageModel,
            }
          );
        }

        return result;
      } catch (error) {
        console.error("Image generation error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        return `❌ **Image Generation Failed**

Error: ${errorMessage}

**💡 Try:**
- Rephrasing your prompt
- Checking your API key configuration in Settings
- Using a different image model from Settings → AI & Behavior`;
      }
    },
  });
}
