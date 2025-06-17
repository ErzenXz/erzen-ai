import { getModelInfo } from "../../../src/lib/models";
import { createWebSearchTool, createDeepSearchTool } from "./webSearch";
import { createWeatherTool } from "./weather";
import { createDateTimeTool } from "./datetime";
import { createCalculatorTool } from "./calculator";
import { createThinkingTool } from "./thinking";
import { createMemoryTool } from "./memory";
import { createUrlFetchTool } from "./urlFetch";
import { createCodeAnalysisTool } from "./codeAnalysis";
import { createImageGenerationTool } from "./imageGeneration";

// Export all tool creators
export {
  createWebSearchTool,
  createDeepSearchTool,
  createWeatherTool,
  createDateTimeTool,
  createCalculatorTool,
  createThinkingTool,
  createMemoryTool,
  createUrlFetchTool,
  createCodeAnalysisTool,
  createImageGenerationTool,
};

// Helper function to create tools based on enabled tools and model capabilities
export function createAvailableTools(
  ctx: any,
  enabledTools: string[],
  model: string,
  usingUserKey: boolean
): Record<string, any> {
  // Check if the selected model supports tools
  const modelInfo = getModelInfo(model);
  const modelSupportsTools = modelInfo.supportsTools;

  // Create tools based on enabled tools (only if model supports them)
  const availableTools: Record<string, any> = {};

  // If model doesn't support tools but user has tools enabled, return empty tools
  if (!modelSupportsTools && enabledTools.length > 0) {
    return availableTools; // Return empty tools object
  }

  // Only create tools if model supports them
  if (!modelSupportsTools) {
    return availableTools;
  }

  if (enabledTools.includes("web_search")) {
    availableTools.web_search = createWebSearchTool(ctx, usingUserKey);
  }

  if (enabledTools.includes("deep_search")) {
    availableTools.deep_search = createDeepSearchTool(ctx, usingUserKey);
  }

  if (enabledTools.includes("weather")) {
    availableTools.weather = createWeatherTool(ctx);
  }

  if (enabledTools.includes("datetime")) {
    availableTools.datetime = createDateTimeTool();
  }

  if (enabledTools.includes("calculator")) {
    availableTools.calculator = createCalculatorTool();
  }

  if (enabledTools.includes("thinking")) {
    availableTools.thinking = createThinkingTool();
  }

  if (enabledTools.includes("memory")) {
    availableTools.memory = createMemoryTool(ctx);
  }

  if (enabledTools.includes("url_fetch")) {
    availableTools.url_fetch = createUrlFetchTool();
  }

  if (enabledTools.includes("code_analysis")) {
    availableTools.code_analysis = createCodeAnalysisTool();
  }

  if (enabledTools.includes("image_generation")) {
    availableTools.image_generation = createImageGenerationTool(ctx);
  }

  return availableTools;
}

// Tool configuration for UI
export const TOOL_CONFIGS = {
  web_search: {
    id: "web_search",
    name: "Web Search",
    description: "Search the web for current information",
    requiresApiKey: "tavily",
    category: "search",
  },
  deep_search: {
    id: "deep_search",
    name: "Deep Search",
    description: "Comprehensive research with multiple queries",
    requiresApiKey: "tavily",
    category: "search",
    premium: false,
  },
  weather: {
    id: "weather",
    name: "Weather",
    description: "Get current weather information",
    requiresApiKey: "openweather",
    category: "information",
  },
  datetime: {
    id: "datetime",
    name: "Date & Time",
    description: "Get current date and time information",
    requiresApiKey: null,
    category: "information",
  },
  calculator: {
    id: "calculator",
    name: "Calculator",
    description: "Perform mathematical calculations",
    requiresApiKey: null,
    category: "computation",
  },
  thinking: {
    id: "thinking",
    name: "Thinking",
    description: "Think through complex problems step by step",
    requiresApiKey: null,
    category: "reasoning",
  },
  memory: {
    id: "memory",
    name: "Memory",
    description: "Store and retrieve conversation memory",
    requiresApiKey: null,
    category: "utility",
  },
  url_fetch: {
    id: "url_fetch",
    name: "URL Fetch",
    description: "Fetch content from URLs to analyze or summarize",
    requiresApiKey: null,
    category: "utility",
  },
  code_analysis: {
    id: "code_analysis",
    name: "Code Analysis",
    description: "Analyze code for issues, improvements, or explanations",
    requiresApiKey: null,
    category: "development",
  },
  image_generation: {
    id: "image_generation",
    name: "Image Generation",
    description: "Generate images from text descriptions using AI",
    requiresApiKey: "cloudflare",
    category: "creative",
  },
} as const;

export type ToolId = keyof typeof TOOL_CONFIGS;

// Function to get available tools configuration
export function getAvailableToolsConfig(): typeof TOOL_CONFIGS {
  return TOOL_CONFIGS;
}
