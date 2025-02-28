"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Settings,
  Trash2,
  Edit2,
  Plus,
  Brain,
  FileText,
  Sliders,
  Info,
  AlertTriangle,
  Database,
  Sparkles,
  Bell,
  Globe,
  Shield,
  Keyboard,
  Moon,
  Sun,
  Palette,
  MessageSquare,
  Upload,
  Download,
  HardDrive,
  Lock,
  User,
  Zap,
} from "lucide-react"
import type { UserInstruction, ChatMemory, AIModel } from "@/lib/types"
import {
  fetchMemory,
  deleteAllMemory,
  fetchInstructions,
  addInstruction,
  updateInstruction,
  deleteInstruction,
  fetchModels,
} from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, ResponsiveContainer } from "recharts"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

// Memory visualization component
const MemoryVisualization = ({ data }: { data: ChatMemory[] }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  // Transform data for the chart
  const chartData = data.map((item, index) => ({
    x: index,
    y: item.value.length / 20, // Normalize for better visualization
    z: 200,
    content: item.value,
    key: item.key,
    id: item.id,
  }))

  // Configuration for the chart
  const chartConfig = {
    memory: {
      label: "Memory Items",
      color: "hsl(var(--chart-1))",
      icon: Brain,
    },
  }

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background/95 backdrop-blur-sm p-4 rounded-lg border border-border shadow-lg">
          <p className="text-primary font-medium">{data.key}</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-[250px] line-clamp-3">{data.content}</p>
          <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
            <Badge variant="outline" className="h-5">
              Complexity: {Math.round(data.y * 20)}
            </Badge>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="relative w-full h-[350px] rounded-xl border bg-gradient-to-br from-background to-background/50 overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary-rgb),0.03),transparent_70%)]" />

      {/* Animated nodes and connections */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        {chartData.map((point, i) => (
          <motion.div
            key={`node-${i}`}
            className={`absolute w-2 h-2 rounded-full ${activeIndex === i ? "bg-primary" : "bg-primary/60"}`}
            style={{
              left: `${(point.x / Math.max(chartData.length - 1, 1)) * 90 + 5}%`,
              top: `${100 - point.y * 4 - 10}%`,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: activeIndex === i ? 1.5 : 1,
              opacity: activeIndex === i ? 1 : 0.7,
              boxShadow: activeIndex === i ? "0 0 10px rgba(var(--primary-rgb), 0.5)" : "none",
            }}
            transition={{
              delay: i * 0.05,
              duration: 0.3,
            }}
          />
        ))}

        {chartData.map(
          (point, i) =>
            i < chartData.length - 1 && (
              <motion.div
                key={`line-${i}`}
                className="absolute h-px bg-primary/20"
                style={{
                  left: `${(point.x / Math.max(chartData.length - 1, 1)) * 90 + 5}%`,
                  top: `${100 - point.y * 4 - 10}%`,
                  width: `${((chartData[i + 1].x - point.x) / Math.max(chartData.length - 1, 1)) * 90}%`,
                  transform: `rotate(${Math.atan2(
                    (chartData[i + 1].y - point.y) * 4,
                    ((chartData[i + 1].x - point.x) / Math.max(chartData.length - 1, 1)) * 90,
                  )}rad)`,
                  transformOrigin: "left center",
                }}
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{
                  scaleX: 1,
                  opacity: activeIndex === i || activeIndex === i + 1 ? 0.5 : 0.2,
                }}
                transition={{ delay: i * 0.05 + 0.05 }}
              />
            ),
        )}
      </div>

      {/* Recharts visualization */}
      <ChartContainer config={chartConfig} className="h-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={{
              top: 30,
              right: 30,
              bottom: 30,
              left: 30,
            }}
            onMouseMove={(data) => {
              if (data.activeTooltipIndex !== undefined) {
                setActiveIndex(data.activeTooltipIndex)
              }
            }}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <XAxis
              type="number"
              dataKey="x"
              name="index"
              domain={[0, "dataMax"]}
              tick={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={false}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="complexity"
              domain={[0, "dataMax"]}
              tick={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={false}
            />
            <ZAxis type="number" dataKey="z" range={[60, 60]} />
            <ChartTooltip content={<CustomTooltip />} cursor={false} />
            <Scatter
              name="Memory"
              data={chartData}
              fill="var(--color-memory)"
              animationBegin={0}
              animationDuration={1000}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Chart overlay labels */}
      <div className="absolute bottom-2 left-4 text-xs text-muted-foreground">Memory Index</div>
      <div className="absolute top-1/2 left-4 -rotate-90 origin-left text-xs text-muted-foreground">Complexity</div>

      {/* Empty state */}
      {chartData.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center flex-col gap-2 text-muted-foreground">
          <Database className="w-10 h-10 opacity-20" />
          <p className="text-sm">No memory data available</p>
        </div>
      )}
    </div>
  )
}

