"use node";

import { api } from "../../_generated/api";

export async function createImage(
  ctx: any,
  prompt: string,
  style?: string,
  aspectRatio?: string
): Promise<string> {
  try {
    // Get the API key from environment/config
    const apiKey = process.env.CF_WORKER_API_KEY;
    if (!apiKey) {
      return `Image generation failed: CF_WORKER_API_KEY environment variable is not set. Please configure your Cloudflare API key in your Convex environment variables.`;
    }

    let enhancedPrompt = prompt;
    if (style) {
      enhancedPrompt += `, ${style} style`;
    }
    if (aspectRatio) {
      enhancedPrompt += `, aspect ratio ${aspectRatio}`;
    }

    // Build request headers.
    // Some deployments of the worker expect a custom `auth` header, others use
    // the standard Bearer token syntax.  To be safe we send **both**.  If the
    // worker only checks one of them that header will be present.
    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      // Standard Bearer header that many services expect.
      Authorization: `Bearer ${apiKey.trim()}`,
      // Custom header used by the sample Cloudflare Worker template that
      // responds with 403 when it is missing (see https://developers.cloudflare.com/).
      auth: apiKey.trim(),
    };

    // Call the Fast Image AI API
    const response = await fetch("https://fast-image-ai.erzen.tk", {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify({
        prompt: enhancedPrompt,
        ...(style && { style }),
        ...(aspectRatio && { aspect_ratio: aspectRatio }),
      }),
    });

    // Fail fast on non-2xx responses so we do not continue with an invalid image
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `Image API request failed with status ${response.status}${errorText ? `: ${errorText}` : ""}`
      );
    }

    // Get the image data as array buffer
    const imageBuffer = await response.arrayBuffer();

    if (!imageBuffer || imageBuffer.byteLength === 0) {
      throw new Error("Received empty image data from API");
    }

    // Convert ArrayBuffer to Blob for Convex storage
    const imageBlob = new Blob([imageBuffer], { type: "image/png" });

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
    const fileMetadata = await ctx.runMutation(api.files.storeFileMetadata, {
      storageId,
      fileName: `generated-image-${Date.now()}.png`,
      fileType: "image/png",
      fileSize: imageBlob.size,
    });

    // Get the public URL for the image
    const imageUrl = await ctx.storage.getUrl(storageId);

    return `Successfully generated image: "${prompt}"${style ? ` in ${style} style` : ""}${aspectRatio ? ` with ${aspectRatio} aspect ratio` : ""}

![Generated Image](${imageUrl})

Image URL: ${imageUrl}`;
  } catch (error) {
    console.error("Image generation error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return `Failed to generate image: ${errorMessage}. Please try again with a different prompt or check your API configuration.`;
  }
}
