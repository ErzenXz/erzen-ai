import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// Generate upload URL for files
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

// Store file metadata after upload
export const storeFileMetadata = mutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    extractedText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Store file metadata in our custom table
    return await ctx.db.insert("uploadedFiles", {
      userId,
      storageId: args.storageId,
      fileName: args.fileName,
      fileType: args.fileType,
      fileSize: args.fileSize,
      extractedText: args.extractedText,
      uploadedAt: Date.now(),
    });
  },
});

// Get file by storage ID
export const getFile = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get file metadata from our table
    const fileRecord = await ctx.db
      .query("uploadedFiles")
      .withIndex("by_storage_id", (q) => q.eq("storageId", args.storageId))
      .unique();

    if (!fileRecord || fileRecord.userId !== userId) {
      throw new Error("File not found or access denied");
    }

    // Get the file URL from storage
    const fileUrl = await ctx.storage.getUrl(args.storageId);

    return {
      ...fileRecord,
      url: fileUrl,
    };
  },
});

// Extract text from various file types
export const extractTextFromFile = action({
  args: {
    storageId: v.id("_storage"),
    fileType: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Get the file from storage
      const fileUrl = await ctx.storage.getUrl(args.storageId);
      if (!fileUrl) {
        throw new Error("File not found");
      }

      // Fetch the file content
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const fileType = args.fileType.toLowerCase();

      let extractedText = "";

      if (fileType.includes("text/plain")) {
        // Plain text file
        const textDecoder = new TextDecoder();
        extractedText = textDecoder.decode(arrayBuffer);
      } else if (fileType.includes("application/json")) {
        // JSON file
        const textDecoder = new TextDecoder();
        const jsonContent = textDecoder.decode(arrayBuffer);
        try {
          const parsed = JSON.parse(jsonContent);
          extractedText = `JSON content:\n${JSON.stringify(parsed, null, 2)}`;
        } catch {
          extractedText = jsonContent;
        }
      } else if (fileType.includes("text/csv")) {
        // CSV file
        const textDecoder = new TextDecoder();
        extractedText = textDecoder.decode(arrayBuffer);
      } else if (
        fileType.includes("text/markdown") ||
        fileType.includes("text/x-markdown")
      ) {
        // Markdown file
        const textDecoder = new TextDecoder();
        extractedText = textDecoder.decode(arrayBuffer);
      } else if (fileType.includes("application/pdf")) {
        // For PDF files, we'll need a more sophisticated approach
        // For now, return a placeholder message
        extractedText =
          "[PDF file uploaded - text extraction not yet implemented. Please provide a brief description of the PDF content if needed for the AI to process it.]";
      } else if (
        fileType.includes("application/msword") ||
        fileType.includes(
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
      ) {
        // Word documents - placeholder for now
        extractedText =
          "[Word document uploaded - text extraction not yet implemented. Please provide a brief description of the document content if needed for the AI to process it.]";
      } else if (fileType.includes("text/")) {
        // Any other text file
        const textDecoder = new TextDecoder();
        extractedText = textDecoder.decode(arrayBuffer);
      } else {
        // Binary file - check if it's an image
        if (fileType.includes("image/")) {
          extractedText =
            "[Image file uploaded - content will be analyzed by vision-capable AI models]";
        } else {
          extractedText = `[Binary file of type ${fileType} uploaded - content cannot be extracted as text]`;
        }
      }

      return extractedText.trim();
    } catch (error) {
      console.error("Text extraction failed:", error);
      return `[Failed to extract text from file: ${error instanceof Error ? error.message : "Unknown error"}]`;
    }
  },
});

// List user's uploaded files
export const listUserFiles = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const files = await ctx.db
      .query("uploadedFiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(args.limit || 20);

    // Get URLs for each file
    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        const url = await ctx.storage.getUrl(file.storageId);
        return {
          ...file,
          url,
        };
      })
    );

    return filesWithUrls;
  },
});

// Delete a file
export const deleteFile = mutation({
  args: {
    fileId: v.id("uploadedFiles"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const file = await ctx.db.get(args.fileId);
    if (!file || file.userId !== userId) {
      throw new Error("File not found or access denied");
    }

    // Delete from storage
    await ctx.storage.delete(file.storageId);

    // Delete from our metadata table
    await ctx.db.delete(args.fileId);
  },
});
