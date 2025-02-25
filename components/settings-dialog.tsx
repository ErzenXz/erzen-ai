"use client"

import { useState, useEffect } from "react"
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
import { Settings, Trash2, Edit2, Plus } from "lucide-react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer } from "recharts"
import { motion } from "framer-motion"

const MemoryVisualization = ({ data }: { data: ChatMemory[] }) => {
  const chartData = data.map((item, index) => ({
    x: index * 100,
    y: item.value.length,
    z: 200,
    content: item.value,
    key: item.key,
  }))

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-black/80 backdrop-blur-sm p-4 rounded-lg border border-primary/20">
          <p className="text-primary font-medium">{data.key}</p>
          <p className="text-sm text-primary/80 mt-1 max-w-[200px] truncate">{data.content}</p>
          <div className="text-xs text-primary/60 mt-2">Complexity: {data.y}</div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="relative w-full h-[300px] bg-black/90 rounded-xl border border-primary/20">
      {/* Decorative Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary-rgb),0.1),transparent_50%)]" />
      <div className="absolute top-0 left-0 w-full h-full">
        {chartData.map((point, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-primary rounded-full"
            style={{
              left: `${(point.x / (chartData.length * 100)) * 100}%`,
              top: `${100 - (point.y / 1000) * 100}%`,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
          />
        ))}
        {chartData.map(
          (point, i) =>
            i < chartData.length - 1 && (
              <motion.div
                key={`line-${i}`}
                className="absolute h-px bg-primary/30"
                style={{
                  left: `${(point.x / (chartData.length * 100)) * 100}%`,
                  top: `${100 - (point.y / 1000) * 100}%`,
                  width: `${((chartData[i + 1].x - point.x) / (chartData.length * 100)) * 100}%`,
                  transform: `rotate(${Math.atan2(chartData[i + 1].y - point.y, chartData[i + 1].x - point.x)}rad)`,
                  transformOrigin: "left center",
                }}
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ delay: i * 0.1 + 0.05 }}
              />
            ),
        )}
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart
          margin={{
            top: 20,
            right: 20,
            bottom: 20,
            left: 20,
          }}
        >
          <XAxis type="number" dataKey="x" name="index" tick={false} axisLine={{ stroke: "hsl(var(--primary))" }} />
          <YAxis
            type="number"
            dataKey="y"
            name="complexity"
            tick={false}
            axisLine={{ stroke: "hsl(var(--primary))" }}
          />
          <ZAxis type="number" dataKey="z" range={[100, 100]} />
          <Tooltip content={<CustomTooltip />} />
          <Scatter data={chartData} fill="hsl(var(--primary))" animationBegin={0} animationDuration={1000} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

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
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  const loadData = async () => {
    try {
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
        title: "Error",
        description: "Failed to load settings data",
        variant: "destructive",
      })
    }
  }

  const handleAddInstruction = async () => {
    if (newInstruction.length < 30 || newInstruction.length > 200) {
      toast({
        title: "Invalid instruction",
        description: "Instruction must be between 30 and 200 characters",
        variant: "destructive",
      })
      return
    }

    try {
      await addInstruction(newInstruction)
      setNewInstruction("")
      await loadData()
      toast({
        title: "Success",
        description: "Instruction added successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add instruction",
        variant: "destructive",
      })
    }
  }

  const handleUpdateInstruction = async () => {
    if (!editingInstruction) return

    if (editingInstruction.job.length < 30 || editingInstruction.job.length > 200) {
      toast({
        title: "Invalid instruction",
        description: "Instruction must be between 30 and 200 characters",
        variant: "destructive",
      })
      return
    }

    try {
      await updateInstruction(editingInstruction.id, editingInstruction.job)
      setEditingInstruction(null)
      await loadData()
      toast({
        title: "Success",
        description: "Instruction updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update instruction",
        variant: "destructive",
      })
    }
  }

  const handleDeleteInstruction = async (id: string) => {
    try {
      await deleteInstruction(id)
      await loadData()
      toast({
        title: "Success",
        description: "Instruction deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete instruction",
        variant: "destructive",
      })
    }
  }

  const handleDeleteAllMemory = async () => {
    try {
      await deleteAllMemory()
      setMemory([])
      setIsDeleteMemoryDialogOpen(false)
      toast({
        title: "Success",
        description: "Memory cleared successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear memory",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="flex-shrink-0" title="Settings">
            <Settings className="w-4 h-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="memory" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="memory">Memory</TabsTrigger>
              <TabsTrigger value="instructions">Instructions</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
            </TabsList>

            <TabsContent value="memory" className="space-y-3">
              <Card>
                <CardHeader>
                  <CardTitle>Memory Network</CardTitle>
                  <CardDescription>Visualize memory connections and complexity</CardDescription>
                </CardHeader>
                <CardContent>
                  <MemoryVisualization data={memory} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Memory Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[150px] rounded-md border p-4">
                    {memory.map((item) => (
                      <div key={item.id} className="p-4 bg-muted rounded-lg mb-2">
                        <div className="font-medium">{item.key}</div>
                        <div className="text-sm text-muted-foreground">{item.value}</div>
                      </div>
                    ))}
                  </ScrollArea>
                  <Button
                    variant="destructive"
                    onClick={() => setIsDeleteMemoryDialogOpen(true)}
                    className="w-full mt-4"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All Memory
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="instructions" className="space-y-3">
              <h3 className="text-lg font-medium mb-4">Instructions</h3>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newInstruction}
                    onChange={(e) => setNewInstruction(e.target.value)}
                    placeholder="Add new instruction (30-200 characters)"
                  />
                  <Button onClick={handleAddInstruction}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>

                <ScrollArea className="h-[150px] rounded-md border p-4">
                  {instructions.map((instruction) => (
                    <div key={instruction.id} className="p-4 bg-muted rounded-lg mb-2">
                      {editingInstruction?.id === instruction.id ? (
                        <div className="flex gap-2">
                          <Input
                            value={editingInstruction.job}
                            onChange={(e) => setEditingInstruction({ ...editingInstruction, job: e.target.value })}
                          />
                          <Button onClick={handleUpdateInstruction}>Save</Button>
                          <Button variant="ghost" onClick={() => setEditingInstruction(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">{instruction.job}</div>
                          <div className="flex gap-2 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingInstruction({ id: instruction.id, job: instruction.job })}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteInstruction(instruction.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="preferences" className="space-y-3">
              <Card>
                <CardHeader>
                  <CardTitle>AI Model Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="default-model">Default AI Model</Label>
                    <Select value={defaultModel} onValueChange={setDefaultModel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select default model" />
                      </SelectTrigger>
                      <SelectContent>
                        {models.map((model) => (
                          <SelectItem key={model.id} value={model.model}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Web Search Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="web-search">Enable Web Search</Label>
                      <div className="text-sm text-muted-foreground">
                        Allow AI to search the web for current information
                      </div>
                    </div>
                    <Switch id="web-search" checked={webSearchEnabled} onCheckedChange={setWebSearchEnabled} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="safe-search">Safe Search</Label>
                      <div className="text-sm text-muted-foreground">
                        Filter explicit content from web search results
                      </div>
                    </div>
                    <Switch id="safe-search" checked={safeSearchEnabled} onCheckedChange={setSafeSearchEnabled} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteMemoryDialogOpen} onOpenChange={setIsDeleteMemoryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Memory</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear all memory? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAllMemory}>Clear Memory</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

