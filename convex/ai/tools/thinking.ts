import { tool } from "ai";
import { z } from "zod";

export function createThinkingTool() {
  return tool({
    description:
      "Structure complex problem-solving with explicit step-by-step reasoning. Use ONLY for genuinely complex, multi-faceted problems that benefit from structured analysis. Do NOT use for simple questions, casual conversation, or problems you can solve directly. Reserved for complex logical reasoning, planning, or analysis tasks.",
    parameters: z.object({
      problem: z
        .string()
        .describe(
          "The complex problem or multi-faceted question requiring structured analysis"
        ),
      steps: z
        .array(z.string())
        .describe(
          "The specific reasoning steps needed to systematically work through this complex problem"
        ),
    }),
    execute: async ({ problem, steps }): Promise<string> => {
      let thinking = `Structured analysis of: ${problem}\n\n`;
      steps.forEach((step, index) => {
        thinking += `Step ${index + 1}: ${step}\n`;
      });
      thinking += `\nStructured analysis complete. Ready to provide a comprehensive response based on this reasoning.`;
      return thinking;
    },
  });
}
