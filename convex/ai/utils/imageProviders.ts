"use node";

import { api } from "../../_generated/api";
import { IMAGE_MODELS } from "../../../src/lib/models";

export interface ImageGenerationOptions {
  prompt: string;
  style?: string;
  aspectRatio?: string;
  modelId: string;
}

export interface ImageProvider {
  name: string;
  generateImage: (
    ctx: any,
    options: ImageGenerationOptions,
    usingUserKey: boolean
  ) => Promise<string>;
  requiresApiKey: boolean;
}

// Cloudflare Image Provider (supports multiple models)
export const cloudflareImageProvider: ImageProvider = {
  name: "Cloudflare AI",
  requiresApiKey: false,
  generateImage: async (ctx: any, options: ImageGenerationOptions) => {
    const cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const cloudflareApiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!cloudflareAccountId) {
      throw new Error("CLOUDFLARE_ACCOUNT_ID environment variable is not set");
    }
    if (!cloudflareApiToken) {
      throw new Error("CLOUDFLARE_API_TOKEN environment variable is not set");
    }

    // Get the model configuration
    const modelInfo = IMAGE_MODELS[options.modelId];
    if (!modelInfo || !modelInfo.cloudflareModel) {
      throw new Error(`Invalid model ID: ${options.modelId}`);
    }

    let enhancedPrompt = options.prompt;
    if (options.style) {
      enhancedPrompt += `, ${options.style} style`;
    }
    if (options.aspectRatio) {
      enhancedPrompt += `, aspect ratio ${options.aspectRatio}`;
    }

    // Generate a random seed
    const seed = Math.floor(Math.random() * 1000000);

    const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/ai/run/${modelInfo.cloudflareModel}`;

    try {
      console.log(
        `Generating image with ${modelInfo.displayName} for prompt: "${enhancedPrompt}"`
      );

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cloudflareApiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          seed: seed,
        }),
      });

      console.log(
        `Cloudflare response status: ${response.status}, content-type: ${response.headers.get("content-type")}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Cloudflare API error for ${modelInfo.displayName}! Status: ${response.status} - ${errorText}`
        );
      }

      const contentType = response.headers.get("content-type");
      console.log(`Response content-type: ${contentType}`);

      if (contentType?.includes("image/")) {
        // Direct image response (binary data)
        console.log("Processing direct image response");
        const imageBuffer = await response.arrayBuffer();

        if (!imageBuffer || imageBuffer.byteLength === 0) {
          throw new Error(
            `Received empty image data from ${modelInfo.displayName}`
          );
        }

        console.log(`Image buffer size: ${imageBuffer.byteLength} bytes`);
        const imageBlob = new Blob([imageBuffer], { type: "image/png" });
        return await uploadImageToStorage(
          ctx,
          imageBlob,
          options.prompt,
          options.style,
          options.aspectRatio,
          modelInfo.displayName
        );
      } else if (contentType?.includes("application/json")) {
        // JSON response - check Cloudflare's response format
        console.log("Processing JSON response");
        let data;
        const responseText = await response.text();

        try {
          data = JSON.parse(responseText);
          console.log(
            "Parsed JSON response structure:",
            JSON.stringify(data, null, 2)
          );
        } catch (parseError) {
          // Sometimes Cloudflare returns binary data with wrong content-type
          console.log("Failed to parse as JSON, treating as binary data");
          const imageBuffer = Buffer.from(responseText, "binary");
          const imageBlob = new Blob([imageBuffer], { type: "image/png" });
          return await uploadImageToStorage(
            ctx,
            imageBlob,
            options.prompt,
            options.style,
            options.aspectRatio,
            modelInfo.displayName
          );
        }

        if (data.success && data.result) {
          let imageBuffer: ArrayBuffer;

          // Handle different Cloudflare response formats
          if (typeof data.result === "string") {
            // Base64 string response
            imageBuffer = Buffer.from(data.result, "base64");
          } else if (
            data.result.image &&
            typeof data.result.image === "string"
          ) {
            // Image in nested object as base64 string
            imageBuffer = Buffer.from(data.result.image, "base64");
          } else if (Array.isArray(data.result) && data.result.length > 0) {
            // Array response - take first result
            const firstResult = data.result[0];
            if (typeof firstResult === "string") {
              imageBuffer = Buffer.from(firstResult, "base64");
            } else if (
              firstResult.image &&
              typeof firstResult.image === "string"
            ) {
              imageBuffer = Buffer.from(firstResult.image, "base64");
            } else if (
              firstResult instanceof ArrayBuffer ||
              Buffer.isBuffer(firstResult)
            ) {
              imageBuffer = firstResult;
            } else {
              throw new Error(
                `Unexpected result format: ${JSON.stringify(firstResult).substring(0, 200)}`
              );
            }
          } else if (
            data.result instanceof ArrayBuffer ||
            Buffer.isBuffer(data.result)
          ) {
            // Direct buffer response
            imageBuffer = data.result;
          } else {
            // Log the actual structure for debugging
            console.error(
              "Unexpected Cloudflare response structure:",
              JSON.stringify(data, null, 2)
            );
            throw new Error(
              `Unexpected result format from ${modelInfo.displayName}. Expected base64 string or buffer, got: ${typeof data.result}`
            );
          }

          if (!imageBuffer || imageBuffer.byteLength === 0) {
            throw new Error(
              `Received empty image data from ${modelInfo.displayName}`
            );
          }

          const imageBlob = new Blob([imageBuffer], { type: "image/png" });

          return await uploadImageToStorage(
            ctx,
            imageBlob,
            options.prompt,
            options.style,
            options.aspectRatio,
            modelInfo.displayName
          );
        } else {
          throw new Error(
            `${modelInfo.displayName} API error: ${data.errors ? JSON.stringify(data.errors) : "Unknown error"}`
          );
        }
      } else {
        // Unknown content type - try to handle as binary data first, then text
        console.log(
          `Unknown content type: ${contentType}, attempting binary handling`
        );

        try {
          const imageBuffer = await response.arrayBuffer();
          if (imageBuffer && imageBuffer.byteLength > 0) {
            console.log(
              `Successfully read ${imageBuffer.byteLength} bytes as binary data`
            );
            const imageBlob = new Blob([imageBuffer], { type: "image/png" });
            return await uploadImageToStorage(
              ctx,
              imageBlob,
              options.prompt,
              options.style,
              options.aspectRatio,
              modelInfo.displayName
            );
          }
        } catch (binaryError) {
          console.log("Binary handling failed, trying text");
        }

        // Fallback to text handling
        const responseText = await response.text();
        console.error(`Unexpected response from ${modelInfo.displayName}:`, {
          contentType,
          responseLength: responseText.length,
          responsePreview: responseText.substring(0, 200),
        });

        throw new Error(
          `Unexpected content type from ${modelInfo.displayName}: ${contentType}. Response: ${responseText.substring(0, 200)}`
        );
      }
    } catch (error) {
      console.error(`${modelInfo.displayName} API error:`, error);
      throw new Error(
        `${modelInfo.displayName} generation error: ${error instanceof Error ? error.message : "Unknown error"}. Please try again or check your connection.`
      );
    }
  },
};

// Helper function to upload image to Convex storage
async function uploadImageToStorage(
  ctx: any,
  imageBlob: Blob,
  prompt: string,
  style?: string,
  aspectRatio?: string,
  modelName?: string
): Promise<string> {
  // Generate upload URL
  const uploadUrl = await ctx.runMutation(api.files.generateUploadUrl);

  // Upload the image to Convex storage
  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": "image/png",
    },
    body: imageBlob,
  });

  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload image: ${uploadResponse.statusText}`);
  }

  const { storageId } = await uploadResponse.json();

  // Store file metadata
  await ctx.runMutation(api.files.storeFileMetadata, {
    storageId,
    fileName: `generated-image-${Date.now()}.png`,
    fileType: "image/png",
    fileSize: imageBlob.size,
  });

  // Get the public URL for the image
  const imageUrl = await ctx.storage.getUrl(storageId);

  return `Successfully generated image using ${modelName || "Cloudflare AI"}: "${prompt}"${style ? ` in ${style} style` : ""}${aspectRatio ? ` with ${aspectRatio} aspect ratio` : ""}

![Generated Image](${imageUrl})

Image URL: ${imageUrl}`;
}

// Create provider registry dynamically from IMAGE_MODELS
export const IMAGE_PROVIDERS = Object.keys(IMAGE_MODELS).reduce(
  (providers, modelId) => {
    providers[modelId] = cloudflareImageProvider;
    return providers;
  },
  {} as Record<string, ImageProvider>
);

export type ImageModelId = keyof typeof IMAGE_PROVIDERS;
