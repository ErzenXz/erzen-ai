export interface ModelInfo {
  id: string;
  displayName: string;
  provider: string;
  maxInputTokens: number;
  maxOutputTokens: number;
  contextWindow: number;
  pricing?: {
    input: number; // per 1M tokens
    output: number; // per 1M tokens
  };
  capabilities: string[];
  description: string;
  icon: string;
  supportsTools: boolean; // Whether the model supports function calling/tools
  isMultimodal: boolean; // Whether the model supports vision/images
  supportsThinking: boolean; // Whether the model supports thinking/reasoning
  thinkingBudgets?: string[] | number[]; // Thinking budget options - can be ['low', 'medium', 'high'] or [1024, 2048, 4096] tokens
  parameters?: string; // Model size/parameters info (e.g., "70B", "Mini", "Lite")
}

export interface ProviderConfig {
  name: string;
  icon: string;
  models: string[];
  isBuiltIn?: boolean;
}

export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  openai: {
    name: "OpenAI",
    models: [
      "o3-mini",
      "o4-mini",
      "o3",
      "o1",
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4.1-nano",
      "gpt-4o",
      "gpt-4o-mini",
    ],
    icon: "🤖",
    isBuiltIn: true,
  },
  google: {
    name: "Google AI",
    models: [
      "gemini-2.5-pro",
      "gemini-2.5-flash-preview-05-20",
      "gemini-2.5-flash-lite-preview-06-17",
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
      "gemini-1.5-pro",
      "gemini-1.5-flash",
    ],
    icon: "🔍",
    isBuiltIn: true,
  },
  anthropic: {
    name: "Anthropic",
    models: [
      "claude-sonnet-4-0",
      "claude-opus-4-0",
      "claude-3-7-sonnet-latest",
      "claude-3-5-sonnet-latest",
      "claude-3-5-haiku-latest",
      "claude-3-opus-latest",
    ],
    icon: "🧠",
    isBuiltIn: true,
  },
  openrouter: {
    name: "OpenRouter",
    models: [
      "deepseek/deepseek-chat-v3-0324:free",
      "deepseek/deepseek-r1-0528:free",
      "deepseek/deepseek-r1:free",
      "tngtech/deepseek-r1t-chimera:free",
      "deepseek/deepseek-prover-v2:free",
      "microsoft/phi-4-reasoning-plus:free",
      "mistralai/devstral-small:free",
      "qwen/qwen2.5-vl-72b-instruct:free",
      "mistralai/mistral-small-3.1-24b-instruct:free",
      "google/gemma-3-27b-it:free",
      "qwen/qwen3-30b-a3b:free",
      "anthropic/claude-3.5-sonnet",
      "openai/gpt-4o",
      "meta-llama/llama-3.1-405b-instruct",
      "mistralai/mixtral-8x7b-instruct",
      "cohere/command-r-plus",
    ],
    icon: "🔀",
    isBuiltIn: true,
  },
  groq: {
    name: "Groq",
    models: [
      "deepseek-r1-distill-llama-70b",
      "llama-3.3-70b-versatile",
      "qwen-qwq-32b",
      "qwen/qwen3-32b",
      "meta-llama/llama-4-scout-17b-16e-instruct",
      "meta-llama/llama-4-maverick-17b-128e-instruct",
      "compound-beta",
      "compound-beta-mini",
      "llama-3.1-8b-instant",
    ],
    icon: "⚡",
    isBuiltIn: true,
  },
  deepseek: {
    name: "DeepSeek",
    models: ["deepseek-chat", "deepseek-reasoner"],
    icon: "🔍",
    isBuiltIn: false,
  },
  grok: {
    name: "Grok",
    models: [
      "grok-3-beta",
      "grok-3-mini-beta",
      "grok-2-vision-1212",
      "grok-2-image-1212",
      "grok-beta",
      "grok-vision-beta",
    ],
    icon: "🚀",
    isBuiltIn: false,
  },
  cohere: {
    name: "Cohere",
    models: [
      "command-a-03-2025",
      "command-r7b-12-2024",
      "command-r-plus",
      "command-r-08-2024",
      "command-r",
      "command",
      "c4ai-aya-expanse-32b",
      "c4ai-aya-expanse-8b",
      "c4ai-aya-vision-32b",
      "c4ai-aya-vision-8b",
    ],
    icon: "🎯",
    isBuiltIn: true,
  },
  mistral: {
    name: "Mistral AI",
    models: [
      "magistral-medium-2506",
      "magistral-small-2506",
      "mistral-medium-2505",
      "mistral-small-2503",
      "devstral-small-2505",
      "pixtral-12b-2409",
      "ministral-8b-2410",
      "ministral-3b-2410",
      "mistral-saba-2502",
      "accounts/fireworks/models/mistral-small-24b-instruct-2501",
      "mistral-large-latest",
      "mistral-medium-latest",
      "mistral-small-latest",
      "codestral-latest",
    ],
    icon: "🌟",
    isBuiltIn: false,
  },
};