// Instruction item component
const InstructionItem = ({
  instruction,
  editingInstruction,
  setEditingInstruction,
  handleUpdateInstruction,
  handleDeleteInstruction,
}: {
  instruction: UserInstruction
  editingInstruction: { id: string; job: string } | null
  setEditingInstruction: (value: { id: string; job: string } | null) => void
  handleUpdateInstruction: () => Promise<void>
  handleDeleteInstruction: (id: string) => Promise<void>
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-4 bg-card rounded-lg mb-3 border shadow-sm"
    >
      {editingInstruction?.id === instruction.id ? (
        <div className="flex flex-col gap-3">
          <Input
            value={editingInstruction.job}
            onChange={(e) => setEditingInstruction({ ...editingInstruction, job: e.target.value })}
            className="w-full"
          />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => setEditingInstruction(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleUpdateInstruction}>
              Save Changes
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 text-sm">{instruction.job}</div>
          <div className="flex gap-1 flex-shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditingInstruction({ id: instruction.id, job: instruction.job })}
                  >
                    <Edit2 className="w-4 h-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit instruction</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteInstruction(instruction.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete instruction</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}
    </motion.div>
  )
}

// Memory item component
const MemoryItem = ({ item }: { item: ChatMemory }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-4 bg-card rounded-lg mb-3 border shadow-sm"
    >
      <div className="font-medium text-sm flex items-center gap-2">
        <Badge variant="outline" className="font-normal">
          {item.key}
        </Badge>
      </div>
      <div className="text-sm text-muted-foreground mt-2 line-clamp-2">{item.value}</div>
    </motion.div>
  )
}

// Settings category component
const SettingsCategory = ({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType
  title: string
  description: string
  children: React.ReactNode
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-medium">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="pl-10">{children}</div>
    </div>
  )
}

// Toggle setting component
const ToggleSetting = ({
  id,
  title,
  description,
  checked,
  onCheckedChange,
  disabled = false,
}: {
  id: string
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}) => {
  return (
    <div className="flex items-center justify-between space-y-0 py-2">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="text-base">
          {title}
        </Label>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  )
}

// Main settings dialog component
export function SettingsDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [memory, setMemory] = useState<ChatMemory[]>([])
  const [instructions, setInstructions] = useState<UserInstruction[]>([])
  const [models, setModels] = useState<AIModel[]>([])
  const [newInstruction, setNewInstruction] = useState("")
  const [editingInstruction, setEditingInstruction] = useState<{ id: string; job: string } | null>(null)
  const [isDeleteMemoryDialogOpen, setIsDeleteMemoryDialogOpen] = useState(false)
  const [defaultModel, setDefaultModel] = useState("")
  const [webSearchEnabled, setWebSearchEnabled] = useState(true)
  const [safeSearchEnabled, setSafeSearchEnabled] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [activeCategory, setActiveCategory] = useState("ai-behavior")
  const { toast } = useToast()

  // Settings for the sidebar navigation
  const categories = [
    {
      id: "ai-behavior",
      label: "AI Behavior",
      icon: Brain,
      subcategories: [
        { id: "memory", label: "Memory", icon: Database },
        { id: "instructions", label: "Instructions", icon: FileText },
        { id: "models", label: "AI Models", icon: Sparkles },
      ],
    },
    {
      id: "interface",
      label: "Interface",
      icon: Sliders,
      subcategories: [
        { id: "appearance", label: "Appearance", icon: Palette },
        { id: "notifications", label: "Notifications", icon: Bell },
        { id: "accessibility", label: "Accessibility", icon: Keyboard },
      ],
    },
    {
      id: "privacy",
      label: "Privacy & Security",
      icon: Shield,
      subcategories: [
        { id: "data-usage", label: "Data Usage", icon: HardDrive },
        { id: "web-search", label: "Web Search", icon: Globe },
        { id: "security", label: "Security", icon: Lock },
      ],
    },
    {
      id: "account",
      label: "Account",
      icon: User,
      subcategories: [
        { id: "profile", label: "Profile", icon: User },
        { id: "data-export", label: "Data Export", icon: Download },
        { id: "data-import", label: "Data Import", icon: Upload },
      ],
    },
  ]

  // Settings for appearance
  const [theme, setTheme] = useState("system")
  const [fontSize, setFontSize] = useState("medium")
  const [messageStyle, setMessageStyle] = useState("bubbles")
  const [animationsEnabled, setAnimationsEnabled] = useState(true)

  // Settings for notifications
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [desktopNotifications, setDesktopNotifications] = useState(false)

  // Settings for accessibility
  const [highContrastMode, setHighContrastMode] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [keyboardShortcuts, setKeyboardShortcuts] = useState(true)

  // Settings for data usage
  const [autoDeleteMessages, setAutoDeleteMessages] = useState(false)
  const [autoDeletePeriod, setAutoDeletePeriod] = useState("30")
  const [storageLimit, setStorageLimit] = useState("unlimited")

  // Settings for security
  const [twoFactorAuth, setTwoFactorAuth] = useState(false)
  const [sessionTimeout, setSessionTimeout] = useState("60")
  const [ipRestriction, setIpRestriction] = useState(false)

  // Sidebar ref for scrolling
  const sidebarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  // Scroll sidebar to active category
  useEffect(() => {
    if (sidebarRef.current) {
      const activeElement = sidebarRef.current.querySelector(`[data-category="${activeCategory}"]`)
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: "smooth", block: "nearest" })
      }
    }
  }, [activeCategory])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [memoryData, instructionsData, modelsData] = await Promise.all([
        fetchMemory(),
        fetchInstructions(),
        fetchModels(),
      ])
      setMemory(memoryData)
      setInstructions(instructionsData)
      setModels(modelsData)
    } catch (error) {
      toast({
        title: "Error loading data",
        description: "Failed to load settings data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddInstruction = async () => {
    if (newInstruction.length < 30 || newInstruction.length > 200) {
      toast({
        title: "Invalid instruction length",
        description: "Instruction must be between 30 and 200 characters",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      await addInstruction(newInstruction)
      setNewInstruction("")
      await loadData()
      toast({
        title: "Instruction added",
        description: "Your new instruction has been added successfully",
      })
    } catch (error) {
      toast({
        title: "Failed to add instruction",
        description: "There was an error adding your instruction. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateInstruction = async () => {
    if (!editingInstruction) return

    if (editingInstruction.job.length < 30 || editingInstruction.job.length > 200) {
      toast({
        title: "Invalid instruction length",
        description: "Instruction must be between 30 and 200 characters",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      await updateInstruction(editingInstruction.id, editingInstruction.job)
      setEditingInstruction(null)
      await loadData()
      toast({
        title: "Instruction updated",
        description: "Your instruction has been updated successfully",
      })
    } catch (error) {
      toast({
        title: "Failed to update instruction",
        description: "There was an error updating your instruction. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteInstruction = async (id: string) => {
    try {
      setIsLoading(true)
      await deleteInstruction(id)
      await loadData()
      toast({
        title: "Instruction deleted",
        description: "The instruction has been deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Failed to delete instruction",
        description: "There was an error deleting the instruction. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAllMemory = async () => {
    try {
      setIsLoading(true)
      await deleteAllMemory()
      setMemory([])
      setIsDeleteMemoryDialogOpen(false)
      toast({
        title: "Memory cleared",
        description: "All memory items have been cleared successfully",
      })
    } catch (error) {
      toast({
        title: "Failed to clear memory",
        description: "There was an error clearing memory. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Render the settings content based on active category
  const renderSettingsContent = () => {
    switch (activeCategory) {
      case "memory":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Memory Management</h2>
              <p className="text-muted-foreground">
                View and manage how your AI assistant remembers information across conversations
              </p>
            </div>

            <Card className="border-none shadow-none">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Memory Network
                </CardTitle>
                <CardDescription>
                  Visualize how your AI assistant remembers information across conversations
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <MemoryVisualization data={memory} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  Memory Items
                </CardTitle>
                <CardDescription>
                  View all stored memory items that help your AI assistant remember context
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ScrollArea className="h-[200px] rounded-md">
                  <AnimatePresence>
                    {memory.length > 0 ? (
                      memory.map((item) => <MemoryItem key={item.id} item={item} />)
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center h-[150px] text-muted-foreground"
                      >
                        <Database className="w-10 h-10 opacity-20 mb-2" />
                        <p className="text-sm">No memory items found</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </ScrollArea>
              </CardContent>
              <CardFooter>
                <Button
                  variant="destructive"
                  onClick={() => setIsDeleteMemoryDialogOpen(true)}
                  className="w-full"
                  disabled={memory.length === 0 || isLoading}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All Memory
                </Button>
              </CardFooter>
            </Card>
          </div>
        )

      case "instructions":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Custom Instructions</h2>
              <p className="text-muted-foreground">
                Add personalized instructions to guide how your AI assistant responds
              </p>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Custom Instructions
                </CardTitle>
                <CardDescription>Add personalized instructions to guide how your AI assistant responds</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Input
                        value={newInstruction}
                        onChange={(e) => setNewInstruction(e.target.value)}
                        placeholder="Add new instruction (30-200 characters)"
                        disabled={isLoading}
                      />
                      <Button
                        onClick={handleAddInstruction}
                        disabled={newInstruction.length < 30 || newInstruction.length > 200 || isLoading}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Instructions should be clear directives for how the AI should behave
                    </div>
                  </div>

                  <ScrollArea className="h-[350px] rounded-md">
                    <AnimatePresence>
                      {instructions.length > 0 ? (
                        instructions.map((instruction) => (
                          <InstructionItem
                            key={instruction.id}
                            instruction={instruction}
                            editingInstruction={editingInstruction}
                            setEditingInstruction={setEditingInstruction}
                            handleUpdateInstruction={handleUpdateInstruction}
                            handleDeleteInstruction={handleDeleteInstruction}
                          />
                        ))
                      ) : (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex flex-col items-center justify-center h-[150px] text-muted-foreground"
                        >
                          <FileText className="w-10 h-10 opacity-20 mb-2" />
                          <p className="text-sm">No custom instructions found</p>
                          <p className="text-xs mt-1">Add instructions to personalize your AI assistant</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case "models":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">AI Models</h2>
              <p className="text-muted-foreground">
                Choose which AI model powers your assistant and configure model-specific settings
              </p>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  AI Model Selection
                </CardTitle>
                <CardDescription>Choose which AI model powers your assistant</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="default-model">Default AI Model</Label>
                  <Select
                    value={defaultModel}
                    onValueChange={setDefaultModel}
                    disabled={isLoading || models.length === 0}
                  >
                    <SelectTrigger id="default-model">
                      <SelectValue placeholder="Select default model" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((model) => (
                        <SelectItem key={model.id} value={model.model}>
                          <div className="flex items-center gap-2">
                            <span>{model.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {models.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      No AI models available. Please check your configuration.
                    </p>
                  )}
                </div>

                <div className="space-y-2 pt-4">
                  <Label htmlFor="model-temperature">Response Creativity</Label>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">Precise</span>
                    <input type="range" id="model-temperature" min="0" max="100" defaultValue="70" className="flex-1" />
                    <span className="text-xs text-muted-foreground">Creative</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Higher values make responses more creative but potentially less accurate
                  </p>
                </div>

                <div className="space-y-2 pt-4">
                  <Label htmlFor="model-context">Context Length</Label>
                  <Select defaultValue="medium">
                    <SelectTrigger id="model-context">
                      <SelectValue placeholder="Select context length" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small (4K tokens)</SelectItem>
                      <SelectItem value="medium">Medium (8K tokens)</SelectItem>
                      <SelectItem value="large">Large (16K tokens)</SelectItem>
                      <SelectItem value="xl">Extra Large (32K tokens)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Longer context allows the AI to remember more of your conversation but may use more resources
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  Advanced Model Settings
                </CardTitle>
                <CardDescription>Fine-tune how the AI model processes your requests</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <ToggleSetting
                  id="streaming-responses"
                  title="Streaming Responses"
                  description="Show AI responses as they're being generated"
                  checked={true}
                  onCheckedChange={() => {}}
                />

                <ToggleSetting
                  id="reasoning"
                  title="Show Reasoning"
                  description="Display the AI's reasoning process when generating responses"
                  checked={false}
                  onCheckedChange={() => {}}
                />

                <ToggleSetting
                  id="code-execution"
                  title="Code Execution"
                  description="Allow the AI to execute code snippets in a sandbox environment"
                  checked={true}
                  onCheckedChange={() => {}}
                />
              </CardContent>
            </Card>
          </div>
        )

      case "appearance":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Appearance</h2>
              <p className="text-muted-foreground">Customize the visual appearance of your AI assistant interface</p>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  Theme Settings
                </CardTitle>
                <CardDescription>Customize the look and feel of the interface</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={theme === "light" ? "default" : "outline"}
                      size="sm"
                      className="flex items-center gap-2"
                      onClick={() => setTheme("light")}
                    >
                      <Sun className="h-4 w-4" />
                      Light
                    </Button>
                    <Button
                      variant={theme === "dark" ? "default" : "outline"}
                      size="sm"
                      className="flex items-center gap-2"
                      onClick={() => setTheme("dark")}
                    >
                      <Moon className="h-4 w-4" />
                      Dark
                    </Button>
                    <Button
                      variant={theme === "system" ? "default" : "outline"}
                      size="sm"
                      className="flex items-center gap-2"
                      onClick={() => setTheme("system")}
                    >
                      <Settings className="h-4 w-4" />
                      System
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Label htmlFor="font-size">Font Size</Label>
                  <Select value={fontSize} onValueChange={setFontSize}>
                    <SelectTrigger id="font-size">
                      <SelectValue placeholder="Select font size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                      <SelectItem value="xl">Extra Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 pt-2">
                  <Label htmlFor="message-style">Message Style</Label>
                  <Select value={messageStyle} onValueChange={setMessageStyle}>
                    <SelectTrigger id="message-style">
                      <SelectValue placeholder="Select message style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bubbles">Chat Bubbles</SelectItem>
                      <SelectItem value="modern">Modern</SelectItem>
                      <SelectItem value="compact">Compact</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <ToggleSetting
                  id="animations"
                  title="Interface Animations"
                  description="Enable smooth transitions and animations throughout the interface"
                  checked={animationsEnabled}
                  onCheckedChange={setAnimationsEnabled}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Chat Appearance
                </CardTitle>
                <CardDescription>Customize how chat messages are displayed</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div className="space-y-2">
                  <Label>Message Alignment</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      Left Aligned
                    </Button>
                    <Button variant="default" size="sm" className="flex-1">
                      Bubbles
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Label htmlFor="code-theme">Code Block Theme</Label>
                  <Select defaultValue="github">
                    <SelectTrigger id="code-theme">
                      <SelectValue placeholder="Select code theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="github">GitHub</SelectItem>
                      <SelectItem value="vscode">VS Code</SelectItem>
                      <SelectItem value="dracula">Dracula</SelectItem>
                      <SelectItem value="monokai">Monokai</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <ToggleSetting
                  id="syntax-highlighting"
                  title="Syntax Highlighting"
                  description="Highlight code syntax in code blocks"
                  checked={true}
                  onCheckedChange={() => {}}
                />
              </CardContent>
            </Card>
          </div>
        )

      case "notifications":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Notifications</h2>
              <p className="text-muted-foreground">
                Configure how and when you receive notifications from your AI assistant
              </p>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  Notification Settings
                </CardTitle>
                <CardDescription>Control when and how you receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <ToggleSetting
                  id="notifications-enabled"
                  title="Enable Notifications"
                  description="Receive notifications when new messages arrive"
                  checked={notificationsEnabled}
                  onCheckedChange={setNotificationsEnabled}
                />

                <ToggleSetting
                  id="sound-enabled"
                  title="Notification Sounds"
                  description="Play a sound when new notifications arrive"
                  checked={soundEnabled}
                  onCheckedChange={setSoundEnabled}
                  disabled={!notificationsEnabled}
                />

                <ToggleSetting
                  id="desktop-notifications"
                  title="Desktop Notifications"
                  description="Show notifications on your desktop when the app is in the background"
                  checked={desktopNotifications}
                  onCheckedChange={setDesktopNotifications}
                  disabled={!notificationsEnabled}
                />

                <div className="space-y-2 pt-2">
                  <Label htmlFor="notification-level">Notification Level</Label>
                  <Select defaultValue="all" disabled={!notificationsEnabled}>
                    <SelectTrigger id="notification-level">
                      <SelectValue placeholder="Select notification level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Messages</SelectItem>
                      <SelectItem value="mentions">Mentions Only</SelectItem>
                      <SelectItem value="important">Important Only</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case "accessibility":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Accessibility</h2>
              <p className="text-muted-foreground">Configure settings to make the interface more accessible</p>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Keyboard className="w-5 h-5 text-primary" />
                  Accessibility Settings
                </CardTitle>
                <CardDescription>Make the interface more accessible for your needs</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <ToggleSetting
                  id="high-contrast"
                  title="High Contrast Mode"
                  description="Increase contrast for better visibility"
                  checked={highContrastMode}
                  onCheckedChange={setHighContrastMode}
                />

                <ToggleSetting
                  id="reduced-motion"
                  title="Reduced Motion"
                  description="Minimize animations and motion effects"
                  checked={reducedMotion}
                  onCheckedChange={setReducedMotion}
                />

                <ToggleSetting
                  id="keyboard-shortcuts"
                  title="Keyboard Shortcuts"
                  description="Enable keyboard shortcuts for faster navigation"
                  checked={keyboardShortcuts}
                  onCheckedChange={setKeyboardShortcuts}
                />

                <div className="space-y-2 pt-2">
                  <Label htmlFor="text-to-speech">Text-to-Speech Voice</Label>
                  <Select defaultValue="default">
                    <SelectTrigger id="text-to-speech">
                      <SelectValue placeholder="Select voice" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="neutral">Gender Neutral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Keyboard className="w-5 h-5 text-primary" />
                  Keyboard Shortcuts
                </CardTitle>
                <CardDescription>View and customize keyboard shortcuts</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-sm">New Chat</span>
                    <Badge variant="outline">Ctrl + N</Badge>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-sm">Send Message</span>
                    <Badge variant="outline">Enter</Badge>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-sm">New Line</span>
                    <Badge variant="outline">Shift + Enter</Badge>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-sm">Search</span>
                    <Badge variant="outline">Ctrl + F</Badge>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-sm">Settings</span>
                    <Badge variant="outline">Ctrl + ,</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case "data-usage":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Data Usage</h2>
              <p className="text-muted-foreground">Manage how your data is stored and used by the AI assistant</p>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-primary" />
                  Data Storage
                </CardTitle>
                <CardDescription>Configure how your conversation data is stored</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <ToggleSetting
                  id="auto-delete"
                  title="Auto-Delete Messages"
                  description="Automatically delete messages after a specified period"
                  checked={autoDeleteMessages}
                  onCheckedChange={setAutoDeleteMessages}
                />

                <div className="space-y-2">
                  <Label htmlFor="auto-delete-period">Auto-Delete Period</Label>
                  <Select value={autoDeletePeriod} onValueChange={setAutoDeletePeriod} disabled={!autoDeleteMessages}>
                    <SelectTrigger id="auto-delete-period">
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 pt-2">
                  <Label htmlFor="storage-limit">Storage Limit</Label>
                  <Select value={storageLimit} onValueChange={setStorageLimit}>
                    <SelectTrigger id="storage-limit">
                      <SelectValue placeholder="Select storage limit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100">100 MB</SelectItem>
                      <SelectItem value="500">500 MB</SelectItem>
                      <SelectItem value="1000">1 GB</SelectItem>
                      <SelectItem value="unlimited">Unlimited</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Download className="w-5 h-5 text-primary" />
                  Data Export
                </CardTitle>
                <CardDescription>Export your conversation data</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="export-format">Export Format</Label>
                  <Select defaultValue="json">
                    <SelectTrigger id="export-format">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="txt">Plain Text</SelectItem>
                      <SelectItem value="html">HTML</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Export All Conversations
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Export Current Chat
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case "web-search":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Web Search</h2>
              <p className="text-muted-foreground">Configure how your AI assistant interacts with web content</p>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  Web Search Settings
                </CardTitle>
                <CardDescription>Configure how your AI assistant interacts with web content</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-6">
                <ToggleSetting
                  id="web-search"
                  title="Enable Web Search"
                  description="Allow AI to search the web for current information"
                  checked={webSearchEnabled}
                  onCheckedChange={setWebSearchEnabled}
                />

                <ToggleSetting
                  id="safe-search"
                  title="Safe Search"
                  description="Filter explicit content from web search results"
                  checked={safeSearchEnabled}
                  onCheckedChange={setSafeSearchEnabled}
                  disabled={!webSearchEnabled}
                />

                <div className="space-y-2">
                  <Label htmlFor="search-engine">Preferred Search Engine</Label>
                  <Select defaultValue="google" disabled={!webSearchEnabled}>
                    <SelectTrigger id="search-engine">
                      <SelectValue placeholder="Select search engine" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google">Google</SelectItem>
                      <SelectItem value="bing">Bing</SelectItem>
                      <SelectItem value="duckduckgo">DuckDuckGo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="search-results">Number of Search Results</Label>
                  <Select defaultValue="3" disabled={!webSearchEnabled}>
                    <SelectTrigger id="search-results">
                      <SelectValue placeholder="Select number of results" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 result</SelectItem>
                      <SelectItem value="3">3 results</SelectItem>
                      <SelectItem value="5">5 results</SelectItem>
                      <SelectItem value="10">10 results</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Content Filtering
                </CardTitle>
                <CardDescription>Control what types of content the AI can access</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="content-filter">Content Filter Level</Label>
                  <Select defaultValue="moderate" disabled={!webSearchEnabled}>
                    <SelectTrigger id="content-filter">
                      <SelectValue placeholder="Select filter level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="strict">Strict</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <ToggleSetting
                  id="block-untrusted"
                  title="Block Untrusted Sources"
                  description="Only allow information from verified and trusted websites"
                  checked={true}
                  onCheckedChange={() => {}}
                  disabled={!webSearchEnabled}
                />
              </CardContent>
            </Card>
          </div>
        )

      case "security":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Security</h2>
              <p className="text-muted-foreground">Configure security settings to protect your account and data</p>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lock className="w-5 h-5 text-primary" />
                  Account Security
                </CardTitle>
                <CardDescription>Protect your account with additional security measures</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <ToggleSetting
                  id="two-factor"
                  title="Two-Factor Authentication"
                  description="Require a second form of verification when logging in"
                  checked={twoFactorAuth}
                  onCheckedChange={setTwoFactorAuth}
                />

                <div className="space-y-2">
                  <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                  <Select value={sessionTimeout} onValueChange={setSessionTimeout}>
                    <SelectTrigger id="session-timeout">
                      <SelectValue placeholder="Select timeout period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="240">4 hours</SelectItem>
                      <SelectItem value="720">12 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <ToggleSetting
                  id="ip-restriction"
                  title="IP Address Restriction"
                  description="Limit access to specific IP addresses"
                  checked={ipRestriction}
                  onCheckedChange={setIpRestriction}
                />

                {ipRestriction && (
                  <div className="space-y-2 pl-6">
                    <Label htmlFor="allowed-ips">Allowed IP Addresses</Label>
                    <Input id="allowed-ips" placeholder="e.g. 192.168.1.1, 10.0.0.1" />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter comma-separated IP addresses or CIDR ranges
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-primary" />
                  Privacy Controls
                </CardTitle>
                <CardDescription>Manage how your data is used and shared</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <ToggleSetting
                  id="data-collection"
                  title="Data Collection"
                  description="Allow collection of usage data to improve the service"
                  checked={true}
                  onCheckedChange={() => {}}
                />

                <ToggleSetting
                  id="third-party"
                  title="Third-Party Integrations"
                  description="Allow the AI to connect with third-party services"
                  checked={false}
                  onCheckedChange={() => {}}
                />

                <Button variant="destructive" className="w-full">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete All My Data
                </Button>
              </CardContent>
            </Card>
          </div>
        )

      case "profile":
      case "data-export":
      case "data-import":
        return (
          <div className="flex items-center justify-center h-[400px]">
            <div className="text-center space-y-4">
              <div className="bg-primary/10 h-12 w-12 rounded-full flex items-center justify-center mx-auto">
                <Settings className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium">Coming Soon</h3>
              <p className="text-muted-foreground max-w-md">
                This settings section is currently under development and will be available in a future update.
              </p>
            </div>
          </div>
        )

      default:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Settings Overview</h2>
              <p className="text-muted-foreground">
                Configure your AI assistant&apos;s behavior, appearance, and security settings
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map((category) => (
                <Card key={category.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <category.icon className="w-5 h-5 text-primary" />
                      {category.label}
                    </CardTitle>
                    <CardDescription>
                      {category.id === "ai-behavior" && "Configure how your AI assistant behaves and responds"}
                      {category.id === "interface" && "Customize the appearance and behavior of the interface"}
                      {category.id === "privacy" && "Manage privacy and security settings"}
                      {category.id === "account" && "Manage your account and data"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="space-y-1">
                      {category.subcategories.map((subcategory) => (
                        <li key={subcategory.id}>
                          <Button
                            variant="ghost"
                            className="w-full justify-start text-sm h-9"
                            onClick={() => setActiveCategory(subcategory.id)}
                          >
                            <subcategory.icon className="w-4 h-4 mr-2" />
                            {subcategory.label}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-xl flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Settings
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col md:flex-row h-[calc(90vh-80px)]">
            {/* Sidebar navigation */}
            <div className="w-full md:w-64 border-r border-t md:border-t-0">
              <ScrollArea className="h-full py-4" ref={sidebarRef}>
                <div className="px-4 space-y-4">
                  {categories.map((category) => (
                    <div key={category.id} className="space-y-1">
                      <h3 className="text-sm font-medium text-muted-foreground px-2">{category.label}</h3>
                      <ul className="space-y-1">
                        {category.subcategories.map((subcategory) => (
                          <li key={subcategory.id}>
                            <Button
                              variant="ghost"
                              className={cn(
                                "w-full justify-start text-sm h-9",
                                activeCategory === subcategory.id && "bg-primary/10 text-primary font-medium",
                              )}
                              onClick={() => setActiveCategory(subcategory.id)}
                              data-category={subcategory.id}
                            >
                              <subcategory.icon className="w-4 h-4 mr-2" />
                              {subcategory.label}
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Main content area */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full p-6">{renderSettingsContent()}</ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteMemoryDialogOpen} onOpenChange={setIsDeleteMemoryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Clear Memory
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear all memory? This action cannot be undone and your AI assistant will forget
              all previous context.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllMemory}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? "Clearing..." : "Clear Memory"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

