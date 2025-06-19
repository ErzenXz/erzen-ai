import { tool } from "ai";
import { z } from "zod";

export const canvasTool = tool({
  description: `Create a canvas for markdown content (essays, documents, long-form text) or code content (HTML/CSS/JS websites, single-file applications).

Use this tool when the user requests:
- Writing essays, articles, documentation, or other long-form text content
- Creating websites, web pages, or interactive demos  
- Building single-file HTML/CSS/JS applications
- Writing code that would benefit from live preview

Canvas is ideal for:
- Structured text that needs editing and formatting
- Web development projects with visual output
- Interactive content that users may want to modify

Do NOT use canvas for:
- Simple responses or short answers
- Code snippets that are just explanations
- Basic conversations`,

  parameters: z.object({
    type: z
      .enum(["markdown", "code"])
      .describe(
        "Type of canvas: 'markdown' for text content, 'code' for web development"
      ),
    title: z
      .string()
      .describe("Short, descriptive title for the canvas content"),
    content: z
      .string()
      .describe("The actual content - markdown text or HTML/CSS/JS code"),
    language: z
      .string()
      .optional()
      .describe("Programming language for code canvas (html, css, js, etc.)"),
  }),

  execute: async ({ type, title, content, language }) => {
    // This tool returns the canvas data to be included in the message
    return {
      type,
      title,
      content,
      language,
      updatedAt: Date.now(),
    };
  },
});
