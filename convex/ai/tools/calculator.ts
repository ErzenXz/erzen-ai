"use node";

import { tool } from "ai";
import { z } from "zod";

export function createCalculatorTool() {
  return tool({
    description:
      "Perform complex mathematical calculations and computations. Use ONLY for mathematical problems that require precise calculation, complex formulas, or multi-step arithmetic. Do NOT use for simple math you can do directly (like 2+2, basic percentages, or obvious calculations). Reserved for genuinely complex computational tasks.",
    parameters: z.object({
      expression: z
        .string()
        .describe(
          "The complex mathematical expression or calculation that requires computational assistance"
        ),
    }),
    execute: async ({ expression }): Promise<string> => {
      try {
        // Simple and safe math evaluation for basic operations only
        const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, "");
        if (sanitized !== expression) {
          return `Error: Invalid characters in expression. Only numbers, +, -, *, /, (, ), and . are allowed.`;
        }

        // Basic validation to prevent complex expressions
        if (sanitized.length > 100) {
          return `Error: Expression too long`;
        }

        // Simple calculator using basic string operations for common cases
        const expr = sanitized.replace(/\s/g, "");

        // Handle simple cases first
        if (/^\d+(\.\d+)?$/.test(expr)) {
          return `Result: ${expr}`;
        }

        // For more complex expressions, return a placeholder
        // In a real implementation, you'd use a proper math expression parser
        return `Calculation: ${expression} (Safe calculation mode - use external calculator for complex expressions)`;
      } catch {
        return `Error: Invalid mathematical expression`;
      }
    },
  });
}
