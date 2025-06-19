import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Eye, EyeOff, Key, Trash2, Zap, Infinity as InfinityIcon, Settings, User, UserCog, FileText, Brain, Edit, Camera, Lock, Wrench, Sun, Moon, Monitor, Palette, Upload, Download, ArrowLeft, ChevronRight, Plus } from "lucide-react";
import { IMAGE_MODELS, ImageModelId, getImageModelDisplayName, getModelInfo, getModelDisplayName, formatTokenCount, formatPricing, PROVIDER_CONFIGS as MODEL_PROVIDER_CONFIGS } from "@/lib/models";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ParticlesBackground } from "./ParticlesBackground";
import { SignOutButton } from "../SignOutButton";
import { cn } from "@/lib/utils";

interface UserPreferences {
  aiProvider: "openai" | "anthropic" | "google" | "openrouter" | "groq" | "deepseek" | "grok" | "cohere" | "mistral";
  model: string;
  temperature: number;
  enabledTools?: string[];
  favoriteModels?: Array<{
    provider: string;
    model: string;
  }>;
  hideUserInfo?: boolean;
  showToolOutputs?: boolean;
  showMessageMetadata?: boolean;
  showThinking?: boolean;
  systemPrompt?: string;
  useCustomSystemPrompt?: boolean;
  imageModel?: ImageModelId;
  theme?: "light" | "dark" | "system";
  colorTheme?: string;
}

interface SettingsPageProps {
  onBack: () => void;
}

const PROVIDER_CONFIGS = {
  openai: {
    name: "OpenAI",
    models: [
      "gpt-4o-mini-2024-07-18",
      "chatgpt-4o-latest", 
      "o3-mini",
      "o4-mini",
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4.1-nano",
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4-turbo",
      "gpt-3.5-turbo"
    ],
    keyPlaceholder: "sk-...",
    description: "GPT models from OpenAI",
    hasBuiltIn: true,
  },
  google: {
    name: "Google AI",
    models: [
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite", 
      "gemini-2.5-pro-preview-05-06",
      "gemini-2.5-flash-preview-05-20",
      "gemini-1.5-pro",
      "gemini-1.5-flash"
    ],
    keyPlaceholder: "AIza...",
    description: "Gemini models from Google",
    hasBuiltIn: true,
  },
  anthropic: {
    name: "Anthropic",
    models: [
      "claude-sonnet-4-20250514",
      "claude-opus-4-20250514",
      "claude-3-7-sonnet-latest",
      "claude-3-5-sonnet-latest",
      "claude-3-5-haiku-latest",
      "claude-3-5-sonnet-20241022",
      "claude-3-haiku-20240307",
      "claude-3-sonnet-20240229",
      "claude-3-opus-20240229"
    ],
    keyPlaceholder: "sk-ant-...",
    description: "Claude models from Anthropic",
    hasBuiltIn: true,
  },
  openrouter: {
    name: "OpenRouter",
    models: [
      "deepseek/deepseek-chat-v3-0324:free",
      "deepseek/deepseek-r1:free",
      "tngtech/deepseek-r1t-chimera:free",
      "deepseek/deepseek-prover-v2:free",
      "mistralai/devstral-small:free",
      "qwen/qwen2.5-vl-72b-instruct:free",
      "mistralai/mistral-small-3.1-24b-instruct:free",
      "google/gemma-3-27b-it:free",
      "rekaai/reka-flash-3:free",
      "google/gemini-2.5-pro-exp-03-25:free",
      "qwen/qwen3-235b-a22b:free",
      "qwen/qwen3-30b-a3b:free",
      "qwen/qwen3-32b:free",
      "nvidia/llama-3.1-nemotron-ultra-253b-v1:free",
      "anthropic/claude-3.5-sonnet",
      "openai/gpt-4o",
      "google/gemini-pro-1.5",
      "meta-llama/llama-3.1-405b-instruct",
      "mistralai/mixtral-8x7b-instruct",
      "cohere/command-r-plus",
    ],
    keyPlaceholder: "sk-or-...",
    description: "Access to multiple AI models",
    hasBuiltIn: true,
  },
  groq: {
    name: "Groq",
    models: [
      "deepseek-r1-distill-llama-70b",
      "deepseek-r1-distill-qwen-32b",
      "llama-3.3-70b-versatile",
      "llama-3.2-90b-vision-preview",
      "llama3-70b-8192",
      "qwen-qwq-32b",
      "meta-llama/llama-4-scout-17b-16e-instruct",
      "meta-llama/llama-4-maverick-17b-128e-instruct",
      "compound-beta",
      "compound-beta-mini",
      "llama-3.1-405b-reasoning",
      "llama-3.1-70b-versatile",
      "llama-3.1-8b-instant",
      "mixtral-8x7b-32768",
      "gemma2-9b-it",
    ],
    keyPlaceholder: "gsk_...",
    description: "Ultra-fast inference",
    hasBuiltIn: true,
  },
  deepseek: {
    name: "DeepSeek",
    models: ["deepseek-chat", "deepseek-coder"],
    keyPlaceholder: "sk-...",
    description: "Reasoning and coding models",
    hasBuiltIn: true,
  },
  grok: {
    name: "Grok (xAI)",
    models: ["grok-beta", "grok-vision-beta"],
    keyPlaceholder: "xai-...",
    description: "Elon's AI with real-time data",
    hasBuiltIn: true,
  },
  cohere: {
    name: "Cohere",
    models: ["command-r-plus", "command-r", "command"],
    keyPlaceholder: "co_...",
    description: "Enterprise-grade language models",
    hasBuiltIn: true,
  },
  mistral: {
    name: "Mistral AI",
    models: [
      "accounts/fireworks/models/mistral-small-24b-instruct-2501",
      "mistral-large-latest",
      "mistral-medium-latest",
      "mistral-small-latest", 
      "codestral-latest",
    ],
    keyPlaceholder: "...",
    description: "European AI models",
    hasBuiltIn: true,
  },
  tavily: {
    name: "Tavily Search",
    models: [],
    keyPlaceholder: "tvly-...",
    description: "Real-time web search API",
    hasBuiltIn: true,
  },
  openweather: {
    name: "OpenWeatherMap",
    models: [],
    keyPlaceholder: "...",
    description: "Weather data API",
    hasBuiltIn: true,
  },
  firecrawl: {
    name: "Firecrawl",
    models: [],
    keyPlaceholder: "fc-...",
    description: "AI-ready web scraping and crawling",
    hasBuiltIn: true,
  },
};

const COLOR_THEMES = [
  { name: "Default", value: "default", colors: ["bg-slate-600", "bg-slate-500"] },
  { name: "Blue", value: "theme-blue", colors: ["bg-blue-600", "bg-blue-500"] },
  { name: "Green", value: "theme-green", colors: ["bg-green-600", "bg-green-500"] },
  { name: "Purple", value: "theme-purple", colors: ["bg-purple-600", "bg-purple-500"] },
  { name: "Orange", value: "theme-orange", colors: ["bg-orange-600", "bg-orange-500"] },
  { name: "Pink", value: "theme-pink", colors: ["bg-pink-600", "bg-pink-500"] },
  { name: "Teal", value: "theme-teal", colors: ["bg-teal-600", "bg-teal-500"] },
  { name: "Red", value: "theme-red", colors: ["bg-red-600", "bg-red-500"] },
  { name: "Indigo", value: "theme-indigo", colors: ["bg-indigo-600", "bg-indigo-500"] },
];