export const MODEL_INFO: Record<string, ModelInfo> = {
  // OpenAI Models
  "o3-mini": {
    id: "o3-mini",
    displayName: "o3 mini",
    provider: "openai",
    maxInputTokens: 200000,
    maxOutputTokens: 100000,
    contextWindow: 200000,
    pricing: { input: 1.1, output: 4.4 },
    capabilities: ["Text", "Code", "Reasoning", "Math"],
    description:
      "Advanced reasoning model optimized for complex problem solving",
    icon: "🤖",
    supportsTools: true,
    isMultimodal: true,
    supportsThinking: true,
    thinkingBudgets: ["low", "medium", "high"],
  },
  "o4-mini": {
    id: "o4-mini",
    displayName: "o4 mini",
    provider: "openai",
    maxInputTokens: 200000,
    maxOutputTokens: 100000,
    contextWindow: 200000,
    pricing: { input: 1.1, output: 4.4 },
    capabilities: ["Text", "Code", "Advanced Reasoning", "Math", "Science"],
    description: "Next-generation reasoning model with enhanced capabilities",
    icon: "🤖",
    supportsTools: true,
    isMultimodal: true,
    supportsThinking: true,
    thinkingBudgets: ["low", "medium", "high"],
  },
  o3: {
    id: "o3",
    displayName: "o3",
    provider: "openai",
    maxInputTokens: 200000,
    maxOutputTokens: 100000,
    contextWindow: 200000,
    pricing: { input: 2, output: 8 },
    capabilities: ["Text", "Code", "Reasoning", "Math"],
    description: "Next-generation reasoning model with enhanced capabilities",
    icon: "🤖",
    supportsTools: true,
    isMultimodal: true,
    supportsThinking: true,
    thinkingBudgets: ["low", "medium", "high"],
  },
  o1: {
    id: "o1",
    displayName: "o1",
    provider: "openai",
    maxInputTokens: 200000,
    maxOutputTokens: 100000,
    contextWindow: 200000,
    pricing: { input: 15, output: 60 },
    capabilities: ["Text", "Code", "Advanced Reasoning", "Math", "Science"],
    description:
      "Advanced reasoning model optimized for complex problem solving",
    icon: "🤖",
    supportsTools: true,
    isMultimodal: true,
    supportsThinking: true,
    thinkingBudgets: ["low", "medium", "high"],
  },
  "gpt-4o": {
    id: "gpt-4o",
    displayName: "GPT-4o",
    provider: "openai",
    maxInputTokens: 128000,
    maxOutputTokens: 16384,
    contextWindow: 128000,
    pricing: { input: 5.0, output: 15.0 },
    capabilities: ["Text", "Code", "Vision", "Audio", "Function Calling"],
    description: "Most capable multimodal model with vision and audio",
    icon: "🤖",
    supportsTools: true,
    isMultimodal: true,
    supportsThinking: false,
    thinkingBudgets: undefined,
  },
  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    displayName: "GPT-4o",
    provider: "openai",
    maxInputTokens: 128000,
    maxOutputTokens: 16384,
    contextWindow: 128000,
    pricing: { input: 0.15, output: 0.6 },
    capabilities: ["Text", "Code", "Vision", "Function Calling"],
    description: "Efficient version of GPT-4o with multimodal capabilities",
    icon: "🤖",
    supportsTools: true,
    isMultimodal: true,
    supportsThinking: false,
    thinkingBudgets: undefined,
    parameters: "Mini",
  },

  "gpt-4.1": {
    id: "gpt-4.1",
    displayName: "GPT 4.1",
    provider: "openai",
    maxInputTokens: 1047576,
    maxOutputTokens: 32768,
    contextWindow: 1047576,
    pricing: { input: 2, output: 8 },
    capabilities: ["Text", "Code", "Advanced Reasoning", "Function Calling"],
    description: "Enhanced version of GPT-4 with improved capabilities",
    icon: "🤖",
    supportsTools: true,
    isMultimodal: true,
    supportsThinking: false,
    thinkingBudgets: undefined,
  },
  "gpt-4.1-mini": {
    id: "gpt-4.1-mini",
    displayName: "GPT 4.1",
    provider: "openai",
    maxInputTokens: 1047576,
    maxOutputTokens: 32768,
    contextWindow: 1047576,
    pricing: { input: 0.4, output: 1.6 },
    capabilities: ["Text", "Code", "Function Calling"],
    description: "Efficient version of GPT 4.1",
    icon: "🤖",
    supportsTools: true,
    isMultimodal: true,
    supportsThinking: false,
    thinkingBudgets: undefined,
    parameters: "Mini",
  },
  "gpt-4.1-nano": {
    id: "gpt-4.1-nano",
    displayName: "GPT 4.1",
    provider: "openai",
    maxInputTokens: 1047576,
    maxOutputTokens: 32768,
    contextWindow: 1047576,
    pricing: { input: 0.1, output: 0.4 },
    capabilities: ["Text", "Code", "Fast Processing"],
    description: "Ultra-fast and cost-effective nano version of GPT 4.1",
    icon: "🤖",
    supportsTools: true,
    isMultimodal: true,
    supportsThinking: false,
    thinkingBudgets: undefined,
    parameters: "Nano",
  },

  // Google Models
  "gemini-2.0-flash": {
    id: "gemini-2.0-flash",
    displayName: "Gemini 2.0 Flash",
    provider: "google",
    maxInputTokens: 1000000,
    maxOutputTokens: 8192,
    contextWindow: 1000000,
    pricing: { input: 0.1, output: 0.4 },
    capabilities: ["Text", "Code", "Vision", "Audio", "Video", "Tool Use"],
    description: "Latest multimodal model with massive context window",
    icon: "🔍",
    supportsTools: true,
    isMultimodal: true,
    supportsThinking: false,
    thinkingBudgets: undefined,
  },
  "gemini-2.0-flash-lite": {
    id: "gemini-2.0-flash-lite",
    displayName: "Gemini 2.0 Flash",
    provider: "google",
    maxInputTokens: 1000000,
    maxOutputTokens: 8192,
    contextWindow: 1000000,
    pricing: { input: 0.075, output: 0.3 },
    capabilities: ["Text", "Code", "Vision", "Fast Processing"],
    description: "Lightweight version of Gemini 2.0 Flash",
    icon: "🔍",
    supportsTools: true,
    isMultimodal: true,
    supportsThinking: false,
    thinkingBudgets: undefined,
    parameters: "Lite",
  },
  "gemini-2.5-pro": {
    id: "gemini-2.5-pro",
    displayName: "Gemini 2.5 Pro",
    provider: "google",
    maxInputTokens: 1048576,
    maxOutputTokens: 65536,
    contextWindow: 1048576,
    pricing: { input: 2.5, output: 10.0 },
    capabilities: [
      "Text",
      "Code",
      "Vision",
      "Audio",
      "Video",
      "Advanced Reasoning",
    ],
    description: "Preview of next-generation Gemini Pro model",
    icon: "🔍",
    supportsTools: true,
    isMultimodal: true,
    supportsThinking: true,
    thinkingBudgets: undefined,
  },
  "gemini-2.5-flash-preview-05-20": {
    id: "gemini-2.5-flash-preview-05-20",
    displayName: "Gemini 2.5 Flash",
    provider: "google",
    maxInputTokens: 1048576,
    maxOutputTokens: 65536,
    contextWindow: 1048576,
    pricing: { input: 0.15, output: 1 },
    capabilities: ["Text", "Code", "Vision", "Audio", "Fast Processing"],
    description: "Preview of next-generation Gemini Flash model",
    icon: "🔍",
    supportsTools: true,
    isMultimodal: true,
    supportsThinking: true,
    thinkingBudgets: [0, 1024, 2048, 4096, 8192],
  },
  "gemini-2.5-flash-lite-preview-06-17": {
    id: "gemini-2.5-flash-lite-preview-06-17",
    displayName: "Gemini 2.5 Flash",
    provider: "google",
    maxInputTokens: 1048576,
    maxOutputTokens: 65536,
    contextWindow: 1048576,
    pricing: { input: 0.1, output: 0.4 },
    capabilities: ["Text", "Code", "Vision", "Audio", "Fast Processing"],
    description: "Preview of next-generation Gemini Flash Lite model",
    icon: "🔍",
    supportsTools: true,
    isMultimodal: true,
    supportsThinking: true,
    thinkingBudgets: [0, 1024, 2048, 4096, 8192],
    parameters: "Lite",
  },
  "gemini-1.5-pro": {
    id: "gemini-1.5-pro",
    displayName: "Gemini 1.5 Pro",
    provider: "google",
    maxInputTokens: 2097152,
    maxOutputTokens: 8192,
    contextWindow: 2097152,
    pricing: { input: 2.5, output: 10.0 },
    capabilities: [
      "Text",
      "Code",
      "Vision",
      "Audio",
      "Video",
      "Document Analysis",
    ],
    description: "High-performance model with 2M token context window",
    icon: "🔍",
    supportsTools: true,
    isMultimodal: true,
    supportsThinking: false,
    thinkingBudgets: undefined,
  },
  "gemini-1.5-flash": {
    id: "gemini-1.5-flash",
    displayName: "Gemini 1.5 Flash",
    provider: "google",
    maxInputTokens: 1048576,
    maxOutputTokens: 8192,
    contextWindow: 1048576,
    pricing: { input: 0.075, output: 0.3 },
    capabilities: ["Text", "Code", "Vision", "Audio", "Fast Processing"],
    description: "Fast and efficient version of Gemini 1.5",
    icon: "🔍",
    supportsTools: true,
    isMultimodal: true,
    supportsThinking: false,
    thinkingBudgets: undefined,
  },

  // Anthropic Models
  "claude-3-5-sonnet-latest": {
    id: "claude-3-5-sonnet-latest",
    displayName: "Claude 3.5 Sonnet",
    provider: "anthropic",
    maxInputTokens: 200000,
    maxOutputTokens: 8192,
    contextWindow: 200000,
    pricing: { input: 3.0, output: 15.0 },
    capabilities: ["Text", "Code", "Vision", "Analysis", "Creative Writing"],
    description: "Balanced model for complex reasoning and creative tasks",
    icon: "🧠",
    supportsTools: true,
    isMultimodal: true,
    supportsThinking: false,
    thinkingBudgets: undefined,
  },
  "claude-3-5-haiku-latest": {
    id: "claude-3-5-haiku-latest",
    displayName: "Claude 3.5 Haiku",
    provider: "anthropic",
    maxInputTokens: 200000,
    maxOutputTokens: 8192,
    contextWindow: 200000,
    pricing: { input: 0.8, output: 4.0 },
    capabilities: ["Text", "Code", "Fast Processing", "Concise Responses"],
    description: "Fast and efficient model for quick tasks",
    icon: "🧠",
    supportsTools: true,
    isMultimodal: true,
    supportsThinking: false,
    thinkingBudgets: undefined,
  },
  "claude-3-opus-latest": {
    id: "claude-3-opus-latest",
    displayName: "Claude 3 Opus",
    provider: "anthropic",
    maxInputTokens: 200000,
    maxOutputTokens: 4096,
    contextWindow: 200000,
    pricing: { input: 15.0, output: 75.0 },
    capabilities: ["Text", "Code", "Complex Reasoning", "Research", "Analysis"],
    description: "Most capable model for complex and nuanced tasks",
    icon: "🧠",
    supportsTools: true,
    isMultimodal: true,
    supportsThinking: false,
    thinkingBudgets: undefined,
  },
  "claude-sonnet-4-0": {
    id: "claude-sonnet-4-0",
    displayName: "Claude Sonnet 4",
    provider: "anthropic",
    maxInputTokens: 200000,
    maxOutputTokens: 64000,
    contextWindow: 200000,
    pricing: { input: 3.0, output: 15.0 },
    capabilities: ["Text", "Code", "Vision", "Advanced Reasoning", "Research"],
    description: "Next-generation Claude model with enhanced capabilities",
    icon: "🧠",
    supportsTools: true,
    isMultimodal: true,
    supportsThinking: true,
    thinkingBudgets: [1024, 2048, 4096],
  },
  "claude-opus-4-0": {
    id: "claude-opus-4-0",
    displayName: "Claude Opus 4",
    provider: "anthropic",
    maxInputTokens: 200000,
    maxOutputTokens: 32000,
    contextWindow: 200000,
    pricing: { input: 15.0, output: 75.0 },
    capabilities: [
      "Text",
      "Code",
      "Vision",
      "Complex Reasoning",
      "Research",
      "Analysis",
    ],
    description: "Most advanced Claude model for the most challenging tasks",
    icon: "🧠",
    supportsTools: true,
    isMultimodal: true,
    supportsThinking: true,
    thinkingBudgets: [1024, 2048, 4096],
  },
  "claude-3-7-sonnet-latest": {
    id: "claude-3-7-sonnet-latest",
    displayName: "Claude 3.7 Sonnet",
    provider: "anthropic",
    maxInputTokens: 200000,
    maxOutputTokens: 64000,
    contextWindow: 200000,
    pricing: { input: 3, output: 15 },
    capabilities: [
      "Text",
      "Code",
      "Vision",
      "Advanced Reasoning",
      "Creative Writing",
    ],
    description: "Enhanced version of Claude 3.5 with improved reasoning",
    icon: "🧠",
    supportsTools: true,
    isMultimodal: true,
    supportsThinking: true,
    thinkingBudgets: [1024, 2048, 4096],
  },

  // Groq Models
  "deepseek-r1-distill-llama-70b": {
    id: "deepseek-r1-distill-llama-70b",
    displayName: "DeepSeek R1 Llama",
    provider: "groq",
    maxInputTokens: 128000,
    maxOutputTokens: 8192,
    contextWindow: 128000,
    pricing: { input: 0.75, output: 0.99 },
    capabilities: ["Text", "Code", "Reasoning", "Ultra-Fast Inference"],
    description:
      "DeepSeek R1 distilled model with reasoning capabilities on Groq",
    icon: "⚡",
    supportsTools: true,
    isMultimodal: false,
    supportsThinking: true,
    thinkingBudgets: undefined,
    parameters: "70B",
  },
  "llama-3.3-70b-versatile": {
    id: "llama-3.3-70b-versatile",
    displayName: "Llama 3.3",
    provider: "groq",
    maxInputTokens: 128000,
    maxOutputTokens: 32768,
    contextWindow: 128000,
    pricing: { input: 0.59, output: 0.79 },
    capabilities: ["Text", "Code", "Ultra-Fast Inference"],
    description: "Latest Llama model with ultra-fast inference on Groq",
    icon: "⚡",
    supportsTools: true,
    isMultimodal: false,
    supportsThinking: false,
    thinkingBudgets: undefined,
    parameters: "70B",
  },
  "qwen-qwq-32b": {
    id: "qwen-qwq-32b",
    displayName: "QwQ",
    provider: "groq",
    maxInputTokens: 32768,
    maxOutputTokens: 8192,
    contextWindow: 32768,
    pricing: { input: 0.29, output: 0.39 },
    capabilities: ["Text", "Code", "Reasoning", "Ultra-Fast Inference"],
    description: "Qwen QwQ reasoning model with ultra-fast inference",
    icon: "⚡",
    supportsTools: true,
    isMultimodal: false,
    supportsThinking: true,
    thinkingBudgets: undefined,
    parameters: "32B",
  },
  "llama-3.1-8b-instant": {
    id: "llama-3.1-8b-instant",
    displayName: "Llama 3.1",
    provider: "groq",
    maxInputTokens: 128000,
    maxOutputTokens: 8192,
    contextWindow: 128000,
    pricing: { input: 0.05, output: 0.08 },
    capabilities: ["Text", "Code", "Instant Responses"],
    description: "Compact model with instant response times",
    icon: "⚡",
    supportsTools: true,
    isMultimodal: false,
    supportsThinking: false,
    thinkingBudgets: undefined,
    parameters: "8B",
  },
  "qwen/qwen3-32b": {
    id: "qwen/qwen3-32b",
    displayName: "Qwen 3",
    provider: "groq",
    maxInputTokens: 128000,
    maxOutputTokens: 16384,
    contextWindow: 128000,
    pricing: { input: 0.29, output: 0.59 },
    capabilities: [
      "Text",
      "Code",
      "Reasoning",
      "Thinking Mode",
      "Ultra-Fast Inference",
    ],
    description:
      "Latest Qwen model with dual thinking/non-thinking modes for complex reasoning",
    icon: "⚡",
    supportsTools: true,
    isMultimodal: false,
    supportsThinking: true,
    thinkingBudgets: [1024, 2048, 4096],
    parameters: "32B",
  },
  "meta-llama/llama-4-scout-17b-16e-instruct": {
    id: "meta-llama/llama-4-scout-17b-16e-instruct",
    displayName: "Llama 4 Scout",
    provider: "groq",
    maxInputTokens: 131072,
    maxOutputTokens: 8192,
    contextWindow: 131072,
    pricing: { input: 0.11, output: 0.34 },
    capabilities: [
      "Text",
      "Code",
      "Vision",
      "Multimodal",
      "Ultra-Fast Inference",
    ],
    description:
      "Multimodal Llama 4 model with 16 experts for text and image understanding",
    icon: "⚡",
    supportsTools: true,
    isMultimodal: true,
    supportsThinking: false,
    thinkingBudgets: undefined,
  },
  "meta-llama/llama-4-maverick-17b-128e-instruct": {
    id: "meta-llama/llama-4-maverick-17b-128e-instruct",
    displayName: "Llama 4 Maverick",
    provider: "groq",
    maxInputTokens: 131072,
    maxOutputTokens: 8192,
    contextWindow: 131072,
    pricing: { input: 0.2, output: 0.6 },
    capabilities: [
      "Text",
      "Code",
      "Vision",
      "Multimodal",
      "Ultra-Fast Inference",
    ],
    description:
      "Advanced multimodal Llama 4 model with 128 experts for superior performance",
    icon: "⚡",
    supportsTools: true,
    isMultimodal: true,
    supportsThinking: false,
    thinkingBudgets: undefined,
  },
  "compound-beta": {
    id: "compound-beta",
    displayName: "Compound",
    provider: "groq",
    maxInputTokens: 128000,
    maxOutputTokens: 8192,
    contextWindow: 128000,
    pricing: { input: 0.15, output: 0.45 }, // Estimated based on underlying models
    capabilities: [
      "Text",
      "Code",
      "Web Search",
      "Code Execution",
      "Agentic Tools",
    ],
    description:
      "Compound AI system with web search and code execution capabilities",
    icon: "⚡",
    supportsTools: false,
    isMultimodal: false,
    supportsThinking: true,
    thinkingBudgets: undefined,
  },
  "compound-beta-mini": {
    id: "compound-beta-mini",
    displayName: "Compound ",
    provider: "groq",
    maxInputTokens: 128000,
    maxOutputTokens: 8192,
    contextWindow: 128000,
    pricing: { input: 0.1, output: 0.3 }, // Estimated based on underlying models
    capabilities: [
      "Text",
      "Code",
      "Web Search",
      "Code Execution",
      "Agentic Tools",
    ],
    description:
      "Efficient version of Compound Beta with web search and code execution",
    icon: "⚡",
    supportsTools: false, // Uses agentic tooling instead
    isMultimodal: false,
    supportsThinking: true,
    thinkingBudgets: undefined,
    parameters: "Mini",
  },

  // OpenRouter Models
  "deepseek/deepseek-chat-v3-0324:free": {
    id: "deepseek/deepseek-chat-v3-0324:free",
    displayName: "DeepSeek Chat V3",
    provider: "openrouter",
    maxInputTokens: 64000,
    maxOutputTokens: 8192,
    contextWindow: 64000,
    pricing: { input: 0, output: 0 }, // Free model
    capabilities: ["Text", "Code", "Math", "Reasoning"],
    description: "DeepSeek Chat V3 model via OpenRouter (Free)",
    icon: "🔀",
    supportsTools: true,
    isMultimodal: false,
    supportsThinking: false,
    thinkingBudgets: undefined,
  },
  "deepseek/deepseek-r1-0528:free": {
    id: "deepseek/deepseek-r1-0528:free",
    displayName: "DeepSeek R1",
    provider: "openrouter",
    maxInputTokens: 64000,
    maxOutputTokens: 8192,
    contextWindow: 64000,
    pricing: { input: 0, output: 0 }, // Free model
    capabilities: ["Text", "Code", "Advanced Reasoning", "Math"],
    description: "DeepSeek R1 reasoning model via OpenRouter (Free)",
    icon: "🔀",
    supportsTools: false,
    isMultimodal: false,
    supportsThinking: true,
    thinkingBudgets: undefined,
    parameters: "0528",
  },
  "deepseek/deepseek-r1:free": {
    id: "deepseek/deepseek-r1:free",
    displayName: "DeepSeek R1",
    provider: "openrouter",
    maxInputTokens: 64000,
    maxOutputTokens: 8192,
    contextWindow: 64000,
    pricing: { input: 0, output: 0 }, // Free model
    capabilities: ["Text", "Code", "Advanced Reasoning", "Math"],
    description: "DeepSeek R1 reasoning model via OpenRouter (Free)",
    icon: "🔀",
    supportsTools: false,
    isMultimodal: false,
    supportsThinking: true,
    thinkingBudgets: undefined,
  },
  "tngtech/deepseek-r1t-chimera:free": {
    id: "tngtech/deepseek-r1t-chimera:free",
    displayName: "DeepSeek R1T",
    provider: "openrouter",
    maxInputTokens: 64000,
    maxOutputTokens: 8192,
    contextWindow: 64000,
    pricing: { input: 0, output: 0 }, // Free model
    capabilities: ["Text", "Code", "Advanced Reasoning", "Math"],
    description: "DeepSeek R1T Chimera reasoning model via OpenRouter (Free)",
    icon: "🔀",
    supportsTools: true,
    isMultimodal: false,
    supportsThinking: true,
    thinkingBudgets: undefined,
    parameters: "Chimera",
  },
  "mistralai/devstral-small:free": {
    id: "mistralai/devstral-small:free",
    displayName: "Devstral",
    provider: "openrouter",
    maxInputTokens: 128000,
    maxOutputTokens: 8192,
    contextWindow: 128000,
    pricing: { input: 0, output: 0 }, // Free model
    capabilities: ["Code", "Programming", "Debugging", "Code Generation"],
    description: "Devstral Small coding model via OpenRouter (Free)",
    icon: "🔀",
    supportsTools: true,
    isMultimodal: false,
    supportsThinking: false,
    thinkingBudgets: undefined,
    parameters: "Small",
  },
  "qwen/qwen2.5-vl-72b-instruct:free": {
    id: "qwen/qwen2.5-vl-72b-instruct:free",
    displayName: "Qwen 2.5 VL",
    provider: "openrouter",
    maxInputTokens: 128000,
    maxOutputTokens: 8192,
    contextWindow: 128000,
    pricing: { input: 0, output: 0 }, // Free model
    capabilities: ["Text", "Code", "Vision", "Multimodal"],
    description: "Qwen 2.5 Vision-Language model via OpenRouter (Free)",
    icon: "🔀",
    supportsTools: true,
    isMultimodal: true,
    supportsThinking: false,
    thinkingBudgets: undefined,
    parameters: "72B",
  },
  "mistralai/mistral-small-3.1-24b-instruct:free": {
    id: "mistralai/mistral-small-3.1-24b-instruct:free",
    displayName: "Mistral Small 3.1",
    provider: "openrouter",
    maxInputTokens: 128000,
    maxOutputTokens: 8192,
    contextWindow: 128000,
    pricing: { input: 0, output: 0 }, // Free model
    capabilities: ["Text", "Code", "Function Calling"],
    description: "Mistral Small 3.1 model via OpenRouter (Free)",
    icon: "🔀",
    supportsTools: true,
    isMultimodal: false,
    supportsThinking: false,
    thinkingBudgets: undefined,
    parameters: "24B",
  },
  "google/gemma-3-27b-it:free": {
    id: "google/gemma-3-27b-it:free",
    displayName: "Gemma 3",
    provider: "openrouter",
    maxInputTokens: 8192,
    maxOutputTokens: 8192,
    contextWindow: 8192,
    pricing: { input: 0, output: 0 }, // Free model
    capabilities: ["Text", "Code", "Instruction Following"],
    description: "Google Gemma 3 instruction-tuned model via OpenRouter (Free)",
    icon: "🔀",
    supportsTools: true,
    isMultimodal: false,
    supportsThinking: false,
    thinkingBudgets: undefined,
    parameters: "27B",
  },
  "microsoft/phi-4-reasoning-plus:free": {
    id: "microsoft/phi-4-reasoning-plus:free",
    displayName: "Phi 4",
    provider: "openrouter",
    maxInputTokens: 32000,
    maxOutputTokens: 32000,
    contextWindow: 32000,
    pricing: { input: 0, output: 0 },
    capabilities: ["Text", "Code", "Reasoning", "Math"],
    description: "Phi 4 reasoning plus model via OpenRouter (Free)",
    icon: "🔀",
    supportsTools: false,
    isMultimodal: true,
    supportsThinking: true,
    thinkingBudgets: undefined,
    parameters: "Plus",
  },

  "qwen/qwen3-30b-a3b:free": {
    id: "qwen/qwen3-30b-a3b:free",
    displayName: "Qwen 3",
    provider: "openrouter",
    maxInputTokens: 128000,
    maxOutputTokens: 16384,
    contextWindow: 128000,
    pricing: { input: 0, output: 0 }, // Free model
    capabilities: ["Text", "Code", "Reasoning"],
    description: "Qwen 3 medium model via OpenRouter (Free)",
    icon: "🔀",
    supportsTools: true,
    isMultimodal: false,
    supportsThinking: true,
    thinkingBudgets: undefined,
    parameters: "30B",
  },
  "anthropic/claude-3.5-sonnet": {
    id: "anthropic/claude-3.5-sonnet",
    displayName: "Claude 3.5 Sonnet",
    provider: "openrouter",
    maxInputTokens: 200000,
    maxOutputTokens: 8192,
    contextWindow: 200000,
    pricing: { input: 3.0, output: 15.0 },
    capabilities: ["Text", "Code", "Vision", "Analysis", "Creative Writing"],
    description: "Claude 3.5 Sonnet via OpenRouter",
    icon: "🔀",
    supportsTools: true,
    isMultimodal: true,
    supportsThinking: false,
    thinkingBudgets: undefined,
  },
  "openai/gpt-4o": {
    id: "openai/gpt-4o",
    displayName: "GPT-4o",
    provider: "openrouter",
    maxInputTokens: 128000,
    maxOutputTokens: 16384,
    contextWindow: 128000,
    pricing: { input: 5.0, output: 15.0 },
    capabilities: ["Text", "Code", "Vision", "Audio", "Function Calling"],
    description: "GPT-4o via OpenRouter",
    icon: "🔀",
    supportsTools: true,
    isMultimodal: true,
    supportsThinking: false,
    thinkingBudgets: undefined,
  },

  "meta-llama/llama-3.1-405b-instruct": {
    id: "meta-llama/llama-3.1-405b-instruct",
    displayName: "Llama 3.1",
    provider: "openrouter",
    maxInputTokens: 131072,
    maxOutputTokens: 4096,
    contextWindow: 131072,
    pricing: { input: 3.5, output: 8.0 },
    capabilities: ["Text", "Code", "Advanced Reasoning", "Math"],
    description: "Meta Llama 3.1 largest model via OpenRouter",
    icon: "🔀",
    supportsTools: true,
    isMultimodal: false,
    supportsThinking: false,
    thinkingBudgets: undefined,
    parameters: "405B",
  },
  "mistralai/mixtral-8x7b-instruct": {
    id: "mistralai/mixtral-8x7b-instruct",
    displayName: "Mixtral 8x7B",
    provider: "openrouter",
    maxInputTokens: 32768,
    maxOutputTokens: 4096,
    contextWindow: 32768,
    pricing: { input: 0.24, output: 0.24 },
    capabilities: ["Text", "Code", "Function Calling", "Multilingual"],
    description: "Mistral Mixtral 8x7B expert model via OpenRouter",
    icon: "🔀",
    supportsTools: true,
    isMultimodal: false,
    supportsThinking: false,
    thinkingBudgets: undefined,
    parameters: "8x7B",
  },
  "cohere/command-r-plus": {
    id: "cohere/command-r-plus",
    displayName: "Command R+",
    provider: "openrouter",
    maxInputTokens: 128000,
    maxOutputTokens: 4096,
    contextWindow: 128000,
    pricing: { input: 3.0, output: 15.0 },
    capabilities: ["Text", "Code", "RAG", "Tool Use", "Multilingual"],
    description: "Cohere Command R+ via OpenRouter",
    icon: "🔀",
    supportsTools: true,
    isMultimodal: false,
    supportsThinking: false,
    thinkingBudgets: undefined,
  },

  // DeepSeek Models
  "deepseek-chat": {
    id: "deepseek-chat",
    displayName: "DeepSeek V3",
    provider: "deepseek",
    maxInputTokens: 64000,
    maxOutputTokens: 8192,
    contextWindow: 64000,
    pricing: { input: 0.27, output: 1.1 },
    capabilities: ["Text", "Code", "Math", "Reasoning"],
    description: "Advanced reasoning model from DeepSeek",
    icon: "🔍",
    supportsTools: true,
    isMultimodal: false,
    supportsThinking: false,
    thinkingBudgets: undefined,
  },
  "deepseek-reasoner": {
    id: "deepseek-reasoner",
    displayName: "DeepSeek R1",
    provider: "deepseek",
    maxInputTokens: 64000,
    maxOutputTokens: 8192,
    contextWindow: 64000,
    pricing: { input: 0.55, output: 2.19 },
    capabilities: ["Code", "Programming", "Debugging", "Code Review"],
    description: "Specialized coding model from DeepSeek",
    icon: "🔍",
    supportsTools: true,
    isMultimodal: false,
    supportsThinking: true,
    thinkingBudgets: undefined,
  },

  // Grok Models
  "grok-3-beta": {
    id: "grok-3-beta",
    displayName: "Grok 3",
    provider: "grok",
    maxInputTokens: 131072,
    maxOutputTokens: 8192,
    contextWindow: 131072,
    pricing: { input: 3.0, output: 15.0 },
    capabilities: [
      "Text",
      "Code",
      "Enterprise Tasks",
      "Programming",
      "Data Extraction",
    ],
    description:
      "Flagship model that excels at enterprise tasks like data extraction, programming, and text summarization",
    icon: "🚀",
    supportsTools: true,
    isMultimodal: false,
    supportsThinking: false,
    thinkingBudgets: undefined,
  },
  "grok-3-mini-beta": {
    id: "grok-3-mini-beta",
    displayName: "Grok 3",
    provider: "grok",
    maxInputTokens: 131072,
    maxOutputTokens: 8192,
    contextWindow: 131072,
    pricing: { input: 0.3, output: 0.5 },
    capabilities: ["Text", "Code", "Math", "Reasoning", "Quantitative Tasks"],
    description:
      "Lightweight model that thinks before responding. Excels at quantitative tasks involving math and reasoning",
    icon: "🚀",
    supportsTools: true,
    isMultimodal: false,
    supportsThinking: true,
    thinkingBudgets: [1024, 2048, 4096],
    parameters: "Mini",
  },
  "grok-2-vision-1212": {
    id: "grok-2-vision-1212",
    displayName: "Grok 2 Vision",
    provider: "grok",
    maxInputTokens: 8192,
    maxOutputTokens: 4096,
    contextWindow: 8192,
    pricing: { input: 2.0, output: 10.0 },
    capabilities: [
      "Text",
      "Code",
      "Vision",
      "Document Analysis",
      "Charts",
      "Screenshots",
    ],
    description:
      "Latest multimodal model that processes documents, diagrams, charts, screenshots, and photographs",
    icon: "🚀",
    supportsTools: true,
    isMultimodal: true,
    supportsThinking: false,
    thinkingBudgets: undefined,
  },
  "grok-2-image-1212": {
    id: "grok-2-image-1212",
    displayName: "Grok 2 Image",
    provider: "grok",
    maxInputTokens: 131072,
    maxOutputTokens: 1,
    contextWindow: 131072,
    pricing: { input: 0.0, output: 0.07 }, // $0.07 per image
    capabilities: ["Image Generation", "Text to Image", "Creative Visuals"],
    description:
      "Latest image generation model capable of generating multiple images from text prompts",
    icon: "🚀",
    supportsTools: false,
    isMultimodal: true,
    supportsThinking: false,
    thinkingBudgets: undefined,
  },
  "grok-beta": {
    id: "grok-beta",
    displayName: "Grok Beta",
    provider: "grok",
    maxInputTokens: 131072,
    maxOutputTokens: 8192,
    contextWindow: 131072,
    pricing: { input: 5.0, output: 15.0 },
    capabilities: ["Text", "Code", "Real-time Info", "Humor"],
    description: "Conversational AI with real-time information access",
    icon: "🚀",
    supportsTools: true,
    isMultimodal: false,
    supportsThinking: false,
    thinkingBudgets: undefined,
  },
  "grok-vision-beta": {
    id: "grok-vision-beta",
    displayName: "Grok Vision Beta",
    provider: "grok",
    maxInputTokens: 131072,
    maxOutputTokens: 8192,
    contextWindow: 131072,
    pricing: { input: 5.0, output: 15.0 },
    capabilities: ["Text", "Code", "Vision", "Real-time Info", "Humor"],
    description: "Grok with vision capabilities",
    icon: "🚀",
    supportsTools: true,
    isMultimodal: true,
    supportsThinking: false,
    thinkingBudgets: undefined,
  },

  // Mistral Models
  "magistral-medium-2506": {
    id: "magistral-medium-2506",
    displayName: "Magistral Medium",
    provider: "mistral",
    maxInputTokens: 40000,
    maxOutputTokens: 8192,
    contextWindow: 40000,
    pricing: { input: 2.0, output: 5.0 },
    capabilities: [
      "Text",
      "Code",
      "Reasoning",
      "Domain-Specific",
      "Multilingual",
    ],
    description:
      "Frontier-class reasoning model excelling in domain-specific, transparent, and multilingual reasoning",
    icon: "🌟",
    supportsTools: true,
    isMultimodal: false,
    supportsThinking: false,
    thinkingBudgets: undefined,
  },
  "magistral-small-2506": {
    id: "magistral-small-2506",
    displayName: "Magistral Small",
    provider: "mistral",
    maxInputTokens: 40000,
    maxOutputTokens: 8192,
    contextWindow: 40000,
    pricing: { input: 0.5, output: 1.5 },
    capabilities: [
      "Text",
      "Code",
      "Reasoning",
      "Domain-Specific",
      "Multilingual",
    ],
    description:
      "Small reasoning model excelling in domain-specific, transparent, and multilingual reasoning",
    icon: "🌟",
    supportsTools: true,
    isMultimodal: false,
    supportsThinking: false,
    thinkingBudgets: undefined,
    parameters: "Small",
  },
  "mistral-medium-2505": {
    id: "mistral-medium-2505",
    displayName: "Mistral Medium 3",
    provider: "mistral",
    maxInputTokens: 128000,
    maxOutputTokens: 8192,
    contextWindow: 128000,
    pricing: { input: 0.4, output: 2.0 },
    capabilities: ["Text", "Code", "Vision", "Multimodal", "Enterprise"],
    description:
      "State-of-the-art performance with simplified enterprise deployments and cost efficiency",
    icon: "🌟",
    supportsTools: true,
    isMultimodal: true,
    supportsThinking: false,
    thinkingBudgets: undefined,
  },
  "mistral-small-2503": {
    id: "mistral-small-2503",
    displayName: "Mistral Small 3.1",
    provider: "mistral",
    maxInputTokens: 128000,
    maxOutputTokens: 8192,
    contextWindow: 128000,
    pricing: { input: 0.1, output: 0.3 },
    capabilities: ["Text", "Code", "Vision", "Multimodal", "Multilingual"],
    description:
      "SOTA small model with image understanding capabilities and multilingual support",
    icon: "🌟",
    supportsTools: true,
    isMultimodal: true,
    supportsThinking: false,
    thinkingBudgets: undefined,
    parameters: "Small",
  },
  "devstral-small-2505": {
    id: "devstral-small-2505",
    displayName: "Devstral Small",
    provider: "mistral",
    maxInputTokens: 128000,
    maxOutputTokens: 8192,
    contextWindow: 128000,
    pricing: { input: 0.1, output: 0.3 },
    capabilities: [
      "Code",
      "Programming",
      "Agents",
      "Codebase Exploration",
      "Multi-file Editing",
    ],
    description:
      "Best open-source model for coding agents, excelling at codebase exploration and multi-file editing",
    icon: "🌟",
    supportsTools: true,
    isMultimodal: false,
    supportsThinking: false,
    thinkingBudgets: undefined,
    parameters: "24B",
  },
  "pixtral-12b-2409": {
    id: "pixtral-12b-2409",
    displayName: "Pixtral 12B",
    provider: "mistral",
    maxInputTokens: 128000,
    maxOutputTokens: 8192,
    contextWindow: 128000,
    pricing: { input: 0.15, output: 0.15 },
    capabilities: [
      "Text",
      "Code",
      "Vision",
      "Multimodal",
      "Image Understanding",
    ],
    description:
      "Vision-capable small model with image understanding capabilities",
    icon: "🌟",
    supportsTools: true,
    isMultimodal: true,
    supportsThinking: false,
    thinkingBudgets: undefined,
    parameters: "12B",
  },
  "ministral-8b-2410": {
    id: "ministral-8b-2410",
    displayName: "Ministral 8B",
    provider: "mistral",
    maxInputTokens: 128000,
    maxOutputTokens: 8192,
    contextWindow: 128000,
    pricing: { input: 0.1, output: 0.1 },
    capabilities: ["Text", "Code", "Edge Computing", "On-Device"],
    description:
      "Powerful edge model with extremely high performance/price ratio for on-device use cases",
    icon: "🌟",
    supportsTools: true,
    isMultimodal: false,
    supportsThinking: false,
    thinkingBudgets: undefined,
    parameters: "8B",
  },
  "ministral-3b-2410": {
    id: "ministral-3b-2410",
    displayName: "Ministral 3B",
    provider: "mistral",
    maxInputTokens: 128000,
    maxOutputTokens: 8192,
    contextWindow: 128000,
    pricing: { input: 0.04, output: 0.04 },
    capabilities: ["Text", "Code", "Edge Computing", "Ultra-Efficient"],
    description:
      "World's best edge model - most efficient model for ultra-low-cost applications",
    icon: "🌟",
    supportsTools: true,
    isMultimodal: false,
    supportsThinking: false,
    thinkingBudgets: undefined,
    parameters: "3B",
  },
  "mistral-saba-2502": {
    id: "mistral-saba-2502",
    displayName: "Mistral Saba",
    provider: "mistral",
    maxInputTokens: 32000,
    maxOutputTokens: 8192,
    contextWindow: 32000,
    pricing: { input: 0.2, output: 0.6 },
    capabilities: [
      "Text",
      "Code",
      "Middle East Languages",
      "South Asian Languages",
    ],
    description:
      "Powerful model specialized for languages from the Middle East and South Asia",
    icon: "🌟",
    supportsTools: true,
    isMultimodal: false,
    supportsThinking: false,
    thinkingBudgets: undefined,
  },
  "accounts/fireworks/models/mistral-small-24b-instruct-2501": {
    id: "accounts/fireworks/models/mistral-small-24b-instruct-2501",
    displayName: "Mistral Small 24B",
    provider: "mistral",
    maxInputTokens: 128000,
    maxOutputTokens: 8192,
    contextWindow: 128000,
    pricing: { input: 0.2, output: 0.6 },
    capabilities: ["Text", "Code", "Fast Processing"],
    description: "Latest small Mistral model for efficient tasks",
    icon: "🌟",
    supportsTools: true,
    isMultimodal: false,
    supportsThinking: false,
    thinkingBudgets: undefined,
  },
  "mistral-large-latest": {
    id: "mistral-large-latest",
    displayName: "Mistral Large",
    provider: "mistral",
    maxInputTokens: 128000,
    maxOutputTokens: 8192,
    contextWindow: 128000,
    pricing: { input: 2.0, output: 6.0 },
    capabilities: ["Text", "Code", "Function Calling", "Reasoning"],
    description: "Flagship model from Mistral AI",
    icon: "🌟",
    supportsTools: true,
    isMultimodal: false,
    supportsThinking: false,
    thinkingBudgets: undefined,
  },
  "mistral-medium-latest": {
    id: "mistral-medium-latest",
    displayName: "Mistral Medium",
    provider: "mistral",
    maxInputTokens: 128000,
    maxOutputTokens: 8192,
    contextWindow: 128000,
    pricing: { input: 1.0, output: 3.0 },
    capabilities: ["Text", "Code", "Function Calling"],
    description: "Balanced model from Mistral AI",
    icon: "🌟",
    supportsTools: true,
    isMultimodal: false,
    supportsThinking: false,
    thinkingBudgets: undefined,
  },
  "mistral-small-latest": {
    id: "mistral-small-latest",
    displayName: "Mistral Small",
    provider: "mistral",
    maxInputTokens: 128000,
    maxOutputTokens: 8192,
    contextWindow: 128000,
    pricing: { input: 0.2, output: 0.6 },
    capabilities: ["Text", "Code", "Fast Processing"],
    description: "Efficient model for everyday tasks",
    icon: "🌟",
    supportsTools: true,
    isMultimodal: false,
    supportsThinking: false,
    thinkingBudgets: undefined,
  },
  "codestral-latest": {
    id: "codestral-latest",
    displayName: "Codestral",
    provider: "mistral",
    maxInputTokens: 128000,
    maxOutputTokens: 8192,
    contextWindow: 128000,
    pricing: { input: 0.3, output: 0.9 },
    capabilities: ["Code", "Programming", "Code Generation", "Debugging"],
    description: "Specialized coding model from Mistral",
    icon: "🌟",
    supportsTools: true,
    isMultimodal: false,
    supportsThinking: false,
    thinkingBudgets: undefined,
  },

  // Cohere Models
  "command-r-plus": {
    id: "command-r-plus",
    displayName: "Command R+",
    provider: "cohere",
    maxInputTokens: 128000,
    maxOutputTokens: 4096,
    contextWindow: 128000,
    pricing: { input: 3.0, output: 15.0 },
    capabilities: ["Text", "Code", "RAG", "Tool Use", "Multilingual"],
    description: "Advanced model optimized for RAG and tool use",
    icon: "🎯",
    supportsTools: true,
    isMultimodal: false,
    supportsThinking: false,
    thinkingBudgets: undefined,
  },
  "command-r": {
    id: "command-r",
    displayName: "Command R",
    provider: "cohere",
    maxInputTokens: 128000,
    maxOutputTokens: 4096,
    contextWindow: 128000,
    pricing: { input: 1.5, output: 7.5 },
    capabilities: ["Text", "Code", "RAG", "Multilingual"],
    description: "Balanced model for retrieval-augmented generation",
    icon: "🎯",
    supportsTools: true,
    isMultimodal: false,
    supportsThinking: false,
    thinkingBudgets: undefined,
  },
  command: {
    id: "command",
    displayName: "Command",
    provider: "cohere",
    maxInputTokens: 4096,
    maxOutputTokens: 4096,
    contextWindow: 4096,
    pricing: { input: 0.5, output: 1.5 },
    capabilities: ["Text", "Code", "Fast Processing"],
    description: "Basic command model from Cohere",
    icon: "🎯",
    supportsTools: false, // Basic Command model doesn't support tools
    isMultimodal: false,
    supportsThinking: false,
    thinkingBudgets: undefined,
  },
  "command-a-03-2025": {
    id: "command-a-03-2025",
    displayName: "Command A",
    provider: "cohere",
    maxInputTokens: 256000,
    maxOutputTokens: 8192,
    contextWindow: 256000,
    pricing: { input: 3.0, output: 15.0 }, // Estimated pricing
    capabilities: ["Text", "Code", "Tool Use", "RAG", "Multilingual", "Agents"],
    description:
      "Most performant model excelling at tool use, agents, RAG, and multilingual use cases",
    icon: "🎯",
    supportsTools: true,
    isMultimodal: false,
    supportsThinking: false,
    thinkingBudgets: undefined,
  },
  "command-r7b-12-2024": {
    id: "command-r7b-12-2024",
    displayName: "Command R7B",
    provider: "cohere",
    maxInputTokens: 128000,
    maxOutputTokens: 4096,
    contextWindow: 128000,
    pricing: { input: 1.0, output: 3.0 }, // Estimated pricing
    capabilities: [
      "Text",
      "Code",
      "RAG",
      "Tool Use",
      "Agents",
      "Complex Reasoning",
    ],
    description:
      "Small, fast model that excels at RAG, tool use, agents, and complex reasoning tasks",
    icon: "🎯",
    supportsTools: true,
    isMultimodal: false,
    supportsThinking: false,
    thinkingBudgets: undefined,
    parameters: "7B",
  },
  "command-r-08-2024": {
    id: "command-r-08-2024",
    displayName: "Command R (Aug 2024)",
    provider: "cohere",
    maxInputTokens: 128000,
    maxOutputTokens: 4096,
    contextWindow: 128000,
    pricing: { input: 1.5, output: 7.5 },
    capabilities: ["Text", "Code", "RAG", "Tool Use", "Agents"],
    description: "Updated version of Command R model delivered in August 2024",
    icon: "🎯",
    supportsTools: true,
    isMultimodal: false,
    supportsThinking: false,
    thinkingBudgets: undefined,
  },
  "c4ai-aya-expanse-32b": {
    id: "c4ai-aya-expanse-32b",
    displayName: "Aya Expanse 32B",
    provider: "cohere",
    maxInputTokens: 128000,
    maxOutputTokens: 4096,
    contextWindow: 128000,
    pricing: { input: 2.0, output: 6.0 }, // Estimated pricing
    capabilities: ["Text", "Code", "Multilingual", "23 Languages"],
    description:
      "Highly performant 32B multilingual model serving 23 languages with monolingual-level performance",
    icon: "🎯",
    supportsTools: true,
    isMultimodal: false,
    supportsThinking: false,
    thinkingBudgets: undefined,
    parameters: "32B",
  },
  "c4ai-aya-expanse-8b": {
    id: "c4ai-aya-expanse-8b",
    displayName: "Aya Expanse 8B",
    provider: "cohere",
    maxInputTokens: 8192,
    maxOutputTokens: 4096,
    contextWindow: 8192,
    pricing: { input: 1.0, output: 3.0 }, // Estimated pricing
    capabilities: ["Text", "Code", "Multilingual", "23 Languages"],
    description:
      "Highly performant 8B multilingual model serving 23 languages with monolingual-level performance",
    icon: "🎯",
    supportsTools: true,
    isMultimodal: false,
    supportsThinking: false,
    thinkingBudgets: undefined,
    parameters: "8B",
  },
  "c4ai-aya-vision-32b": {
    id: "c4ai-aya-vision-32b",
    displayName: "Aya Vision 32B",
    provider: "cohere",
    maxInputTokens: 16384,
    maxOutputTokens: 4096,
    contextWindow: 16384,
    pricing: { input: 2.5, output: 7.5 }, // Estimated pricing
    capabilities: [
      "Text",
      "Code",
      "Vision",
      "Multimodal",
      "Multilingual",
      "23 Languages",
    ],
    description:
      "State-of-the-art 32B multimodal model excelling at language, text, and image capabilities",
    icon: "🎯",
    supportsTools: true,
    isMultimodal: true,
    supportsThinking: false,
    thinkingBudgets: undefined,
    parameters: "32B",
  },
  "c4ai-aya-vision-8b": {
    id: "c4ai-aya-vision-8b",
    displayName: "Aya Vision 8B",
    provider: "cohere",
    maxInputTokens: 16384,
    maxOutputTokens: 4096,
    contextWindow: 16384,
    pricing: { input: 1.5, output: 4.5 }, // Estimated pricing
    capabilities: ["Text", "Code", "Vision", "Multimodal", "Low Latency"],
    description:
      "State-of-the-art 8B multimodal model focused on low latency and best-in-class performance",
    icon: "🎯",
    supportsTools: true,
    isMultimodal: true,
    supportsThinking: false,
    thinkingBudgets: undefined,
    parameters: "8B",
  },
};

