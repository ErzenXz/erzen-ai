import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Eye, EyeOff, Key, Trash2, Zap, Infinity as InfinityIcon, Settings, User, UserCog, FileText, Brain, Edit, Camera, Lock, Wrench, Sun, Moon, Monitor, Palette, Upload } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
  theme?: "light" | "dark" | "system";
  colorTheme?: string;
}

interface SettingsModalProps {
  onClose: () => void;
  preferences: UserPreferences | null;
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

export function SettingsModal({ onClose, preferences }: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<"ai" | "appearance" | "apikeys" | "usage" | "account" | "data">("ai");
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
  const [showDeleteConversationsDialog, setShowDeleteConversationsDialog] = useState(false);
  const [showDeleteMemoriesDialog, setShowDeleteMemoriesDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentColorTheme, setCurrentColorTheme] = useState("default");

  // Change password dialog state
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  
  // Import conversation state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const updatePreferences = useMutation(api.preferences.update);
  const upsertApiKey = useMutation(api.apiKeys.upsert);
  const removeApiKey = useMutation(api.apiKeys.remove);
  const migrateKeys = useMutation(api.apiKeys.migrateUnencryptedKeys);
  const userApiKeys = useQuery(api.apiKeys.list) || [];
  const apiKeyInfo = useQuery(api.apiKeys.getApiKeyInfo) || [];
  const usage = useQuery(api.usage.get);
  const limits = useQuery(api.usage.getLimits);

  // New mutations and queries
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

  const changePassword = useMutation(api.userAccount.changePassword);
  const importConversation = useMutation(api.conversations.importConversation);

  useEffect(() => {
    if (preferences) {
      // Only extract the valid preference fields, excluding Convex-generated fields
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
        theme: preferences.theme ?? "system",
        colorTheme: preferences.colorTheme ?? "default",
      });
    }
  }, [preferences]);

  // Load current color theme from document classes
  useEffect(() => {
    const currentColorTheme = COLOR_THEMES.find(t =>
      document.documentElement.classList.contains(t.value)
    )?.value ?? "default";
    setCurrentColorTheme(currentColorTheme);
  }, []);

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

  const handleSavePreferences = async () => {
    await updatePreferences({
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
    });
  };

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    setSettings(prev => ({ ...prev, theme: newTheme }));
  };

  const handleColorThemeChange = (newColorTheme: string) => {
    // Remove all color theme classes
    COLOR_THEMES.forEach(t => {
      if (t.value !== "default") {
        document.documentElement.classList.remove(t.value);
      }
    });

    // Add the new color theme class
    if (newColorTheme !== "default") {
      document.documentElement.classList.add(newColorTheme);
    }

    setCurrentColorTheme(newColorTheme);
    setSettings(prev => ({ ...prev, colorTheme: newColorTheme }));
    localStorage.setItem("color-theme", newColorTheme);
  };

  const handleSaveApiKey = async (provider: keyof typeof PROVIDER_CONFIGS) => {
    const key = apiKeys[provider];
    if (key?.trim()) {
      await upsertApiKey({ provider, apiKey: key.trim() });
      setApiKeys(prev => ({ ...prev, [provider]: "" }));
    }
  };

  const handleRemoveApiKey = async (provider: keyof typeof PROVIDER_CONFIGS) => {
    await removeApiKey({ provider });
  };

  const toggleShowKey = (provider: string) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const hasApiKey = (provider: string) => {
    return userApiKeys.some(key => key.provider === provider && key.hasKey);
  };

  const getApiKeyInfo = (provider: string) => {
    return apiKeyInfo.find(info => info.provider === provider);
  };

  const getUsagePercentage = (used: number, limit: number) => {
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  const handleSaveInstructions = async () => {
    await updateInstructions({ instructions: userInstructions });
  };

  const handleSaveProfile = async () => {
    try {
      setIsLoading(true);
      await updateProfile({
        name: profileName || undefined,
        profilePicture: profilePicture || undefined
      });
      // Show success feedback
    } catch (error) {
      console.error("Failed to update profile:", error);
      // Show error feedback
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAllConversations = async () => {
    await deleteAllConversations();
    setShowDeleteConversationsDialog(false);
  };

  const handleDeleteAllMemories = async () => {
    await removeAllMemories();
    setShowDeleteMemoriesDialog(false);
  };

  const handleCleanupContent = async () => {
    try {
      setIsLoading(true);
      const result = await cleanupDuplicatedContent({});
      console.debug(`Fixed ${result.fixed} messages with duplicated content`);
      // Show success feedback
    } catch (error) {
      console.error("Failed to cleanup content:", error);
      // Show error feedback
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditMemory = (memoryId: string, currentText: string) => {
    setEditingMemory(memoryId);
    setEditMemoryText(currentText);
  };

  const handleSaveMemory = async () => {
    if (editingMemory) {
      await updateMemory({ id: editingMemory as any, memory: editMemoryText });
      setEditingMemory(null);
      setEditMemoryText("");
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    await removeMemory({ id: memoryId as any });
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }
    try {
      setPasswordError(null);
      await changePassword({ currentPassword, newPassword });
      setShowChangePasswordDialog(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      setPasswordError(error?.message ?? "Failed to change password");
    }
  };

  const handleMigrateKeys = async () => {
    try {
      setIsLoading(true);
      const migratedCount = await migrateKeys();
      console.debug(`Migrated ${migratedCount} API keys to encrypted format`);
      // Show success feedback
    } catch (error) {
      console.error("Failed to migrate keys:", error);
      // Show error feedback
    } finally {
      setIsLoading(false);
    }
  };

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const handleImportConversation = async () => {
    if (!importFile) return;
    
    try {
      setIsImporting(true);
      const text = await importFile.text();
      const importData = JSON.parse(text);
      
      await importConversation({ exportData: importData });
      setImportFile(null);
      
      // Show success message
      console.log('Conversation imported successfully');
    } catch (error) {
      console.error("Failed to import conversation:", error);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[95vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="px-4 sm:px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="text-xl font-semibold">Settings</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "ai" | "appearance" | "apikeys" | "usage" | "account" | "data")} className="flex-1 flex flex-col lg:flex-row min-h-0">
          {/* Mobile tabs */}
          <div className="lg:hidden border-b bg-background px-4 py-3">
            <TabsList className="grid grid-cols-3 gap-1 h-auto w-full bg-muted p-1 rounded-lg">
              <TabsTrigger value="ai" className="flex flex-col items-center gap-1 px-2 py-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md">
                <Brain size={16} />
                <span>AI</span>
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex flex-col items-center gap-1 px-2 py-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md">
                <Palette size={16} />
                <span>Style</span>
              </TabsTrigger>
              <TabsTrigger value="apikeys" className="flex flex-col items-center gap-1 px-2 py-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md">
                <Key size={16} />
                <span>Keys</span>
              </TabsTrigger>
            </TabsList>
            <div className="mt-2">
              <TabsList className="grid grid-cols-3 gap-1 h-auto w-full bg-muted p-1 rounded-lg">
                <TabsTrigger value="usage" className="flex flex-col items-center gap-1 px-2 py-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md">
                  <Zap size={16} />
                  <span>Usage</span>
                </TabsTrigger>
                <TabsTrigger value="account" className="flex flex-col items-center gap-1 px-2 py-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md">
                  <UserCog size={16} />
                  <span>Account</span>
                </TabsTrigger>
                <TabsTrigger value="data" className="flex flex-col items-center gap-1 px-2 py-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md">
                  <Brain size={16} />
                  <span>Data</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* Desktop sidebar with tabs */}
          <div className="hidden lg:block w-64 border-r bg-gradient-to-br from-muted/20 via-muted/30 to-accent/10 p-6 flex-shrink-0 overflow-y-auto relative">
            <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent pointer-events-none"></div>
            <div className="relative z-10">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-foreground mb-1">Settings</h2>
                <p className="text-sm text-muted-foreground">Customize your experience</p>
              </div>
              
              <TabsList className="flex flex-col h-auto w-full bg-transparent p-0 space-y-3">
              <div className="w-full space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2">Core</p>
                <TabsTrigger value="ai" className="w-full justify-start gap-3 px-4 py-3.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:border border-primary/20 rounded-xl transition-all duration-200 hover:bg-background/60 hover:shadow-sm group">
                  <Brain size={18} className="group-data-[state=active]:text-primary" />
                  <div className="text-left">
                    <div className="font-medium">AI & Behavior</div>
                    <div className="text-xs text-muted-foreground group-data-[state=active]:text-primary/70">Models & prompts</div>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="appearance" className="w-full justify-start gap-3 px-4 py-3.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:border border-primary/20 rounded-xl transition-all duration-200 hover:bg-background/60 hover:shadow-sm group">
                  <Palette size={18} className="group-data-[state=active]:text-primary" />
                  <div className="text-left">
                    <div className="font-medium">Appearance</div>
                    <div className="text-xs text-muted-foreground group-data-[state=active]:text-primary/70">Themes & display</div>
                  </div>
                </TabsTrigger>
              </div>

              <div className="w-full space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2">Integration</p>
                <TabsTrigger value="apikeys" className="w-full justify-start gap-3 px-4 py-3.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:border border-primary/20 rounded-xl transition-all duration-200 hover:bg-background/60 hover:shadow-sm group">
                  <Key size={18} className="group-data-[state=active]:text-primary" />
                  <div className="text-left">
                    <div className="font-medium">API Keys</div>
                    <div className="text-xs text-muted-foreground group-data-[state=active]:text-primary/70">External services</div>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="usage" className="w-full justify-start gap-3 px-4 py-3.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:border border-primary/20 rounded-xl transition-all duration-200 hover:bg-background/60 hover:shadow-sm group">
                  <Zap size={18} className="group-data-[state=active]:text-primary" />
                  <div className="text-left">
                    <div className="font-medium">Usage & Billing</div>
                    <div className="text-xs text-muted-foreground group-data-[state=active]:text-primary/70">Limits & plans</div>
                  </div>
                </TabsTrigger>
              </div>

              <div className="w-full space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2">Personal</p>
                <TabsTrigger value="account" className="w-full justify-start gap-3 px-4 py-3.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:border border-primary/20 rounded-xl transition-all duration-200 hover:bg-background/60 hover:shadow-sm group">
                  <UserCog size={18} className="group-data-[state=active]:text-primary" />
                  <div className="text-left">
                    <div className="font-medium">Account</div>
                    <div className="text-xs text-muted-foreground group-data-[state=active]:text-primary/70">Profile & security</div>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="data" className="w-full justify-start gap-3 px-4 py-3.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:border border-primary/20 rounded-xl transition-all duration-200 hover:bg-background/60 hover:shadow-sm group">
                  <Brain size={18} className="group-data-[state=active]:text-primary" />
                  <div className="text-left">
                    <div className="font-medium">Data & Memory</div>
                    <div className="text-xs text-muted-foreground group-data-[state=active]:text-primary/70">Instructions & AI memory</div>
                  </div>
                </TabsTrigger>
              </div>
              </TabsList>
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 min-h-0">
            <TabsContent value="ai" className="space-y-6 mt-0">
              <Card className="border-2 border-primary/20">
                <CardHeader className="bg-primary/5 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    AI Model Configuration
                  </CardTitle>
                  <CardDescription>
                    Configure your preferred AI provider and model settings for optimal performance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {/* AI Provider */}
                    <div className="space-y-2">
                      <Label htmlFor="provider">AI Provider</Label>
                      <Select
                        value={settings.aiProvider}
                        onValueChange={(value) => setSettings(prev => ({
                          ...prev,
                          aiProvider: value as UserPreferences["aiProvider"],
                          model: PROVIDER_CONFIGS[value as keyof typeof PROVIDER_CONFIGS].models[0] ?? "",
                        }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PROVIDER_CONFIGS)
                            .filter(([key]) => !["tavily", "openweather"].includes(key))
                            .map(([key, config]) => (
                              <SelectItem key={key} value={key}>
                                <span className="hidden sm:inline">{config.name} - {config.description}</span>
                                <span className="sm:hidden">{config.name}</span>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Model */}
                    {PROVIDER_CONFIGS[settings.aiProvider].models.length > 0 && (
                      <div className="space-y-2">
                        <Label htmlFor="model">Model</Label>
                        <Select
                          value={settings.model}
                          onValueChange={(value) => setSettings(prev => ({ ...prev, model: value }))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select model" />
                          </SelectTrigger>
                          <SelectContent>
                            {PROVIDER_CONFIGS[settings.aiProvider].models.map(model => (
                              <SelectItem key={model} value={model}>{model}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {/* Temperature */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <Label>Temperature</Label>
                        <Badge variant="secondary" className="text-xs">{settings.temperature}</Badge>
                      </div>
                      <Slider
                        value={[settings.temperature]}
                        onValueChange={([value]) => setSettings(prev => ({ ...prev, temperature: value }))}
                        max={2}
                        min={0}
                        step={0.1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Focused</span>
                        <span>Creative</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* System Prompt Card */}
              <Card className="border-2 border-primary/20">
                <CardHeader className="bg-primary/5 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    System Prompt & Personality
                  </CardTitle>
                  <CardDescription>
                    Define the AI's personality and behavior. This prompt is combined with your user instructions to create a unique assistant experience.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="useCustomSystemPrompt" className="text-sm font-medium">Enable Custom System Prompt</Label>
                      <p className="text-xs sm:text-sm text-muted-foreground">
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
                    <div className="space-y-2">
                      <Label htmlFor="systemPrompt">System Prompt</Label>
                      <Textarea
                        id="systemPrompt"
                        value={settings.systemPrompt || ""}
                        onChange={(e) => setSettings(prev => ({ ...prev, systemPrompt: e.target.value }))}
                        placeholder="Enter your custom system prompt..."
                        className="min-h-[100px] sm:min-h-[120px] resize-none"
                        maxLength={2000}
                      />
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-xs text-muted-foreground">
                        <span className="hidden sm:inline">Define how the AI should behave and respond</span>
                        <span>{settings.systemPrompt?.length || 0}/2000</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-6 mt-0">
              <Card className="border-2 border-primary/20">
                <CardHeader className="bg-primary/5 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Privacy & Display
                  </CardTitle>
                  <CardDescription>
                    Control how your personal information is displayed and what details are shown in the interface
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-primary flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Privacy Controls
                    </h4>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-3 sm:p-4 bg-muted/30 rounded-lg border border-border/50">
                      <div className="space-y-0.5">
                        <Label htmlFor="hideUserInfo" className="font-medium text-sm">Hide User Information</Label>
                        <p className="text-xs sm:text-sm text-muted-foreground">
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

                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-primary flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Interface Options
                    </h4>
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-3 sm:p-4 bg-muted/30 rounded-lg border border-border/50">
                        <div className="space-y-0.5">
                          <Label htmlFor="showToolOutputs" className="font-medium text-sm">Show Tool Output Cards</Label>
                          <p className="text-xs sm:text-sm text-muted-foreground">
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
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-3 sm:p-4 bg-muted/30 rounded-lg border border-border/50">
                        <div className="space-y-0.5">
                          <Label htmlFor="showMessageMetadata" className="font-medium text-sm">Show Message Metadata on Hover</Label>
                          <p className="text-xs sm:text-sm text-muted-foreground">
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
                      
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-3 sm:p-4 bg-muted/30 rounded-lg border border-border/50">
                        <div className="space-y-0.5">
                          <Label htmlFor="showThinking" className="font-medium text-sm">Show Model Thinking Process</Label>
                          <p className="text-xs sm:text-sm text-muted-foreground">
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
              <Card className="border-2 border-primary/20">
                <CardHeader className="bg-primary/5 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5 text-primary" />
                    Theme & Colors
                  </CardTitle>
                  <CardDescription>
                    Customize the appearance with light/dark mode and color themes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-primary flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      Appearance Mode
                    </h4>
                    <div className="flex rounded-lg bg-muted p-1">
                      <button
                        onClick={() => handleThemeChange("light")}
                        className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                          settings.theme === "light"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Sun size={14} className="sm:hidden" />
                        <Sun size={16} className="hidden sm:block" />
                        <span className="hidden sm:inline">Light</span>
                        <span className="sm:hidden">Light</span>
                      </button>
                      <button
                        onClick={() => handleThemeChange("dark")}
                        className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                          settings.theme === "dark"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Moon size={14} className="sm:hidden" />
                        <Moon size={16} className="hidden sm:block" />
                        <span className="hidden sm:inline">Dark</span>
                        <span className="sm:hidden">Dark</span>
                      </button>
                      <button
                        onClick={() => handleThemeChange("system")}
                        className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                          settings.theme === "system"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Monitor size={14} className="sm:hidden" />
                        <Monitor size={16} className="hidden sm:block" />
                        <span className="hidden sm:inline">Auto</span>
                        <span className="sm:hidden">Auto</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-primary flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Color Theme
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                      {COLOR_THEMES.map((colorTheme) => (
                        <button
                          key={colorTheme.value}
                          onClick={() => handleColorThemeChange(colorTheme.value)}
                          className={`relative h-10 sm:h-12 rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
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
                            <span className="text-xs font-medium text-primary-foreground drop-shadow-lg">
                              {colorTheme.name}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* API Keys Tab */}
            <TabsContent value="apikeys" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>API Keys</CardTitle>
                  <CardDescription>
                    Add your own API keys for unlimited usage without counting against limits
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <Zap className="text-primary mt-1" size={20} />
                      <div>
                        <h3 className="font-medium mb-1">Built-in API Keys vs Your Own</h3>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p><strong>Built-in Keys:</strong> Free usage with monthly limits (messages & searches count)</p>
                          <p><strong>Your Keys:</strong> <InfinityIcon className="inline w-4 h-4" /> Unlimited usage - no limits or counting!</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Lock className="text-green-600 dark:text-green-400 mt-1" size={20} />
                        <div>
                          <h3 className="font-medium mb-1 text-green-800 dark:text-green-200">🔒 Encryption & Security</h3>
                          <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                            <p><strong>All API keys are encrypted</strong> before being stored in the database</p>
                            <p>Your keys are protected with industry-standard encryption and can only be decrypted by you</p>
                            <p>We never store or log your actual API keys in plain text</p>
                          </div>
                        </div>
                      </div>
                      {userApiKeys.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleMigrateKeys()}
                          disabled={isLoading}
                          className="text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900"
                        >
                          <Lock size={14} className="mr-1" />
                          {isLoading ? "Migrating..." : "Migrate Keys"}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {Object.entries(PROVIDER_CONFIGS).map(([provider, config]) => {
                      const keyInfo = getApiKeyInfo(provider);
                      const hasUserKey = keyInfo?.hasUserKey || false;
                      
                      return (
                        <Card key={provider} className={hasUserKey ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20" : ""}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h3 className="font-medium flex items-center gap-2">
                                  {config.name}
                                  {hasUserKey && (
                                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                      <span className="text-xs font-medium">Your Key</span>
                                    </div>
                                  )}
                                </h3>
                                <p className="text-sm text-muted-foreground">{config.description}</p>
                                {hasUserKey && keyInfo?.keyPreview && (
                                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                    Key: {keyInfo.keyPreview} • Added {keyInfo.addedAt ? new Date(keyInfo.addedAt).toLocaleDateString() : 'Recently'}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {hasUserKey && (
                                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                    <InfinityIcon size={12} className="mr-1" />
                                    Unlimited
                                  </Badge>
                                )}
                                {config.hasBuiltIn && (
                                  <Badge variant="secondary" className={hasUserKey ? "opacity-60" : ""}>
                                    <Zap size={12} className="mr-1" />
                                    Built-in
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2">
                              <div className="flex-1 relative">
                                <Input
                                  type={showKeys[provider] ? "text" : "password"}
                                  value={apiKeys[provider] || ""}
                                  onChange={(e) => setApiKeys(prev => ({ ...prev, [provider]: e.target.value }))}
                                  placeholder={hasUserKey ? "Enter new key to replace existing..." : config.keyPlaceholder}
                                  className="pr-10"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => toggleShowKey(provider)}
                                  className="absolute right-1 top-1 h-8 w-8"
                                >
                                  {showKeys[provider] ? <EyeOff size={16} /> : <Eye size={16} />}
                                </Button>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => void handleSaveApiKey(provider as keyof typeof PROVIDER_CONFIGS)}
                                  disabled={!apiKeys[provider]?.trim()}
                                  className="flex items-center gap-2 flex-1 sm:flex-none"
                                >
                                  <Key size={16} />
                                  <span className="hidden sm:inline">{hasUserKey ? "Update" : "Save"}</span>
                                  <span className="sm:hidden">{hasUserKey ? "Update" : "Save"}</span>
                                </Button>
                                {hasUserKey && (
                                  <Button
                                    variant="destructive"
                                    onClick={() => void handleRemoveApiKey(provider as keyof typeof PROVIDER_CONFIGS)}
                                    className="flex items-center gap-2"
                                    size="icon"
                                  >
                                    <Trash2 size={16} />
                                  </Button>
                                )}
                              </div>
                            </div>

                            {!hasUserKey && config.hasBuiltIn && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Using built-in key with usage limits. Add your own key for unlimited access.
                              </p>
                            )}
                            {hasUserKey && (
                              <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                                <InfinityIcon size={12} />
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
            </TabsContent>

            {/* Account Tab */}
            <TabsContent value="account" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Settings</CardTitle>
                  <CardDescription>
                    Manage your profile information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="profileName">Display Name</Label>
                    <Input
                      id="profileName"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Enter your display name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profilePicture">Profile Picture URL</Label>
                    <div className="flex gap-2">
                      <Input
                        id="profilePicture"
                        value={profilePicture}
                        onChange={(e) => setProfilePicture(e.target.value)}
                        placeholder="Enter profile picture URL"
                        className="flex-1"
                      />
                      <Button
                        onClick={() => void handleSaveProfile()}
                        disabled={isLoading}
                        className="flex items-center gap-2"
                      >
                        <Camera size={16} />
                        {isLoading ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Account Actions</CardTitle>
                  <CardDescription>
                    Manage your account data and security
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Change Password</h4>
                      <p className="text-sm text-muted-foreground">Update your account password</p>
                    </div>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2"
                      onClick={() => setShowChangePasswordDialog(true)}
                    >
                      <Lock size={16} />
                      Change Password
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Delete All Conversations</h4>
                      <p className="text-sm text-muted-foreground">Permanently delete all your conversations</p>
                    </div>
                    <Button
                      variant="destructive"
                      className="flex items-center gap-2"
                      onClick={() => setShowDeleteConversationsDialog(true)}
                    >
                      <Trash2 size={16} />
                      Delete All
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Fix Duplicated Content</h4>
                      <p className="text-sm text-muted-foreground">Clean up any messages with duplicated or corrupted content</p>
                    </div>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2"
                      onClick={() => void handleCleanupContent()}
                      disabled={isLoading}
                    >
                      <Wrench size={16} />
                      {isLoading ? "Cleaning..." : "Fix Content"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Data & Memory Tab */}
            <TabsContent value="data" className="space-y-6 mt-0">
              <Card className="border-2 border-primary/20">
                <CardHeader className="bg-primary/5 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Custom Instructions
                  </CardTitle>
                  <CardDescription>
                    Add custom instructions that will be sent to the AI with every conversation (max 500 words). These work alongside your system prompt.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="instructions">Instructions</Label>
                      <span className="text-sm text-muted-foreground">
                        {getWordCount(userInstructions)}/500 words
                      </span>
                    </div>
                    <Textarea
                      id="instructions"
                      value={userInstructions}
                      onChange={(e) => setUserInstructions(e.target.value)}
                      placeholder="Enter your custom instructions for the AI..."
                      className="min-h-[200px]"
                    />
                    {getWordCount(userInstructions) > 500 && (
                      <p className="text-sm text-red-500">
                        Instructions exceed 500 words. Please reduce the length.
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={() => void handleSaveInstructions()}
                    disabled={getWordCount(userInstructions) > 500}
                    className="w-full"
                  >
                    Save Instructions
                  </Button>
                </CardContent>
              </Card>

              {/* Memory Section */}
              <Card className="border-2 border-primary/20">
                <CardHeader className="bg-primary/5 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    AI Memory Bank
                  </CardTitle>
                  <CardDescription>
                    View and manage things the AI has remembered about you from your conversations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm text-muted-foreground">
                      {memories.length} memories stored
                    </span>
                    {memories.length > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex items-center gap-2"
                        onClick={() => setShowDeleteMemoriesDialog(true)}
                      >
                        <Trash2 size={14} />
                        Delete All
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {memories.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Brain size={48} className="mx-auto mb-2 opacity-50" />
                        <p>No memories stored yet</p>
                        <p className="text-sm">The AI will remember important information as you chat</p>
                      </div>
                    ) : (
                      memories.map((memory) => (
                        <div key={memory._id} className="border rounded-lg p-3">
                          {editingMemory === memory._id ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editMemoryText}
                                onChange={(e) => setEditMemoryText(e.target.value)}
                                className="min-h-[60px]"
                              />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => void handleSaveMemory()}>
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
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-1">
                                <p className="text-sm">{memory.memory}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(memory.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditMemory(memory._id, memory.memory)}
                                >
                                  <Edit size={14} />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => void handleDeleteMemory(memory._id)}
                                >
                                  <Trash2 size={14} />
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
              <Card className="border-2 border-primary/20">
                <CardHeader className="bg-primary/5 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-primary" />
                    Import Conversations
                  </CardTitle>
                  <CardDescription>
                    Upload a previously exported conversation JSON file to import it into your account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="import-file">Select File</Label>
                    <Input
                      id="import-file"
                      type="file"
                      accept=".json"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      disabled={isImporting}
                    />
                  </div>
                  
                  {importFile && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium">Selected file:</p>
                      <p className="text-xs text-muted-foreground">{importFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(importFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  )}

                  <Button
                    onClick={() => void handleImportConversation()}
                    disabled={!importFile || isImporting}
                    className="w-full"
                  >
                    {isImporting ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload size={16} className="mr-2" />
                        Import Conversation
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Usage Tab */}
            <TabsContent value="usage" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Current Plan</CardTitle>
                  <CardDescription>
                    Your usage statistics and plan information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-2">Current Plan</h3>
                    <div className="flex items-center gap-3">
                      <Badge className="capitalize">
                        {usage?.plan ?? "Free"}
                      </Badge>
                      <span className="text-muted-foreground">
                        Resets on {usage?.resetDate ? new Date(usage.resetDate).toLocaleDateString() : "N/A"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      💡 Add your own API keys for unlimited usage without counting against these limits!
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Usage Stats */}
              {usage && limits && (
                <Card>
                  <CardHeader>
                    <CardTitle>Usage Statistics</CardTitle>
                    <CardDescription>Built-in keys only - your own keys have unlimited usage</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      {/* Credits Usage */}
                      <div className="space-y-3 p-4 bg-muted/20 rounded-lg border">
                        <h4 className="font-medium text-sm sm:text-base">Credits</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs sm:text-sm">
                            <span>Used</span>
                            <span className="font-medium">{usage.creditsUsed} / {usage.creditsLimit}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${getUsageColor(getUsagePercentage(usage.creditsUsed, usage.creditsLimit))}`}
                              style={{ width: `${getUsagePercentage(usage.creditsUsed, usage.creditsLimit)}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">Your own API keys = unlimited usage</p>
                          <p className="text-xs text-muted-foreground">Spending: ${usage.dollarsSpent.toFixed(2)} / ${usage.maxSpendingDollars.toFixed(2)}</p>
                        </div>
                      </div>

                      {/* Searches Usage */}
                      <div className="space-y-3 p-4 bg-muted/20 rounded-lg border">
                        <h4 className="font-medium text-sm sm:text-base">Web Searches</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs sm:text-sm">
                            <span>Used</span>
                            <span className="font-medium">{usage.searchesUsed} / {limits.searches}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${getUsageColor(getUsagePercentage(usage.searchesUsed, limits.searches))}`}
                              style={{ width: `${getUsagePercentage(usage.searchesUsed, limits.searches)}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">Your own API keys = unlimited searches</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Plan Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Plans & Pricing</CardTitle>
                  <CardDescription>Credit-based pricing for built-in API keys</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Free Plan */}
                    <div className={`p-4 rounded-lg border ${usage?.plan === "free" ? "border-primary bg-primary/5" : "border-muted"}`}>
                      <div className="space-y-2">
                        <h4 className={`font-semibold ${usage?.plan === "free" ? "text-primary" : ""}`}>
                          Free {usage?.plan === "free" && "• Current"}
                        </h4>
                        <p className="text-2xl font-bold">100 <span className="text-sm font-normal">credits</span></p>
                        <p className="text-sm text-muted-foreground">Max spending: $1.00</p>
                        <p className="text-sm text-muted-foreground">10 web searches</p>
                      </div>
                    </div>

                    {/* Pro Plan */}
                    <div className={`p-4 rounded-lg border ${usage?.plan === "pro" ? "border-primary bg-primary/5" : "border-muted"}`}>
                      <div className="space-y-2">
                        <h4 className={`font-semibold ${usage?.plan === "pro" ? "text-primary" : ""}`}>
                          Pro {usage?.plan === "pro" && "• Current"}
                        </h4>
                        <p className="text-2xl font-bold">500 <span className="text-sm font-normal">credits</span></p>
                        <p className="text-sm text-muted-foreground">Max spending: $8.00</p>
                        <p className="text-sm text-muted-foreground">200 web searches</p>
                      </div>
                    </div>

                    {/* Ultra Plan */}
                    <div className={`p-4 rounded-lg border ${usage?.plan === "ultra" ? "border-primary bg-primary/5" : "border-muted"}`}>
                      <div className="space-y-2">
                        <h4 className={`font-semibold ${usage?.plan === "ultra" ? "text-primary" : ""}`}>
                          Ultra {usage?.plan === "ultra" && "• Current"}
                        </h4>
                        <p className="text-2xl font-bold">2500 <span className="text-sm font-normal">credits</span></p>
                        <p className="text-sm text-muted-foreground">Max spending: $20.00</p>
                        <p className="text-sm text-muted-foreground">1000 web searches</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      <strong>Credits are deducted based on actual token usage.</strong> Different models have different costs per token. 
                      Use your own API keys for unlimited usage without credit deduction.
                    </p>
                  </div>
                </CardContent>
              </Card>

            </TabsContent>
          </div>
        </Tabs>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 p-4 sm:p-6 border-t flex-shrink-0">
          <Button variant="outline" onClick={onClose} className="order-2 sm:order-1 sm:flex-1">
            Cancel
          </Button>
          {(activeTab === "ai" || activeTab === "appearance") && (
            <Button
              onClick={() => {
                void handleSavePreferences().then(() => {
                  onClose();
                });
              }}
              className="order-1 sm:order-2 sm:flex-1"
            >
              Save Settings
            </Button>
          )}
          {activeTab === "data" && (
            <Button
              onClick={() => {
                void handleSaveInstructions().then(() => {
                  onClose();
                });
              }}
              disabled={getWordCount(userInstructions) > 500}
              className="order-1 sm:order-2 sm:flex-1"
            >
              Save Instructions
            </Button>
          )}
          {activeTab === "account" && (
            <Button
              onClick={() => {
                void handleSaveProfile().then(() => {
                  onClose();
                });
              }}
              className="order-1 sm:order-2 sm:flex-1"
            >
              Save Profile
            </Button>
          )}
        </div>
      </DialogContent>

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
              onClick={() => void handleDeleteAllConversations()}
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
              onClick={() => void handleDeleteAllMemories()}
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
            <Button onClick={() => void handleChangePassword()} className="flex-1">
              Update Password
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