export function SettingsPage({ onBack }: SettingsPageProps) {
  const { setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState("ai");
  const [settings, setSettings] = useState<UserPreferences>({
    aiProvider: "google",
    model: "gemini-2.5-flash-preview-05-20",
    temperature: 0.7,
    enabledTools: ["web_search", "calculator", "datetime"],
    favoriteModels: [],
    hideUserInfo: false,
    showToolOutputs: false,
    showMessageMetadata: false,
    showThinking: false,
    systemPrompt: "You are ErzenAI, an intelligent AI assistant created to help users with a wide variety of tasks. You are knowledgeable, helpful, and friendly. You can assist with questions, provide explanations, help with analysis, creative tasks, coding, and much more. Always strive to be accurate, clear, and helpful in your responses.",
    useCustomSystemPrompt: true,
    theme: "system",
    colorTheme: "default",
  });
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [userInstructions, setUserInstructions] = useState("");
  const [editingMemory, setEditingMemory] = useState<string | null>(null);
  const [editMemoryText, setEditMemoryText] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentColorTheme, setCurrentColorTheme] = useState("default");
  
  // Dialog states for Account section
  const [showDeleteConversationsDialog, setShowDeleteConversationsDialog] = useState(false);
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showDeleteMemoriesDialog, setShowDeleteMemoriesDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // MCP Server states
  const [mcpServers, setMcpServers] = useState<any[]>([]);
  const [showAddMcpDialog, setShowAddMcpDialog] = useState(false);
  const [editingMcpServer, setEditingMcpServer] = useState<string | null>(null);
  const [mcpForm, setMcpForm] = useState({
    name: "",
    description: "",
    transportType: "sse" as "sse" | "http",
    command: "",
    args: "",
    url: "",
    headers: "",
  });

  // Mutations and queries
  const updatePreferences = useMutation(api.preferences.update);
  const upsertApiKey = useMutation(api.apiKeys.upsert);
  const removeApiKey = useMutation(api.apiKeys.remove);

  // const userApiKeys = useQuery(api.apiKeys.list) || [];
  const apiKeyInfo = useQuery(api.apiKeys.getApiKeyInfo) || [];
  const usage = useQuery(api.usage.get);
  const limits = useQuery(api.usage.getLimits);
  const instructions = useQuery(api.userInstructions.get);
  const updateInstructions = useMutation(api.userInstructions.update);
  const memories = useQuery(api.userMemories.list) || [];
  const updateMemory = useMutation(api.userMemories.update);
  const removeMemory = useMutation(api.userMemories.remove);
  const removeAllMemories = useMutation(api.userMemories.removeAll);
  const updateProfile = useMutation(api.userAccount.updateProfile);
  const deleteAllConversations = useMutation(api.userAccount.deleteAllConversations);
  const cleanupDuplicatedContent = useMutation(api.messages.cleanupDuplicatedContent);
  const user = useQuery(api.auth.loggedInUser);
  const preferences = useQuery(api.preferences.get);
  const changePassword = useMutation(api.userAccount.changePassword);
  const importConversation = useMutation(api.conversations.importConversation);
  const exportAllConversations = useQuery(api.conversations.exportAllConversations);
  
  // MCP Server mutations and queries
  const mcpServersListQuery = useQuery(api.mcpServers.list);
  const mcpServersList = useMemo(() => mcpServersListQuery || [], [mcpServersListQuery]);
  const addMcpServer = useMutation(api.mcpServers.add);
  const updateMcpServer = useMutation(api.mcpServers.update);
  const removeMcpServer = useMutation(api.mcpServers.remove);
  const toggleMcpServer = useMutation(api.mcpServers.toggle);

  // Load preferences on mount
  useEffect(() => {
    if (preferences) {
      setSettings({
        aiProvider: preferences.aiProvider,
        model: preferences.model,
        temperature: preferences.temperature,
        enabledTools: preferences.enabledTools,
        favoriteModels: preferences.favoriteModels,
        hideUserInfo: preferences.hideUserInfo ?? false,
        showToolOutputs: preferences.showToolOutputs ?? false,
        showMessageMetadata: preferences.showMessageMetadata ?? false,
        showThinking: preferences.showThinking ?? false,
        systemPrompt: preferences.systemPrompt ?? "You are ErzenAI, an intelligent AI assistant created to help users with a wide variety of tasks. You are knowledgeable, helpful, and friendly. You can assist with questions, provide explanations, help with analysis, creative tasks, coding, and much more. Always strive to be accurate, clear, and helpful in your responses.",
        useCustomSystemPrompt: preferences.useCustomSystemPrompt ?? true,
        imageModel: preferences.imageModel ?? "fast-image-ai",
        theme: preferences.theme ?? "system",
        colorTheme: preferences.colorTheme ?? "default",
      });
    }
  }, [preferences]);

  useEffect(() => {
    if (instructions) {
      setUserInstructions(instructions);
    }
  }, [instructions]);

  useEffect(() => {
    if (user) {
      setProfileName(user.name || "");
      setProfilePicture(user.image || "");
    }
  }, [user]);

  // Load current color theme from document classes
  useEffect(() => {
    const currentColorTheme = COLOR_THEMES.find(t =>
      document.documentElement.classList.contains(t.value)
    )?.value ?? "default";
    setCurrentColorTheme(currentColorTheme);
  }, []);
  
  // Load MCP servers
  useEffect(() => {
    if (mcpServersList) {
      setMcpServers(mcpServersList);
    }
  }, [mcpServersList]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/40 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <ParticlesBackground />
      </div>
      
      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/8 via-transparent to-accent/8 opacity-60"></div>
      
      {/* Content */}
      <div className="relative z-10 min-h-screen">
        {/* Header */}
        <header className="border-b border-border/40 backdrop-blur-sm bg-background/80 sticky top-0 z-20">
          <div className="container mx-auto px-2 sm:px-4 lg:px-6 h-12 sm:h-16 lg:h-20 flex items-center justify-between">
            <div className="flex items-center gap-1 sm:gap-2 lg:gap-4 min-w-0 flex-1">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onBack}
                className="rounded-lg h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 hover:bg-primary/10 flex-shrink-0"
              >
                <ArrowLeft size={16} className="sm:w-[18px] sm:h-[18px] lg:w-[22px] lg:h-[22px]" />
              </Button>
              <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-3 min-w-0">
                <div className="p-1 sm:p-1.5 lg:p-2 bg-primary/10 rounded-md sm:rounded-lg lg:rounded-xl flex-shrink-0">
                  <Settings className="h-3 w-3 sm:h-4 sm:w-4 lg:h-6 lg:w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg lg:text-2xl font-bold text-foreground truncate">Settings</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground hidden lg:block">Customize your ErzenAI experience</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 flex-shrink-0">
              <SignOutButton />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="container mx-auto px-2 sm:px-3 lg:px-6 py-2 sm:py-4 lg:py-8">
          <div className="flex flex-col xl:flex-row gap-3 sm:gap-4 lg:gap-8 max-w-7xl mx-auto">
            {/* Navigation Sidebar */}
            <div className="xl:w-80 flex-shrink-0">
              {/* Mobile Navigation - Horizontal Scroll */}
              <div className="xl:hidden mb-3 sm:mb-4 lg:mb-6">
                <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-1 sm:pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {[
                    { id: "ai", icon: Brain, label: "AI", desc: "Models" },
                    { id: "appearance", icon: Palette, label: "Theme", desc: "Colors" },
                    { id: "apikeys", icon: Key, label: "Keys", desc: "API" },
                    { id: "usage", icon: Zap, label: "Usage", desc: "Billing" },
                    { id: "account", icon: UserCog, label: "Account", desc: "Profile" },
                    { id: "data", icon: Brain, label: "Memory", desc: "Data" },
                    { id: "mcp", icon: Wrench, label: "MCP", desc: "Tools" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={cn(
                        "flex-shrink-0 flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all",
                        activeSection === item.id
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      <item.icon size={14} />
                      <span className="whitespace-nowrap text-xs">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Desktop Navigation - Sidebar */}
              <div className="hidden xl:block sticky top-24">
                <Card className="border-2 border-primary/20 shadow-xl bg-gradient-to-br from-card/90 via-card to-muted/10 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Navigation</CardTitle>
                    <CardDescription>Configure your experience</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {/* Core Section */}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">Core</p>
                      <button
                        onClick={() => setActiveSection("ai")}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-primary/5",
                          activeSection === "ai" 
                            ? "bg-primary/10 text-primary border border-primary/20 shadow-sm" 
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Brain size={18} />
                        <div className="flex-1 text-left">
                          <div className="font-medium">AI & Behavior</div>
                          <div className="text-xs opacity-70">Models & prompts</div>
                        </div>
                        <ChevronRight size={16} className={cn("transition-transform", activeSection === "ai" && "rotate-90")} />
                      </button>
                      
                      <button
                        onClick={() => setActiveSection("appearance")}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-primary/5",
                          activeSection === "appearance" 
                            ? "bg-primary/10 text-primary border border-primary/20 shadow-sm" 
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Palette size={18} />
                        <div className="flex-1 text-left">
                          <div className="font-medium">Appearance</div>
                          <div className="text-xs opacity-70">Themes & display</div>
                        </div>
                        <ChevronRight size={16} className={cn("transition-transform", activeSection === "appearance" && "rotate-90")} />
                      </button>
                    </div>

                    {/* Integration Section */}
                    <div className="space-y-1 pt-4">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">Integration</p>
                      <button
                        onClick={() => setActiveSection("apikeys")}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-primary/5",
                          activeSection === "apikeys" 
                            ? "bg-primary/10 text-primary border border-primary/20 shadow-sm" 
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Key size={18} />
                        <div className="flex-1 text-left">
                          <div className="font-medium">API Keys</div>
                          <div className="text-xs opacity-70">External services</div>
                        </div>
                        <ChevronRight size={16} className={cn("transition-transform", activeSection === "apikeys" && "rotate-90")} />
                      </button>
                      
                      <button
                        onClick={() => setActiveSection("usage")}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-primary/5",
                          activeSection === "usage" 
                            ? "bg-primary/10 text-primary border border-primary/20 shadow-sm" 
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Zap size={18} />
                        <div className="flex-1 text-left">
                          <div className="font-medium">Usage & Billing</div>
                          <div className="text-xs opacity-70">Limits & plans</div>
                        </div>
                        <ChevronRight size={16} className={cn("transition-transform", activeSection === "usage" && "rotate-90")} />
                      </button>
                    </div>

                    {/* Personal Section */}
                    <div className="space-y-1 pt-4">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">Personal</p>
                      <button
                        onClick={() => setActiveSection("account")}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-primary/5",
                          activeSection === "account" 
                            ? "bg-primary/10 text-primary border border-primary/20 shadow-sm" 
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <UserCog size={18} />
                        <div className="flex-1 text-left">
                          <div className="font-medium">Account</div>
                          <div className="text-xs opacity-70">Profile & security</div>
                        </div>
                        <ChevronRight size={16} className={cn("transition-transform", activeSection === "account" && "rotate-90")} />
                      </button>
                      
                      <button
                        onClick={() => setActiveSection("data")}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-primary/5",
                          activeSection === "data" 
                            ? "bg-primary/10 text-primary border border-primary/20 shadow-sm" 
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Brain size={18} />
                        <div className="flex-1 text-left">
                          <div className="font-medium">Data & Memory</div>
                          <div className="text-xs opacity-70">Instructions & AI memory</div>
                        </div>
                        <ChevronRight size={16} className={cn("transition-transform", activeSection === "data" && "rotate-90")} />
                      </button>
                    </div>

                    {/* Advanced Section */}
                    <div className="space-y-1 pt-4">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">Advanced</p>
                      <button
                        onClick={() => setActiveSection("mcp")}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-primary/5",
                          activeSection === "mcp" 
                            ? "bg-primary/10 text-primary border border-primary/20 shadow-sm" 
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Wrench size={18} />
                        <div className="flex-1 text-left">
                          <div className="font-medium">MCP Servers</div>
                          <div className="text-xs opacity-70">Protocol tools & integrations</div>
                        </div>
                        <ChevronRight size={16} className={cn("transition-transform", activeSection === "mcp" && "rotate-90")} />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-w-0">
              <div className="space-y-3 sm:space-y-4 lg:space-y-8">
                {/* AI & Behavior Section */}
                {activeSection === "ai" && (
                  <>
                    {/* Current Configuration Status */}
                    <div className="bg-gradient-to-r from-primary/5 via-primary/8 to-accent/5 border border-primary/20 rounded-lg p-3 sm:p-4 lg:p-6 shadow-lg">
                      <div className="flex flex-col gap-2 sm:gap-3">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse shadow-sm"></div>
                          <span className="font-semibold text-sm sm:text-base">Current Setup</span>
                        </div>
                        <div className="flex flex-col gap-1 sm:gap-2 text-xs sm:text-sm">
                          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                            <span className="text-muted-foreground shrink-0">AI:</span>
                            <Badge variant="outline" className="font-medium text-xs">
                              {MODEL_PROVIDER_CONFIGS[settings.aiProvider]?.icon} {MODEL_PROVIDER_CONFIGS[settings.aiProvider]?.name}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                            <span className="text-muted-foreground shrink-0">Model:</span>
                            <Badge variant="outline" className="font-medium text-xs">
                              {getModelDisplayName(settings.model)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                            <span className="text-muted-foreground shrink-0">Images:</span>
                            <Badge variant="outline" className="font-medium text-xs">
                              {getImageModelDisplayName(settings.imageModel || "flux-1-schnell")}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AI Model Selection */}
                    <Card className="border-2 border-primary/20 shadow-xl">
                      <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/5 rounded-t-lg border-b p-3 sm:p-4 lg:p-6">
                        <CardTitle className="flex items-center gap-1 sm:gap-2 text-base sm:text-lg lg:text-xl">
                          <div className="p-1 sm:p-1.5 lg:p-2 bg-primary/10 rounded-md sm:rounded-lg">
                            <Brain className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-primary" />
                          </div>
                          <span className="min-w-0">Text Generation Model</span>
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm lg:text-base">
                          Choose your preferred AI provider and model for conversations
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 sm:space-y-4 lg:space-y-8 p-3 sm:p-4 lg:p-8">
                        {/* Provider Selection */}
                        <div className="space-y-2 sm:space-y-3">
                          <Label className="text-sm sm:text-base lg:text-lg font-semibold">AI Provider</Label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3">
                            {Object.entries(MODEL_PROVIDER_CONFIGS)
                              .map(([key, config]) => {
                                const isSelected = settings.aiProvider === key;
                                return (
                                  <div
                                    key={key}
                                    className={`relative p-2 sm:p-3 lg:p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                                      isSelected 
                                        ? "border-primary bg-primary/5 shadow-sm" 
                                        : "border-border hover:border-primary/50"
                                    }`}
                                    onClick={() => setSettings(prev => ({
                                      ...prev,
                                      aiProvider: key as UserPreferences["aiProvider"],
                                      model: config.models[0] ?? "",
                                    }))}
                                  >
                                    <div className="flex items-center gap-1 sm:gap-2">
                                      <div className={`w-2 h-2 sm:w-3 sm:h-3 lg:w-4 lg:h-4 rounded-full border-2 ${
                                        isSelected 
                                          ? "border-primary bg-primary" 
                                          : "border-muted-foreground"
                                      }`} />
                                      <div className="flex-1 min-w-0">
                                        <div className="font-semibold flex items-center gap-1">
                                          <span className="text-sm sm:text-base lg:text-lg">{config.icon}</span>
                                          <span className="truncate text-sm sm:text-base">{config.name}</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {config.models.length} models
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>

                                                {/* Model Selection */}
                         {MODEL_PROVIDER_CONFIGS[settings.aiProvider]?.models?.length > 0 && (
                                                       <div className="space-y-2 sm:space-y-3">
                              <Label className="text-sm sm:text-base lg:text-lg font-semibold">Model Selection</Label>
                              <div className="grid grid-cols-1 gap-1 sm:gap-2 lg:gap-3 max-h-64 sm:max-h-80 lg:max-h-96 overflow-y-auto">
                               {MODEL_PROVIDER_CONFIGS[settings.aiProvider].models.map((modelId: string) => {
                                const modelInfo = getModelInfo(modelId);
                                const isSelected = settings.model === modelId;
                                
                                return (
                                  <div
                                    key={modelId}
                                    className={`relative p-2 sm:p-3 lg:p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                                      isSelected 
                                        ? "border-primary bg-primary/5 shadow-sm" 
                                        : "border-border hover:border-primary/50"
                                    }`}
                                    onClick={() => setSettings(prev => ({ ...prev, model: modelId }))}
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
                                      <div className="flex items-start gap-1 sm:gap-2 lg:gap-3 flex-1 min-w-0">
                                        <div className={`w-2 h-2 sm:w-3 sm:h-3 lg:w-4 lg:h-4 rounded-full border-2 mt-0.5 sm:mt-1 flex-shrink-0 ${
                                          isSelected 
                                            ? "border-primary bg-primary" 
                                            : "border-muted-foreground"
                                        }`} />
                                        <div className="flex-1 min-w-0">
                                          <div className="font-semibold flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-1 lg:gap-2 mb-1">
                                            <span className="truncate text-xs sm:text-sm lg:text-base">{modelInfo.displayName}</span>
                                            {modelInfo.parameters && (
                                              <Badge variant="secondary" className="text-xs w-fit">
                                                {modelInfo.parameters}
                                              </Badge>
                                            )}
                                          </div>
                                          <div className="text-xs text-muted-foreground mb-1 sm:mb-2 line-clamp-2">
                                            {modelInfo.description}
                                          </div>
                                          <div className="flex flex-wrap gap-0.5 sm:gap-1">
                                            {modelInfo.capabilities.slice(0, 2).map(cap => (
                                              <Badge key={cap} variant="outline" className="text-xs">
                                                {cap}
                                              </Badge>
                                            ))}
                                            {modelInfo.capabilities.length > 2 && (
                                              <Badge variant="outline" className="text-xs">
                                                +{modelInfo.capabilities.length - 2}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-left sm:text-right sm:ml-2 lg:ml-4 flex-shrink-0">
                                        {modelInfo.pricing && (
                                          <div className="text-xs">
                                            <div className="text-muted-foreground">In: ${formatPricing(modelInfo.pricing.input)}/1M</div>
                                            <div className="text-muted-foreground">Out: ${formatPricing(modelInfo.pricing.output)}/1M</div>
                                          </div>
                                        )}
                                        <div className="text-xs text-muted-foreground mt-0.5 sm:mt-1">
                                          {formatTokenCount(modelInfo.contextWindow)} ctx
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Temperature Control */}
                        <div className="space-y-2 sm:space-y-3">
                          <div className="flex justify-between items-center">
                            <Label className="text-sm sm:text-base lg:text-lg font-semibold">Temperature</Label>
                            <Badge variant="secondary" className="text-xs sm:text-sm px-1.5 sm:px-2 lg:px-4 py-0.5 sm:py-1 lg:py-2 font-mono">
                              {settings.temperature}
                            </Badge>
                          </div>
                          <div className="space-y-2 sm:space-y-3">
                            <Slider
                              value={[settings.temperature]}
                              onValueChange={([value]) => setSettings(prev => ({ ...prev, temperature: value }))}
                              max={2}
                              min={0}
                              step={0.1}
                              className="w-full"
                            />
                            <div className="grid grid-cols-3 gap-1 sm:gap-2 lg:gap-4 text-xs">
                              <div className="text-center">
                                <div className="text-muted-foreground font-mono text-xs">0.0</div>
                                <div className="font-medium text-xs">Focused</div>
                                <div className="text-xs text-muted-foreground hidden lg:block">Deterministic, precise</div>
                              </div>
                              <div className="text-center">
                                <div className="text-muted-foreground font-mono text-xs">1.0</div>
                                <div className="font-medium text-xs">Balanced</div>
                                <div className="text-xs text-muted-foreground hidden lg:block">Good mix of creativity</div>
                              </div>
                              <div className="text-center">
                                <div className="text-muted-foreground font-mono text-xs">2.0</div>
                                <div className="font-medium text-xs">Creative</div>
                                <div className="text-xs text-muted-foreground hidden lg:block">Highly creative, diverse</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Image Generation Model */}
                    <Card className="border-2 border-primary/20 shadow-xl">
                      <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/5 rounded-t-xl border-b p-4 sm:p-6">
                        <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
                          <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                            <Camera className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                          </div>
                          <span className="min-w-0">Image Generation Model</span>
                        </CardTitle>
                        <CardDescription className="text-sm sm:text-base">
                          Choose your preferred model for AI image generation
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                          {Object.values(IMAGE_MODELS).map((model) => {
                            const isSelected = settings.imageModel === model.id;
                            const priceColor = model.pricing <= 0.03 ? "text-green-600" : 
                                             model.pricing <= 0.05 ? "text-amber-600" : "text-red-600";
                            const speedIcon = model.speed === "fast" ? "⚡" : model.speed === "medium" ? "⚖️" : "🐌";
                            const qualityIcon = model.quality === "premium" ? "💎" : model.quality === "high" ? "⭐" : "✨";
                            
                            return (
                              <div 
                                key={model.id}
                                className={`relative p-4 sm:p-6 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md ${
                                  isSelected 
                                    ? "border-primary bg-primary/5 shadow-sm" 
                                    : "border-border hover:border-primary/50"
                                }`}
                                onClick={() => setSettings(prev => ({ ...prev, imageModel: model.id }))}
                              >
                                <div className="flex items-start gap-3 sm:gap-4">
                                  <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 mt-1 flex-shrink-0 ${
                                    isSelected 
                                      ? "border-primary bg-primary" 
                                      : "border-muted-foreground"
                                  }`} />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-base sm:text-lg mb-2">{model.displayName}</div>
                                    <div className="text-xs sm:text-sm text-muted-foreground mb-3 line-clamp-2">{model.description}</div>
                                    
                                    <div className="flex items-center gap-3 sm:gap-4 mb-3">
                                      <div className="flex items-center gap-1">
                                        <span>{speedIcon}</span>
                                        <span className="text-xs sm:text-sm capitalize">{model.speed}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span>{qualityIcon}</span>
                                        <span className="text-xs sm:text-sm capitalize">{model.quality}</span>
                                      </div>
                                    </div>
                                    
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                      <Badge variant="outline" className="text-xs w-fit">
                                        {model.provider === "cloudflare" ? "☁️ Cloudflare AI" : model.provider}
                                      </Badge>
                                      <div className="text-left sm:text-right">
                                        <div className={`text-base sm:text-lg font-bold ${priceColor}`}>
                                          ${model.pricing.toFixed(2)}
                                        </div>
                                        <div className="text-xs text-muted-foreground">per image</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                          <div className="flex items-start gap-3">
                            <div className="text-2xl">💡</div>
                            <div>
                              <div className="font-semibold text-blue-800 dark:text-blue-200 mb-1">
                                Powered by Cloudflare AI
                              </div>
                              <div className="text-sm text-blue-700 dark:text-blue-300">
                                All image models run on Cloudflare's global AI infrastructure for fast, reliable generation. 
                                Choose <strong>Flux 1 Schnell</strong> for speed, <strong>Flux 1 Dev</strong> for premium quality, 
                                or experiment with <strong>Stable Diffusion XL</strong> for detailed artwork.
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* System Prompt Card */}
                    <Card className="border-2 border-primary/20 shadow-xl">
                      <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/5 rounded-t-xl border-b">
                        <CardTitle className="flex items-center gap-3 text-xl">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <FileText className="h-6 w-6 text-primary" />
                          </div>
                          System Prompt & Personality
                        </CardTitle>
                        <CardDescription className="text-base">
                          Define the AI's personality and behavior. This prompt is combined with your user instructions to create a unique assistant experience.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6 p-8">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="space-y-1">
                            <Label htmlFor="useCustomSystemPrompt" className="text-base font-medium">Enable Custom System Prompt</Label>
                            <p className="text-sm text-muted-foreground">
                              Use a custom system prompt to define the AI's personality and behavior
                            </p>
                          </div>
                          <Switch
                            id="useCustomSystemPrompt"
                            checked={settings.useCustomSystemPrompt}
                            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, useCustomSystemPrompt: checked }))}
                            className="self-start sm:self-auto"
                          />
                        </div>
                        
                        {settings.useCustomSystemPrompt && (
                          <div className="space-y-3">
                            <Label htmlFor="systemPrompt" className="text-base font-semibold">System Prompt</Label>
                            <Textarea
                              id="systemPrompt"
                              value={settings.systemPrompt || ""}
                              onChange={(e) => setSettings(prev => ({ ...prev, systemPrompt: e.target.value }))}
                              placeholder="Enter your custom system prompt..."
                              className="min-h-[150px] resize-none text-base"
                              maxLength={2000}
                            />
                            <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-sm text-muted-foreground">
                              <span className="hidden sm:inline">Define how the AI should behave and respond</span>
                              <span>{settings.systemPrompt?.length || 0}/2000</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Save Button */}
                    <div className="flex justify-stretch sm:justify-end">
                      <Button 
                        onClick={() => {
                          void updatePreferences({
                            aiProvider: settings.aiProvider,
                            model: settings.model,
                            temperature: settings.temperature,
                            enabledTools: settings.enabledTools,
                            favoriteModels: settings.favoriteModels,
                            hideUserInfo: settings.hideUserInfo,
                            showToolOutputs: settings.showToolOutputs,
                            showMessageMetadata: settings.showMessageMetadata,
                            showThinking: settings.showThinking,
                            systemPrompt: settings.systemPrompt,
                            useCustomSystemPrompt: settings.useCustomSystemPrompt,
                            imageModel: settings.imageModel,
                          });
                        }}
                        size="sm"
                        className="w-full sm:w-auto px-4 sm:px-6 lg:px-8 h-8 sm:h-10 lg:h-11 text-xs sm:text-sm"
                      >
                        Save AI Settings
                      </Button>
                    </div>
                  </>
                )}

                {/* Appearance Section */}
                {activeSection === "appearance" && (
                  <>
                    <Card className="border-2 border-primary/20 shadow-xl">
                      <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/5 rounded-t-xl border-b">
                        <CardTitle className="flex items-center gap-3 text-xl">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <User className="h-6 w-6 text-primary" />
                          </div>
                          Privacy & Display
                        </CardTitle>
                        <CardDescription className="text-base">
                          Control how your personal information is displayed and what details are shown in the interface
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-8 p-8">
                        <div className="space-y-6">
                          <h4 className="font-semibold text-lg text-primary flex items-center gap-2">
                            <Lock className="h-5 w-5" />
                            Privacy Controls
                          </h4>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-muted/30 rounded-xl border border-border/50">
                            <div className="space-y-1">
                              <Label htmlFor="hideUserInfo" className="font-medium text-base">Hide User Information</Label>
                              <p className="text-sm text-muted-foreground">
                                Blur your name and email in the sidebar for privacy
                              </p>
                            </div>
                            <Switch
                              id="hideUserInfo"
                              checked={settings.hideUserInfo}
                              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, hideUserInfo: checked }))}
                              className="self-start sm:self-auto"
                            />
                          </div>
                        </div>

                        <div className="space-y-6">
                          <h4 className="font-semibold text-lg text-primary flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Interface Options
                          </h4>
                          <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-muted/30 rounded-xl border border-border/50">
                              <div className="space-y-1">
                                <Label htmlFor="showToolOutputs" className="font-medium text-base">Show Tool Output Cards</Label>
                                <p className="text-sm text-muted-foreground">
                                  Display separate cards showing detailed tool results (disabled by default)
                                </p>
                              </div>
                              <Switch
                                id="showToolOutputs"
                                checked={settings.showToolOutputs}
                                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showToolOutputs: checked }))}
                                className="self-start sm:self-auto"
                              />
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-muted/30 rounded-xl border border-border/50">
                              <div className="space-y-1">
                                <Label htmlFor="showMessageMetadata" className="font-medium text-base">Show Message Metadata on Hover</Label>
                                <p className="text-sm text-muted-foreground">
                                  Display AI model info, tokens, and generation time when hovering over assistant messages (disabled by default)
                                </p>
                              </div>
                              <Switch
                                id="showMessageMetadata"
                                checked={settings.showMessageMetadata}
                                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showMessageMetadata: checked }))}
                                className="self-start sm:self-auto"
                              />
                            </div>
                            
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-muted/30 rounded-xl border border-border/50">
                              <div className="space-y-1">
                                <Label htmlFor="showThinking" className="font-medium text-base">Show Model Thinking Process</Label>
                                <p className="text-sm text-muted-foreground">
                                  Display the internal reasoning from thinking models like QwQ in a collapsible section (disabled by default)
                                </p>
                              </div>
                              <Switch
                                id="showThinking"
                                checked={settings.showThinking}
                                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showThinking: checked }))}
                                className="self-start sm:self-auto"
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Theme Selection Card */}
                    <Card className="border-2 border-primary/20 shadow-xl">
                      <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/5 rounded-t-xl border-b">
                        <CardTitle className="flex items-center gap-3 text-xl">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Palette className="h-6 w-6 text-primary" />
                          </div>
                          Theme & Colors
                        </CardTitle>
                        <CardDescription className="text-base">
                          Customize the appearance with light/dark mode and color themes
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-8 p-8">
                        <div className="space-y-6">
                          <h4 className="font-semibold text-lg text-primary flex items-center gap-2">
                            <Sun className="h-5 w-5" />
                            Appearance Mode
                          </h4>
                          <div className="flex rounded-xl bg-muted p-2">
                            <button
                              onClick={() => {
                                setTheme("light");
                                setSettings(prev => ({ ...prev, theme: "light" }));
                              }}
                              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                                settings.theme === "light"
                                  ? "bg-background text-foreground shadow-sm"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <Sun size={18} />
                              <span>Light</span>
                            </button>
                            <button
                              onClick={() => {
                                setTheme("dark");
                                setSettings(prev => ({ ...prev, theme: "dark" }));
                              }}
                              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                                settings.theme === "dark"
                                  ? "bg-background text-foreground shadow-sm"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <Moon size={18} />
                              <span>Dark</span>
                            </button>
                            <button
                              onClick={() => {
                                setTheme("system");
                                setSettings(prev => ({ ...prev, theme: "system" }));
                              }}
                              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                                settings.theme === "system"
                                  ? "bg-background text-foreground shadow-sm"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <Monitor size={18} />
                              <span>Auto</span>
                            </button>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <h4 className="font-semibold text-lg text-primary flex items-center gap-2">
                            <Palette className="h-5 w-5" />
                            Color Theme
                          </h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {COLOR_THEMES.map((colorTheme) => (
                              <button
                                key={colorTheme.value}
                                onClick={() => {
                                  // Remove all color theme classes
                                  COLOR_THEMES.forEach(t => {
                                    if (t.value !== "default") {
                                      document.documentElement.classList.remove(t.value);
                                    }
                                  });

                                  // Add the new color theme class
                                  if (colorTheme.value !== "default") {
                                    document.documentElement.classList.add(colorTheme.value);
                                  }

                                  setCurrentColorTheme(colorTheme.value);
                                  setSettings(prev => ({ ...prev, colorTheme: colorTheme.value }));
                                  localStorage.setItem("color-theme", colorTheme.value);
                                }}
                                className={`relative h-16 rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${
                                  currentColorTheme === colorTheme.value
                                    ? "border-primary ring-2 ring-primary/20"
                                    : "border-border hover:border-muted-foreground"
                                }`}
                                title={colorTheme.name}
                              >
                                <div className="flex h-full">
                                  <div className={`flex-1 ${colorTheme.colors[0]}`} />
                                  <div className={`flex-1 ${colorTheme.colors[1]}`} />
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-sm font-medium text-primary-foreground drop-shadow-lg">
                                    {colorTheme.name}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Save Button */}
                    <div className="flex justify-stretch sm:justify-end">
                      <Button 
                        onClick={() => {
                          void updatePreferences({
                            aiProvider: settings.aiProvider,
                            model: settings.model,
                            temperature: settings.temperature,
                            enabledTools: settings.enabledTools,
                            favoriteModels: settings.favoriteModels,
                            hideUserInfo: settings.hideUserInfo,
                            showToolOutputs: settings.showToolOutputs,
                            showMessageMetadata: settings.showMessageMetadata,
                            showThinking: settings.showThinking,
                            systemPrompt: settings.systemPrompt,
                            useCustomSystemPrompt: settings.useCustomSystemPrompt,
                            imageModel: settings.imageModel,
                            theme: settings.theme,
                            colorTheme: settings.colorTheme,
                          });
                        }}
                        size="lg"
                        className="w-full sm:w-auto px-6 sm:px-8"
                      >
                        Save Appearance Settings
                      </Button>
                    </div>
                  </>
                )}

                {/* API Keys Section */}
                {activeSection === "apikeys" && (
                  <>
                    <Card className="border-2 border-primary/20 shadow-xl">
                      <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/5 rounded-t-xl border-b">
                        <CardTitle className="flex items-center gap-3 text-xl">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Key className="h-6 w-6 text-primary" />
                          </div>
                          API Keys
                        </CardTitle>
                        <CardDescription className="text-base">
                          Add your own API keys for unlimited usage without counting against limits
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-8">
                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 mb-8">
                          <div className="flex items-start gap-4">
                            <Zap className="text-primary mt-1" size={24} />
                            <div>
                              <h3 className="font-semibold text-lg mb-2">Built-in API Keys vs Your Own</h3>
                              <div className="text-base text-muted-foreground space-y-2">
                                <p><strong>Built-in Keys:</strong> Free usage with monthly limits (messages & searches count)</p>
                                <p><strong>Your Keys:</strong> <InfinityIcon className="inline w-5 h-5" /> Unlimited usage - no limits or counting!</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl p-6 mb-8">
                          <div className="flex items-start gap-4">
                            <Lock className="text-green-600 dark:text-green-400 mt-1" size={24} />
                            <div>
                              <h3 className="font-semibold text-lg mb-2 text-green-800 dark:text-green-200">🔒 Encryption & Security</h3>
                              <div className="text-base text-green-700 dark:text-green-300 space-y-2">
                                <p><strong>All API keys are encrypted</strong> before being stored in the database</p>
                                <p>Your keys are protected with industry-standard encryption and can only be decrypted by you</p>
                                <p>We never store or log your actual API keys in plain text</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6">
                          {Object.entries(PROVIDER_CONFIGS).map(([provider, config]) => {
                            const keyInfo = apiKeyInfo.find(info => info.provider === provider);
                            const hasUserKey = keyInfo?.hasUserKey || false;
                            
                            return (
                              <Card key={provider} className={hasUserKey ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20" : ""}>
                                <CardContent className="p-6">
                                  <div className="flex items-center justify-between mb-4">
                                    <div>
                                      <h3 className="font-semibold text-lg flex items-center gap-3">
                                        {config.name}
                                        {hasUserKey && (
                                          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                            <span className="text-sm font-medium">Your Key</span>
                                          </div>
                                        )}
                                      </h3>
                                      <p className="text-base text-muted-foreground">{config.description}</p>
                                      {hasUserKey && keyInfo?.keyPreview && (
                                        <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                                          Key: {keyInfo.keyPreview} • Added {keyInfo.addedAt ? new Date(keyInfo.addedAt).toLocaleDateString() : 'Recently'}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                      {hasUserKey && (
                                        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                          <InfinityIcon size={14} className="mr-1" />
                                          Unlimited
                                        </Badge>
                                      )}
                                      {config.hasBuiltIn && (
                                        <Badge variant="secondary" className={hasUserKey ? "opacity-60" : ""}>
                                          <Zap size={14} className="mr-1" />
                                          Built-in
                                        </Badge>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="flex-1 relative">
                                      <Input
                                        type={showKeys[provider] ? "text" : "password"}
                                        value={apiKeys[provider] || ""}
                                        onChange={(e) => setApiKeys(prev => ({ ...prev, [provider]: e.target.value }))}
                                        placeholder={hasUserKey ? "Enter new key to replace existing..." : config.keyPlaceholder}
                                        className="pr-12 h-12 text-base"
                                      />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }))}
                                        className="absolute right-1 top-1 h-10 w-10"
                                      >
                                        {showKeys[provider] ? <EyeOff size={18} /> : <Eye size={18} />}
                                      </Button>
                                    </div>
                                    <div className="flex gap-3">
                                                                             <Button
                                         onClick={() => {
                                           const key = apiKeys[provider];
                                           if (key?.trim()) {
                                             void upsertApiKey({ provider: provider as any, apiKey: key.trim() });
                                             setApiKeys(prev => ({ ...prev, [provider]: "" }));
                                           }
                                         }}
                                        disabled={!apiKeys[provider]?.trim()}
                                        className="flex items-center gap-2 flex-1 sm:flex-none h-12"
                                      >
                                        <Key size={18} />
                                        <span>{hasUserKey ? "Update" : "Save"}</span>
                                      </Button>
                                                                             {hasUserKey && (
                                         <Button
                                           variant="destructive"
                                           onClick={() => void removeApiKey({ provider: provider as any })}
                                           className="flex items-center gap-2 h-12"
                                           size="icon"
                                         >
                                           <Trash2 size={18} />
                                         </Button>
                                       )}
                                    </div>
                                  </div>

                                  {!hasUserKey && config.hasBuiltIn && (
                                    <p className="text-sm text-muted-foreground mt-3">
                                      Using built-in key with usage limits. Add your own key for unlimited access.
                                    </p>
                                  )}
                                  {hasUserKey && (
                                    <p className="text-sm text-green-600 dark:text-green-400 mt-3 flex items-center gap-2">
                                      <InfinityIcon size={14} />
                                      Using your encrypted API key - unlimited usage without limits or counting!
                                    </p>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}

                {/* Usage & Billing Section */}
                {activeSection === "usage" && (
                  <>
                    <Card className="border-2 border-primary/20 shadow-xl">
                      <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/5 rounded-t-xl border-b">
                        <CardTitle className="flex items-center gap-3 text-xl">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Zap className="h-6 w-6 text-primary" />
                          </div>
                          Current Plan
                        </CardTitle>
                        <CardDescription className="text-base">
                          Your usage statistics and plan information
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-8">
                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-8">
                          <h3 className="text-2xl font-bold mb-3">Current Plan</h3>
                          <div className="flex items-center gap-4">
                            <Badge className="capitalize text-lg px-4 py-2">
                              {usage?.plan ?? "Free"}
                            </Badge>
                            <span className="text-base text-muted-foreground">
                              Resets on {usage?.resetDate ? new Date(usage.resetDate).toLocaleDateString() : "N/A"}
                            </span>
                          </div>
                          <p className="text-base text-muted-foreground mt-4">
                            💡 Add your own API keys for unlimited usage without counting against these limits!
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Usage Stats */}
                    {usage && limits && (
                      <Card className="border-2 border-primary/20 shadow-xl">
                        <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/5 rounded-t-xl border-b">
                          <CardTitle className="flex items-center gap-3 text-xl">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <Zap className="h-6 w-6 text-primary" />
                            </div>
                            Usage Statistics
                          </CardTitle>
                          <CardDescription className="text-base">Built-in keys only - your own keys have unlimited usage</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            {/* Credits Usage */}
                            <div className="space-y-4 p-6 bg-muted/20 rounded-xl border">
                              <h4 className="font-semibold text-lg">Credits</h4>
                              <div className="space-y-3">
                                <div className="flex justify-between text-base">
                                  <span>Used</span>
                                  <span className="font-semibold">{usage.creditsUsed} / {usage.creditsLimit}</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-3">
                                  <div
                                    className={`h-3 rounded-full transition-all ${
                                      Math.min((usage.creditsUsed / usage.creditsLimit) * 100, 100) >= 90 ? "bg-red-500" :
                                      Math.min((usage.creditsUsed / usage.creditsLimit) * 100, 100) >= 70 ? "bg-yellow-500" :
                                      "bg-green-500"
                                    }`}
                                    style={{ width: `${Math.min((usage.creditsUsed / usage.creditsLimit) * 100, 100)}%` }}
                                  />
                                </div>
                                <p className="text-sm text-muted-foreground">Your own API keys = unlimited usage</p>
                                <p className="text-sm text-muted-foreground">Spending: ${usage.dollarsSpent.toFixed(2)} / ${usage.maxSpendingDollars.toFixed(2)}</p>
                              </div>
                            </div>

                            {/* Searches Usage */}
                            <div className="space-y-4 p-6 bg-muted/20 rounded-xl border">
                              <h4 className="font-semibold text-lg">Web Searches</h4>
                              <div className="space-y-3">
                                <div className="flex justify-between text-base">
                                  <span>Used</span>
                                  <span className="font-semibold">{usage.searchesUsed} / {limits.searches}</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-3">
                                  <div
                                    className={`h-3 rounded-full transition-all ${
                                      Math.min((usage.searchesUsed / limits.searches) * 100, 100) >= 90 ? "bg-red-500" :
                                      Math.min((usage.searchesUsed / limits.searches) * 100, 100) >= 70 ? "bg-yellow-500" :
                                      "bg-green-500"
                                    }`}
                                    style={{ width: `${Math.min((usage.searchesUsed / limits.searches) * 100, 100)}%` }}
                                  />
                                </div>
                                <p className="text-sm text-muted-foreground">Your own API keys = unlimited searches</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Plan Information */}
                    <Card className="border-2 border-primary/20 shadow-xl">
                      <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/5 rounded-t-xl border-b">
                        <CardTitle className="flex items-center gap-3 text-xl">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Zap className="h-6 w-6 text-primary" />
                          </div>
                          Plans & Pricing
                        </CardTitle>
                        <CardDescription className="text-base">Credit-based pricing for built-in API keys</CardDescription>
                      </CardHeader>
                      <CardContent className="p-8">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                          {/* Free Plan */}
                          <div className={`p-6 rounded-xl border-2 ${usage?.plan === "free" ? "border-primary bg-primary/5" : "border-muted"}`}>
                            <div className="space-y-3">
                              <h4 className={`font-bold text-lg ${usage?.plan === "free" ? "text-primary" : ""}`}>
                                Free {usage?.plan === "free" && "• Current"}
                              </h4>
                              <p className="text-3xl font-bold">100 <span className="text-base font-normal">credits</span></p>
                              <p className="text-base text-muted-foreground">Max spending: $1.00</p>
                              <p className="text-base text-muted-foreground">10 web searches</p>
                            </div>
                          </div>

                          {/* Pro Plan */}
                          <div className={`p-6 rounded-xl border-2 ${usage?.plan === "pro" ? "border-primary bg-primary/5" : "border-muted"}`}>
                            <div className="space-y-3">
                              <h4 className={`font-bold text-lg ${usage?.plan === "pro" ? "text-primary" : ""}`}>
                                Pro {usage?.plan === "pro" && "• Current"}
                              </h4>
                              <p className="text-3xl font-bold">500 <span className="text-base font-normal">credits</span></p>
                              <p className="text-base text-muted-foreground">Max spending: $8.00</p>
                              <p className="text-base text-muted-foreground">200 web searches</p>
                            </div>
                          </div>

                          {/* Ultra Plan */}
                          <div className={`p-6 rounded-xl border-2 ${usage?.plan === "ultra" ? "border-primary bg-primary/5" : "border-muted"}`}>
                            <div className="space-y-3">
                              <h4 className={`font-bold text-lg ${usage?.plan === "ultra" ? "text-primary" : ""}`}>
                                Ultra {usage?.plan === "ultra" && "• Current"}
                              </h4>
                              <p className="text-3xl font-bold">2500 <span className="text-base font-normal">credits</span></p>
                              <p className="text-base text-muted-foreground">Max spending: $20.00</p>
                              <p className="text-base text-muted-foreground">1000 web searches</p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-6 p-4 bg-muted/30 rounded-xl">
                          <p className="text-sm text-muted-foreground">
                            <strong>Credits are deducted based on actual token usage.</strong> Different models have different costs per token. 
                            Use your own API keys for unlimited usage without credit deduction.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}

                {/* Account Section */}
                {activeSection === "account" && (
                  <>
                    <Card className="border-2 border-primary/20 shadow-xl">
                      <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/5 rounded-t-xl border-b">
                        <CardTitle className="flex items-center gap-3 text-xl">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <UserCog className="h-6 w-6 text-primary" />
                          </div>
                          Profile Settings
                        </CardTitle>
                        <CardDescription className="text-base">
                          Manage your profile information
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-8 p-8">
                        <div className="space-y-4">
                          <Label htmlFor="profileName" className="text-base font-semibold">Display Name</Label>
                          <Input
                            id="profileName"
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            placeholder="Enter your display name"
                            className="h-12 text-base"
                          />
                        </div>

                        <div className="space-y-4">
                          <Label htmlFor="profilePicture" className="text-base font-semibold">Profile Picture URL</Label>
                          <div className="flex gap-3">
                            <Input
                              id="profilePicture"
                              value={profilePicture}
                              onChange={(e) => setProfilePicture(e.target.value)}
                              placeholder="Enter profile picture URL"
                              className="flex-1 h-12 text-base"
                            />
                            <Button
                              onClick={() => {
                                void updateProfile({
                                  name: profileName || undefined,
                                  profilePicture: profilePicture || undefined
                                });
                              }}
                              disabled={isLoading}
                              className="flex items-center gap-2 h-12"
                            >
                              <Camera size={18} />
                              {isLoading ? "Saving..." : "Save"}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-primary/20 shadow-xl">
                      <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/5 rounded-t-xl border-b">
                        <CardTitle className="flex items-center gap-3 text-xl">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Lock className="h-6 w-6 text-primary" />
                          </div>
                          Account Actions
                        </CardTitle>
                        <CardDescription className="text-base">
                          Manage your account data and security
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6 p-8">
                        <div className="flex items-center justify-between p-6 border-2 rounded-xl">
                          <div>
                            <h4 className="font-semibold text-lg">Change Password</h4>
                            <p className="text-base text-muted-foreground">Update your account password</p>
                          </div>
                          <Button
                            variant="outline"
                            className="flex items-center gap-2 h-12"
                            onClick={() => setShowChangePasswordDialog(true)}
                          >
                            <Lock size={18} />
                            Change Password
                          </Button>
                        </div>

                        <div className="flex items-center justify-between p-6 border-2 rounded-xl">
                          <div>
                            <h4 className="font-semibold text-lg">Delete All Conversations</h4>
                            <p className="text-base text-muted-foreground">Permanently delete all your conversations</p>
                          </div>
                          <Button
                            variant="destructive"
                            className="flex items-center gap-2 h-12"
                            onClick={() => setShowDeleteConversationsDialog(true)}
                          >
                            <Trash2 size={18} />
                            Delete All
                          </Button>
                        </div>

                        <div className="flex items-center justify-between p-6 border-2 rounded-xl">
                          <div>
                            <h4 className="font-semibold text-lg">Fix Duplicated Content</h4>
                            <p className="text-base text-muted-foreground">Clean up any messages with duplicated or corrupted content</p>
                          </div>
                          <Button
                            variant="outline"
                            className="flex items-center gap-2 h-12"
                            onClick={() => {
                              setIsLoading(true);
                              void cleanupDuplicatedContent({}).finally(() => setIsLoading(false));
                            }}
                            disabled={isLoading}
                          >
                            <Wrench size={18} />
                            {isLoading ? "Cleaning..." : "Fix Content"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}

                {/* Data & Memory Section */}
                {activeSection === "data" && (
                  <>
                    <Card className="border-2 border-primary/20 shadow-xl">
                      <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/5 rounded-t-xl border-b">
                        <CardTitle className="flex items-center gap-3 text-xl">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <FileText className="h-6 w-6 text-primary" />
                          </div>
                          Custom Instructions
                        </CardTitle>
                        <CardDescription className="text-base">
                          Add custom instructions that will be sent to the AI with every conversation (max 500 words). These work alongside your system prompt.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6 p-8">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <Label htmlFor="instructions" className="text-base font-semibold">Instructions</Label>
                            <span className="text-base text-muted-foreground">
                              {userInstructions.trim().split(/\s+/).filter(word => word.length > 0).length}/500 words
                            </span>
                          </div>
                          <Textarea
                            id="instructions"
                            value={userInstructions}
                            onChange={(e) => setUserInstructions(e.target.value)}
                            placeholder="Enter your custom instructions for the AI..."
                            className="min-h-[200px] text-base"
                          />
                          {userInstructions.trim().split(/\s+/).filter(word => word.length > 0).length > 500 && (
                            <p className="text-base text-red-500">
                              Instructions exceed 500 words. Please reduce the length.
                            </p>
                          )}
                        </div>

                        <Button
                          onClick={() => void updateInstructions({ instructions: userInstructions })}
                          disabled={userInstructions.trim().split(/\s+/).filter(word => word.length > 0).length > 500}
                          size="lg"
                          className="w-full"
                        >
                          Save Instructions
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Memory Section */}
                    <Card className="border-2 border-primary/20 shadow-xl">
                      <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/5 rounded-t-xl border-b">
                        <CardTitle className="flex items-center gap-3 text-xl">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Brain className="h-6 w-6 text-primary" />
                          </div>
                          AI Memory Bank
                        </CardTitle>
                        <CardDescription className="text-base">
                          View and manage things the AI has remembered about you from your conversations
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-8">
                        <div className="flex justify-between items-center mb-6">
                          <span className="text-base text-muted-foreground">
                            {memories.length} memories stored
                          </span>
                          {memories.length > 0 && (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="flex items-center gap-2"
                              onClick={() => setShowDeleteMemoriesDialog(true)}
                            >
                              <Trash2 size={16} />
                              Delete All
                            </Button>
                          )}
                        </div>

                        <div className="space-y-4 max-h-[500px] overflow-y-auto">
                          {memories.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                              <Brain size={64} className="mx-auto mb-4 opacity-50" />
                              <p className="text-xl font-medium mb-2">No memories stored yet</p>
                              <p className="text-base">The AI will remember important information as you chat</p>
                            </div>
                          ) : (
                            memories.map((memory) => (
                              <div key={memory._id} className="border-2 rounded-xl p-4">
                                {editingMemory === memory._id ? (
                                  <div className="space-y-3">
                                    <Textarea
                                      value={editMemoryText}
                                      onChange={(e) => setEditMemoryText(e.target.value)}
                                      className="min-h-[80px] text-base"
                                    />
                                    <div className="flex gap-2">
                                      <Button 
                                        size="sm" 
                                        onClick={() => {
                                          void updateMemory({ id: editingMemory as any, memory: editMemoryText });
                                          setEditingMemory(null);
                                          setEditMemoryText("");
                                        }}
                                      >
                                        Save
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setEditingMemory(null)}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex justify-between items-start gap-3">
                                    <div className="flex-1">
                                      <p className="text-base">{memory.memory}</p>
                                      <p className="text-sm text-muted-foreground mt-2">
                                        {new Date(memory.createdAt).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingMemory(memory._id);
                                          setEditMemoryText(memory.memory);
                                        }}
                                      >
                                        <Edit size={16} />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => void removeMemory({ id: memory._id as any })}
                                      >
                                        <Trash2 size={16} />
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Import/Export Section */}
                    <Card className="border-2 border-primary/20 shadow-xl">
                      <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/5 rounded-t-xl border-b">
                        <CardTitle className="flex items-center gap-3 text-xl">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Upload className="h-6 w-6 text-primary" />
                          </div>
                          Import & Export Conversations
                        </CardTitle>
                        <CardDescription className="text-base">
                          Import a previously exported conversation JSON file or export all your conversations for backup
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6 p-8">
                        <div className="space-y-3">
                          <Label htmlFor="import-file" className="text-base font-semibold">Select File</Label>
                          <Input
                            id="import-file"
                            type="file"
                            accept=".json"
                            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                            disabled={isImporting}
                            className="h-12 text-base"
                          />
                        </div>
                        
                        {importFile && (
                          <div className="p-4 bg-muted rounded-xl">
                            <p className="text-base font-medium">Selected file:</p>
                            <p className="text-sm text-muted-foreground">{importFile.name}</p>
                            <p className="text-sm text-muted-foreground">{(importFile.size / 1024).toFixed(1)} KB</p>
                          </div>
                        )}

                        {exportAllConversations && (
                          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                            <div className="flex items-start gap-3">
                              <div className="text-2xl">📦</div>
                              <div>
                                <div className="font-semibold text-blue-800 dark:text-blue-200 mb-1">
                                  Export Ready
                                </div>
                                <div className="text-sm text-blue-700 dark:text-blue-300">
                                  Found <strong>{exportAllConversations.totalConversations}</strong> conversations ready to export. 
                                  The export will include all messages, branches, and conversation metadata.
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button
                            onClick={() => {
                              if (importFile) {
                                setIsImporting(true);
                                importFile.text().then(text => {
                                  const importData = JSON.parse(text);
                                  return importConversation({ exportData: importData });
                                }).then((result) => {
                                  setImportFile(null);
                                  // Show success feedback
                                  if (typeof result === 'object' && result !== null && 'importedConversations' in result) {
                                    alert(`Successfully imported ${result.importedConversations} conversations!`);
                                  } else {
                                    alert("Successfully imported conversation!");
                                  }
                                }).catch(error => {
                                  console.error("Failed to import conversation:", error);
                                  alert(`Failed to import: ${error.message || 'Unknown error'}`);
                                }).finally(() => {
                                  setIsImporting(false);
                                });
                              }
                            }}
                            disabled={!importFile || isImporting}
                            size="lg"
                            className="flex-1"
                          >
                            {isImporting ? (
                              <>
                                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2" />
                                Importing...
                              </>
                            ) : (
                              <>
                                <Upload size={18} className="mr-2" />
                                Import Conversation
                              </>
                            )}
                          </Button>

                          <Button
                            onClick={() => {
                              if (exportAllConversations) {
                                setIsExporting(true);
                                try {
                                  const blob = new Blob([JSON.stringify(exportAllConversations, null, 2)], {
                                    type: 'application/json',
                                  });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `all-conversations-export-${new Date().toISOString().split('T')[0]}.json`;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                  URL.revokeObjectURL(url);
                                } catch (error) {
                                  console.error("Failed to export conversations:", error);
                                } finally {
                                  setIsExporting(false);
                                }
                              }
                            }}
                            disabled={!exportAllConversations || isExporting}
                            size="lg"
                            variant="outline"
                            className="flex-1"
                          >
                            {isExporting ? (
                              <>
                                <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full mr-2" />
                                Exporting...
                              </>
                            ) : (
                              <>
                                <Download size={18} className="mr-2" />
                                Export All Conversations
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}

                {/* MCP Servers Section */}
                {activeSection === "mcp" && (
                  <>
                    <Card className="border-2 border-primary/20 shadow-xl">
                      <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/5 rounded-t-xl border-b">
                        <CardTitle className="flex items-center gap-3 text-xl">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Wrench className="h-6 w-6 text-primary" />
                          </div>
                          MCP Servers
                        </CardTitle>
                        <CardDescription className="text-base">
                          Model Context Protocol servers provide additional tools and capabilities to your AI assistant
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-8">
                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 mb-8">
                          <div className="flex items-start gap-4">
                            <Wrench className="text-primary mt-1" size={24} />
                            <div>
                              <h3 className="font-semibold text-lg mb-2">What are MCP Servers?</h3>
                              <div className="text-base text-muted-foreground space-y-2">
                                <p>MCP (Model Context Protocol) servers extend your AI with specialized tools and capabilities.</p>
                                <p>Examples: File system access, database queries, API integrations, development tools, and more.</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center mb-6">
                          <div>
                            <h3 className="font-semibold text-lg">Your MCP Servers</h3>
                            <p className="text-sm text-muted-foreground">
                              {mcpServers.length} servers configured
                            </p>
                          </div>
                          <Button
                            onClick={() => {
                              setMcpForm({
                                name: "",
                                description: "",
                                transportType: "sse",
                                command: "",
                                args: "",
                                url: "",
                                headers: "",
                              });
                              setEditingMcpServer(null);
                              setShowAddMcpDialog(true);
                            }}
                            className="flex items-center gap-2"
                          >
                            <Plus size={18} />
                            Add MCP Server
                          </Button>
                        </div>

                        <div className="space-y-4">
                          {mcpServers.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                              <Wrench size={64} className="mx-auto mb-4 opacity-50" />
                              <p className="text-xl font-medium mb-2">No MCP servers configured</p>
                              <p className="text-base mb-4">Add your first MCP server to extend AI capabilities</p>
                              <Button
                                onClick={() => {
                                  setMcpForm({
                                    name: "",
                                    description: "",
                                    transportType: "sse",
                                    command: "",
                                    args: "",
                                    url: "",
                                    headers: "",
                                  });
                                  setEditingMcpServer(null);
                                  setShowAddMcpDialog(true);
                                }}
                                className="flex items-center gap-2"
                              >
                                <Plus size={18} />
                                Add MCP Server
                              </Button>
                            </div>
                          ) : (
                            mcpServers.map((server) => (
                              <Card key={server._id} className={`border-2 ${server.isEnabled ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20" : "border-border"}`}>
                                <CardContent className="p-6">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-2">
                                        <h4 className="font-semibold text-lg">{server.name}</h4>
                                        <Badge variant={server.isEnabled ? "default" : "secondary"}>
                                          {server.isEnabled ? "Enabled" : "Disabled"}
                                        </Badge>
                                        <Badge variant="outline" className="capitalize">
                                          {server.transportType}
                                        </Badge>
                                      </div>
                                      {server.description && (
                                        <p className="text-base text-muted-foreground mb-3">
                                          {server.description}
                                        </p>
                                      )}
                                      <div className="text-sm text-muted-foreground">
                                        <div>URL: <code className="bg-muted px-1 rounded">{server.url}</code></div>
                                        {server.availableTools && server.availableTools.length > 0 && (
                                          <div className="mt-2">
                                            Tools: {server.availableTools.join(", ")}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setMcpForm({
                                            name: server.name,
                                            description: server.description || "",
                                            transportType: server.transportType,
                                            command: server.command || "",
                                            args: server.args?.join(" ") || "",
                                            url: server.url || "",
                                            headers: server.headers ? JSON.stringify(server.headers, null, 2) : "",
                                          });
                                          setEditingMcpServer(server._id);
                                          setShowAddMcpDialog(true);
                                        }}
                                      >
                                        <Edit size={16} />
                                      </Button>
                                      <Button
                                        variant={server.isEnabled ? "destructive" : "default"}
                                        size="sm"
                                        onClick={() => void toggleMcpServer({ id: server._id })}
                                      >
                                        {server.isEnabled ? "Disable" : "Enable"}
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => void removeMcpServer({ id: server._id })}
                                      >
                                        <Trash2 size={16} />
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Dialogs */}
        {/* Delete Conversations Confirmation Dialog */}
        <Dialog open={showDeleteConversationsDialog} onOpenChange={setShowDeleteConversationsDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete All Conversations</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                This action cannot be undone. This will permanently delete all your conversations and messages.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConversationsDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  void deleteAllConversations();
                  setShowDeleteConversationsDialog(false);
                }}
                className="flex-1"
              >
                Delete All
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Memories Confirmation Dialog */}
        <Dialog open={showDeleteMemoriesDialog} onOpenChange={setShowDeleteMemoriesDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete All Memories</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                This action cannot be undone. This will permanently delete all AI memories.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteMemoriesDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  void removeAllMemories();
                  setShowDeleteMemoriesDialog(false);
                }}
                className="flex-1"
              >
                Delete All
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Change Password Dialog */}
        <Dialog open={showChangePasswordDialog} onOpenChange={setShowChangePasswordDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <Input
                type="password"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <Input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowChangePasswordDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={() => {
                if (newPassword !== confirmPassword) {
                  setPasswordError("New passwords do not match");
                  return;
                }
                setPasswordError(null);
                void changePassword({ currentPassword, newPassword }).then(() => {
                  setShowChangePasswordDialog(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }).catch((error: any) => {
                  setPasswordError(error?.message ?? "Failed to change password");
                });
              }} className="flex-1">
                Update Password
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add/Edit MCP Server Dialog */}
        <Dialog open={showAddMcpDialog} onOpenChange={setShowAddMcpDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingMcpServer ? "Edit MCP Server" : "Add MCP Server"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mcpName">Server Name</Label>
                  <Input
                    id="mcpName"
                    value={mcpForm.name}
                    onChange={(e) => setMcpForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="My MCP Server"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mcpTransport">Transport Type</Label>
                  <Select
                    value={mcpForm.transportType}
                    onValueChange={(value: "sse" | "http") => 
                      setMcpForm(prev => ({ ...prev, transportType: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sse">SSE (Server-Sent Events)</SelectItem>
                      <SelectItem value="http">HTTP (REST API)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mcpDescription">Description (Optional)</Label>
                <Textarea
                  id="mcpDescription"
                  value={mcpForm.description}
                  onChange={(e) => setMcpForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of what this server provides"
                  rows={2}
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mcpUrl">Server URL</Label>
                  <Input
                    id="mcpUrl"
                    value={mcpForm.url}
                    onChange={(e) => setMcpForm(prev => ({ ...prev, url: e.target.value }))}
                    placeholder={mcpForm.transportType === "sse" ? "https://your-server.com/sse" : "https://your-server.com/mcp"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mcpHeaders">Headers (JSON, Optional)</Label>
                  <Textarea
                    id="mcpHeaders"
                    value={mcpForm.headers}
                    onChange={(e) => setMcpForm(prev => ({ ...prev, headers: e.target.value }))}
                    placeholder='{"Authorization": "Bearer your-token", "Content-Type": "application/json"}'
                    rows={3}
                  />
                </div>
              </div>

              <div className="bg-muted/30 rounded-xl p-4 text-sm">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  💡 Popular MCP Servers
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-muted-foreground">
                  <div><strong>GitHub:</strong> Repository management and code search</div>
                  <div><strong>PostgreSQL:</strong> Database queries and schema management</div>
                  <div><strong>Brave Search:</strong> Web search with privacy focus</div>
                  <div><strong>Filesystem:</strong> File operations and management</div>
                  <div><strong>Slack:</strong> Team communication and notifications</div>
                  <div><strong>Notion:</strong> Document and knowledge base access</div>
                </div>
                <div className="mt-3 p-3 bg-primary/10 rounded-lg">
                  <p className="text-xs"><strong>Note:</strong> Both SSE and HTTP protocols are fully supported. Choose SSE for real-time streaming or HTTP for traditional request-response patterns.</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowAddMcpDialog(false)}
                className="sm:order-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  void (async () => {
                    try {
                      if (editingMcpServer) {
                        await updateMcpServer({
                          id: editingMcpServer as any,
                          name: mcpForm.name,
                          description: mcpForm.description || undefined,
                          transportType: mcpForm.transportType,
                          url: mcpForm.url,
                          headers: mcpForm.headers ? JSON.parse(mcpForm.headers) : undefined,
                        });
                      } else {
                        await addMcpServer({
                          name: mcpForm.name,
                          description: mcpForm.description || undefined,
                          transportType: mcpForm.transportType,
                          url: mcpForm.url,
                          headers: mcpForm.headers ? JSON.parse(mcpForm.headers) : undefined,
                        });
                      }
                      setShowAddMcpDialog(false);
                      setEditingMcpServer(null);
                      setMcpForm({
                        name: "",
                        description: "",
                        transportType: "sse",
                        command: "",
                        args: "",
                        url: "",
                        headers: "",
                      });
                    } catch (error) {
                      console.error("Failed to save MCP server:", error);
                    }
                  })();
                }}
                disabled={!mcpForm.name.trim() || !mcpForm.url.trim()}
                className="sm:order-2"
              >
                {editingMcpServer ? "Update" : "Add"} Server
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}