/**
 * Generate fallback model info for models not in our detailed database
 */
const generateFallbackModelInfo = (modelId: string): ModelInfo => {
  const provider =
    Object.keys(PROVIDER_CONFIGS).find((p) =>
      PROVIDER_CONFIGS[p].models.includes(modelId)
    ) || "unknown";

  const providerConfig = PROVIDER_CONFIGS[provider];
  const displayName = getModelDisplayName(modelId);

  // Estimate token limits based on model name patterns
  let maxInputTokens = 32000;
  let maxOutputTokens = 4096;
  let contextWindow = 32000;
  const capabilities = ["Text", "Code"];
  let supportsTools = true; // Default to true for unknown models
  let isMultimodal = false; // Default to false for unknown models
  let supportsThinking = false; // Default to false for unknown models
  let thinkingBudgets: string[] | number[] | undefined = undefined;

  // Heuristics based on model names
  if (
    modelId.includes("vision") ||
    modelId.includes("flash") ||
    provider === "google"
  ) {
    capabilities.push("Vision");
    isMultimodal = true;
    if (provider === "google") {
      maxInputTokens = 1000000;
      contextWindow = 1000000;
    }
  }
  if (modelId.includes("70b") || modelId.includes("405b")) {
    maxInputTokens = 131072;
    contextWindow = 131072;
    maxOutputTokens = 8192;
  }
  if (modelId.includes("claude")) {
    maxInputTokens = 200000;
    contextWindow = 200000;
    maxOutputTokens = 8192;
    capabilities.push("Analysis", "Creative Writing");
    isMultimodal =
      modelId.includes("vision") ||
      modelId.includes("3.5") ||
      modelId.includes("opus");
    // Claude 3.7+ and 4+ support thinking
    if (
      modelId.includes("3.7") ||
      modelId.includes("4") ||
      modelId.includes("claude-4") ||
      modelId.includes("claude-3-7")
    ) {
      supportsThinking = true;
      thinkingBudgets = [1024, 2048, 4096, 8192, 12000, 15000];
    }
  }
  if (modelId.includes("grok")) {
    capabilities.push("Real-time Info", "Humor");
    isMultimodal = modelId.includes("vision");
    supportsThinking = true;
    thinkingBudgets = [1024, 2048, 4096];
  }
  if (modelId.includes("coder") || modelId.includes("codestral")) {
    capabilities.push("Programming", "Debugging");
  }
  if (
    modelId.includes("reasoning") ||
    modelId.includes("r1") ||
    modelId.includes("qwq") ||
    modelId.includes("o3") ||
    modelId.includes("o4") ||
    modelId.includes("o1")
  ) {
    capabilities.push("Advanced Reasoning", "Math");
    supportsTools = false; // Reasoning models typically don't support tools
    supportsThinking = true;
    if (
      modelId.includes("o1") ||
      modelId.includes("o3") ||
      modelId.includes("o4")
    ) {
      thinkingBudgets = ["low", "medium", "high"]; // OpenAI uses reasoning effort
    } else {
      thinkingBudgets = [1024, 2048, 4096]; // Other reasoning models use token budgets
    }
  }
  if (provider === "groq") {
    capabilities.push("Ultra-Fast Inference");
  }
  // Gemini 2.5 models support thinking
  if (modelId.includes("gemini-2.5")) {
    supportsThinking = true;
    thinkingBudgets = [1024, 2048, 4096];
  }

  return {
    id: modelId,
    displayName,
    provider,
    maxInputTokens,
    maxOutputTokens,
    contextWindow,
    capabilities,
    description: `${displayName} from ${providerConfig?.name || provider}`,
    icon: providerConfig?.icon || "🤖",
    supportsTools,
    isMultimodal,
    supportsThinking,
    thinkingBudgets,
  };
};

