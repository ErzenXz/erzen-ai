import { tool } from "ai";
import { z } from "zod";
import { createImage } from "../utils/images";

export function createImageGenerationTool(ctx: any) {
  return tool({
    description:
      "Generate an image based on a text prompt. Creates high-quality images using AI and returns the image URL for display in the chat.",
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
      return await createImage(ctx, prompt, style, aspectRatio);
    },
  });
}
