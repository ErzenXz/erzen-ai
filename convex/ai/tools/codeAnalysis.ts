import { tool } from "ai";
import { z } from "zod";

export function createCodeAnalysisTool() {
  return tool({
    description:
      "Analyze code for bugs, performance issues, best practices, and provide refactoring suggestions. Use ONLY when users provide actual code that needs review, debugging, or optimization. Do NOT use for general programming questions, explanations, or code you can review directly in conversation.",
    parameters: z.object({
      code: z.string().describe("The actual code to analyze and review"),
      language: z
        .string()
        .optional()
        .describe(
          "Programming language of the code (e.g., javascript, python, java)"
        ),
      analysis_focus: z
        .enum([
          "bugs",
          "performance",
          "security",
          "style",
          "refactor",
          "comprehensive",
        ])
        .optional()
        .describe("Specific aspect of code analysis to focus on"),
    }),
    execute: async ({
      code,
      language = "javascript",
      analysis_focus = "comprehensive",
    }): Promise<string> => {
      let result = `Code Analysis (${analysis_focus}):\n\n`;

      if (language) {
        result += `Language: ${language}\n\n`;
      }

      result += `Code:\n\`\`\`${language || ""}\n${code}\n\`\`\`\n\n`;

      switch (analysis_focus) {
        case "bugs":
          result += "Potential Issues Found:\n";
          // Basic checks
          if (code.includes("eval(")) {
            result += "⚠️ Use of eval() detected - potential security risk\n";
          }
          if (code.includes("innerHTML")) {
            result += "⚠️ Use of innerHTML - potential XSS vulnerability\n";
          }
          if (code.match(/var\s+/)) {
            result += "💡 Consider using 'let' or 'const' instead of 'var'\n";
          }
          if (
            !code.includes("try") &&
            (code.includes("fetch") || code.includes("await"))
          ) {
            result += "💡 Consider adding error handling with try-catch\n";
          }
          break;

        case "performance":
          result += "Performance Analysis:\n";
          result += "• Look for inefficient loops or nested iterations\n";
          result += "• Consider caching expensive operations\n";
          result += "• Optimize database queries if present\n";
          result += "• Use appropriate data structures\n";
          result += "• Consider async/await for I/O operations\n";
          break;

        case "security":
          result += "Security Analysis:\n";
          result += "• Check for input validation and sanitization\n";
          result += "• Look for SQL injection vulnerabilities\n";
          result += "• Verify authentication and authorization\n";
          result += "• Check for XSS vulnerabilities\n";
          result += "• Ensure sensitive data is properly handled\n";
          if (code.includes("eval(")) {
            result += "⚠️ eval() usage detected - security risk\n";
          }
          if (code.includes("innerHTML")) {
            result += "⚠️ innerHTML usage - potential XSS risk\n";
          }
          break;

        case "style":
          result += "Code Style Analysis:\n";
          result += "• Check consistent indentation and formatting\n";
          result += "• Verify naming conventions\n";
          result += "• Add proper comments and documentation\n";
          result += "• Consider breaking down large functions\n";
          result += "• Use meaningful variable and function names\n";
          break;

        case "refactor":
          result += "Refactoring Suggestions:\n";
          result += "• Extract reusable functions or classes\n";
          result += "• Eliminate code duplication\n";
          result += "• Improve function signatures and parameters\n";
          result += "• Apply design patterns where appropriate\n";
          result += "• Simplify complex conditional logic\n";
          break;

        case "comprehensive":
          result += "Comprehensive Analysis:\n";
          result += "• Bug detection and error handling review\n";
          result += "• Performance optimization opportunities\n";
          result += "• Security vulnerability assessment\n";
          result += "• Code style and maintainability check\n";
          result += "• Refactoring and design improvement suggestions\n";
          break;
      }

      return result;
    },
  });
}