/**
 * Get model information by ID (with fallback for unknown models)
 */
export const getModelInfo = (modelId: string): ModelInfo => {
  return MODEL_INFO[modelId] || generateFallbackModelInfo(modelId);
};

/**
 * Get display name for a model
 */
export const getModelDisplayName = (modelId: string): string => {
  const modelInfo = MODEL_INFO[modelId];
  if (modelInfo) return modelInfo.displayName;

  // Fallback to heuristic transformation
  let name = modelId.substring(modelId.lastIndexOf("/") + 1);
  const colonIndex = name.indexOf(":");
  if (colonIndex !== -1) name = name.substring(0, colonIndex);

  name = name.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();

  const acronyms = new Set([
    "gpt",
    "llama",
    "qwen",
    "gemini",
    "grok",
    "mpt",
    "mixtral",
    "command",
    "cl",
    "ai",
  ]);
  name = name
    .split(" ")
    .map((word) => {
      const lower = word.toLowerCase();
      if (acronyms.has(lower)) return lower.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");

  return name;
};

/**
 * Format token count for display
 */
export const formatTokenCount = (tokens: number): string => {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  } else if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(0)}K`;
  }
  return tokens.toString();
};

/**
 * Format pricing for display
 */
export const formatPricing = (price: number): string => {
  if (price < 1) {
    return price.toFixed(2);
  }
  return price.toFixed(0);
};

// Helper function to determine if a model needs reasoning middleware
export function needsReasoningMiddleware(
  provider: string,
  model: string
): boolean {
  // Check if the model actually supports thinking/reasoning
  const modelInfo = getModelInfo(model);

  // Only apply reasoning middleware to models that support thinking
  if (!modelInfo.supportsThinking) {
    return false;
  }

  // Skip for known non-text generation models or legacy models that have issues
  const skipMiddleware = [
    // Skip for embedding models or other non-chat models
    "text-embedding",
    "embedding",
    "whisper", // Audio models
    "dall-e", // Image generation
    "tts", // Text-to-speech
  ];

  const shouldSkip = skipMiddleware.some((skip) =>
    model.toLowerCase().includes(skip.toLowerCase())
  );

  // Apply reasoning middleware only to thinking-capable chat/text generation models
  return !shouldSkip;
}

// Helper function to create enhanced model with reasoning middleware if needed
export function createEnhancedModel(
  aiModel: any,
  provider: string,
  model: string,
  wrapLanguageModel: any,
  extractReasoningMiddleware: any
) {
  if (needsReasoningMiddleware(provider, model)) {
    try {
      // Define reasoning tags based on provider and model type
      let tagNames = ["think", "reasoning", "thinking"];

      // Provider-specific reasoning patterns
      if (provider === "openai") {
        // OpenAI models like o1 use specific thinking patterns
        tagNames = ["thinking", "think", "reasoning", "analysis"];
      } else if (provider === "anthropic") {
        // Claude models often use thinking patterns
        tagNames = ["thinking", "analysis", "reasoning", "think"];
      } else if (provider === "google") {
        // Gemini models with thinking capabilities
        tagNames = ["thinking", "reasoning", "analysis", "think"];
      } else if (provider === "groq") {
        // Groq reasoning models like QwQ, DeepSeek R1
        tagNames = ["think", "reasoning", "thinking", "analysis"];
      } else if (provider === "deepseek") {
        // DeepSeek R1 and reasoning models
        tagNames = ["think", "reasoning", "thinking"];
      } else if (provider === "openrouter") {
        // OpenRouter hosts various reasoning models
        tagNames = ["think", "reasoning", "thinking", "analysis"];
      }

      // Try each tag name until one works
      for (const tagName of tagNames) {
        try {
          const enhancedModel = wrapLanguageModel({
            model: aiModel,
            middleware: extractReasoningMiddleware({
              tagName,
              // Use startWithReasoning for specific providers/models that benefit from it
              startWithReasoning:
                provider === "openrouter" ||
                provider === "groq" ||
                model.includes("qwq") ||
                model.includes("r1") ||
                model.includes("reasoning") ||
                model.includes("o1") ||
                model.includes("o3") ||
                model.includes("o4"),
            }),
          });

          return enhancedModel;
        } catch (tagError) {
          // Continue to next tag if this one fails
          console.warn(
            `Failed to use reasoning tag "${tagName}" for ${provider}/${model}:`,
            tagError
          );
          continue;
        }
      }

      // If all tag names fail, log warning and return base model
      console.warn(
        `All reasoning middleware tag names failed for ${provider}/${model}, using base model`
      );
      return aiModel;
    } catch (error) {
      console.warn(
        `Reasoning middleware not available for ${provider}/${model}, using base model:`,
        error
      );
      return aiModel;
    }
  }
  return aiModel;
}

// Image Generation Models
export interface ImageModelInfo {
  id: string;
  displayName: string;
  description: string;
  pricing: number; // Cost per image in dollars
  speed: "fast" | "medium" | "slow";
  quality: "standard" | "high" | "premium";
  provider: "cloudflare";
  cloudflareModel?: string; // The actual Cloudflare model ID
}

export const IMAGE_MODELS: Record<string, ImageModelInfo> = {
  "flux-1-schnell": {
    id: "flux-1-schnell",
    displayName: "Flux 1 Schnell",
    description: "Lightning fast, high-quality image generation",
    pricing: 0.03,
    speed: "fast",
    quality: "high",
    provider: "cloudflare",
    cloudflareModel: "@cf/black-forest-labs/flux-1-schnell",
  },
  "flux-1-dev": {
    id: "flux-1-dev",
    displayName: "Flux 1 Dev",
    description: "Advanced image generation with better quality",
    pricing: 0.05,
    speed: "medium",
    quality: "premium",
    provider: "cloudflare",
    cloudflareModel: "@cf/black-forest-labs/flux-1-dev",
  },
  "stable-diffusion-xl": {
    id: "stable-diffusion-xl",
    displayName: "Stable Diffusion XL",
    description: "High-resolution, detailed image generation",
    pricing: 0.04,
    speed: "medium",
    quality: "high",
    provider: "cloudflare",
    cloudflareModel: "@cf/stabilityai/stable-diffusion-xl-base-1.0",
  },
  "dreamshaper-8": {
    id: "dreamshaper-8",
    displayName: "DreamShaper 8",
    description: "Artistic and creative image generation",
    pricing: 0.03,
    speed: "fast",
    quality: "standard",
    provider: "cloudflare",
    cloudflareModel: "@cf/lykon/dreamshaper-8-lcm",
  },
};

export type ImageModelId = keyof typeof IMAGE_MODELS;

export const getImageModelInfo = (
  modelId: string
): ImageModelInfo | undefined => {
  return IMAGE_MODELS[modelId];
};

export const getImageModelDisplayName = (modelId: string): string => {
  return IMAGE_MODELS[modelId]?.displayName || modelId;
};
