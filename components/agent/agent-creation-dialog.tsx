"use client"

import { useState } from "react"
import { Bot, Plus, X, ChevronRight, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Agent, AgentStep } from "@/lib/types"
import { addAgentStep, updateAgentStep, deleteAgentStep } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "@/hooks/use-toast"
import { useAgents } from "@/hooks/use-agents"

interface AgentCreationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAgentCreated?: (agentId: string) => void
  agent?: Agent
  isEditing?: boolean
}

export function AgentCreationDialog({
  open,
  onOpenChange,
  onAgentCreated,
  agent,
  isEditing = false,
}: AgentCreationDialogProps) {
  const { user } = useAuth()
  const { createAgent: createAgentApi, updateAgent: updateAgentApi } = useAgents()
  
  const [currentStep, setCurrentStep] = useState<"info" | "steps" | "review">("info")
  const [name, setName] = useState(agent?.name || "")
  const [description, setDescription] = useState(agent?.description || "")
  const [steps, setSteps] = useState<AgentStep[]>(agent?.steps || [])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentEditingStep, setCurrentEditingStep] = useState<AgentStep | null>(null)

  // Reset state when dialog opens/closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Only reset if we're not in edit mode
      if (!isEditing) {
        setName("")
        setDescription("")
        setSteps([])
      }
      setCurrentStep("info")
      setCurrentEditingStep(null)
    }
    onOpenChange(open)
  }

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be signed in to create or edit agents",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      let agentId: string;

      if (isEditing && agent) {
        // Update existing agent
        await updateAgentApi(agent.id, {
          name,
          description,
        });
        agentId = agent.id;
      } else {
        // Create new agent
        const newAgent = await createAgentApi({
          name,
          description,
        });
        
        if (!newAgent) {
          throw new Error("Failed to create agent");
        }
        
        agentId = newAgent.id;

        // Create steps for the new agent
        for (const step of steps) {
          await addAgentStep(agentId, {
            name: step.name,
            type: step.type,
            config: step.config || {},
            order: step.order,
            description: step.description,
            nextOnSuccess: step.nextOnSuccess,
            nextOnFailure: step.nextOnFailure,
          });
        }
      }

      onAgentCreated?.(agentId);
      handleOpenChange(false);
      
      toast({
        title: isEditing ? "Agent Updated" : "Agent Created",
        description: isEditing 
          ? "Your agent has been updated successfully" 
          : "Your new agent has been created successfully",
      });
    } catch (error) {
      console.error("Error saving agent:", error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'create'} agent`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const addStep = (stepType: string) => {
    const newStep: AgentStep = {
      id: `step-${Date.now()}`,
      name: `New ${stepType} Step`,
      type: stepType,
      order: steps.length,
      agentId: agent?.id || "",
      config: {}
    }
    setSteps([...steps, newStep])
    setCurrentEditingStep(newStep)
  }

  const updateStep = (stepId: string, updates: Partial<AgentStep>) => {
    setSteps(steps.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ))
    if (currentEditingStep?.id === stepId) {
      setCurrentEditingStep({ ...currentEditingStep, ...updates })
    }
  }

  const deleteStep = (stepId: string) => {
    setSteps(steps.filter(step => step.id !== stepId))
    if (currentEditingStep?.id === stepId) {
      setCurrentEditingStep(null)
    }
  }

  const reorderSteps = (stepId: string, direction: "up" | "down") => {
    const stepIndex = steps.findIndex(step => step.id === stepId)
    if (
      (direction === "up" && stepIndex === 0) ||
      (direction === "down" && stepIndex === steps.length - 1)
    ) {
      return
    }

    const newSteps = [...steps]
    const targetIndex = direction === "up" ? stepIndex - 1 : stepIndex + 1
    const temp = newSteps[targetIndex]
    newSteps[targetIndex] = newSteps[stepIndex]
    newSteps[stepIndex] = temp
    
    // Update order property for each step
    const reorderedSteps = newSteps.map((step, index) => ({
      ...step,
      order: index
    }))
    
    setSteps(reorderedSteps)
  }

  // Determine if the current step is valid
  const isCurrentStepValid = () => {
    switch (currentStep) {
      case "info":
        return name.trim().length > 0
      case "steps":
        return steps.length > 0
      case "review":
        return true
      default:
        return false
    }
  }

  // Step type options
  const stepTypes = [
    { value: "PROMPT", label: "AI Prompt" },
    { value: "WEB", label: "Web Request" },
    { value: "CODE", label: "Code Execution" },
    { value: "CONDITION", label: "Condition" },
    { value: "DATA_TRANSFORM", label: "Data Transform" },
  ]

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-500" />
            {isEditing ? "Edit Agent" : "Create New Agent"}
          </DialogTitle>
          <DialogDescription>
            {currentStep === "info" && "Configure basic information about your agent"}
            {currentStep === "steps" && "Define the workflow steps for your agent"}
            {currentStep === "review" && "Review your agent configuration before saving"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex mb-5 border-b py-2">
          <div 
            className={`flex items-center mr-6 cursor-pointer pb-2 border-b-2 ${
              currentStep === "info" ? "border-purple-500 text-foreground" : "border-transparent text-muted-foreground"
            }`}
            onClick={() => setCurrentStep("info")}
          >
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/10 text-xs font-medium text-purple-600 mr-2">1</span>
            <span>Information</span>
          </div>
          <div 
            className={`flex items-center mr-6 cursor-pointer pb-2 border-b-2 ${
              currentStep === "steps" ? "border-purple-500 text-foreground" : "border-transparent text-muted-foreground"
            }`}
            onClick={() => name.trim().length > 0 && setCurrentStep("steps")}
          >
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/10 text-xs font-medium text-purple-600 mr-2">2</span>
            <span>Steps</span>
          </div>
          <div 
            className={`flex items-center mr-6 cursor-pointer pb-2 border-b-2 ${
              currentStep === "review" ? "border-purple-500 text-foreground" : "border-transparent text-muted-foreground"
            }`}
            onClick={() => steps.length > 0 && name.trim().length > 0 && setCurrentStep("review")}
          >
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/10 text-xs font-medium text-purple-600 mr-2">3</span>
            <span>Review</span>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-1">
            {/* Information step */}
            {currentStep === "info" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="agent-name">Name <span className="text-destructive">*</span></Label>
                  <Input 
                    id="agent-name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="Enter agent name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agent-description">Description</Label>
                  <Textarea 
                    id="agent-description" 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    placeholder="Describe what this agent does"
                    rows={4}
                  />
                </div>
              </div>
            )}
            
            {/* Steps step */}
            {currentStep === "steps" && (
              <div className="space-y-4 flex">
                <div className={`${currentEditingStep ? "w-1/2 pr-4" : "w-full"}`}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Agent Steps</h3>
                    <Select onValueChange={(value) => addStep(value)}>
                      <SelectTrigger className="w-[180px]">
                        <span className="flex items-center">
                          <Plus className="w-3.5 h-3.5 mr-1.5" />
                          Add Step
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {stepTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {steps.length === 0 ? (
                    <div className="border border-dashed rounded-lg p-6 text-center">
                      <p className="text-muted-foreground">No steps added yet. Add steps to define your agent&apos;s workflow.</p>
                      <Button variant="outline" className="mt-4" onClick={() => addStep("PROMPT")}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Step
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {steps.map((step, index) => (
                        <div 
                          key={step.id} 
                          className={`border rounded-lg p-3 cursor-pointer transition-all flex items-start justify-between group hover:border-purple-300/30 ${
                            currentEditingStep?.id === step.id ? "border-purple-500/40 bg-purple-500/5" : ""
                          }`}
                          onClick={() => setCurrentEditingStep(step)}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/10 text-xs font-medium text-purple-600 mt-0.5">
                              {index + 1}
                            </div>
                            <div>
                              <div className="flex items-center">
                                <h4 className="font-medium">{step.name}</h4>
                                <Badge className="ml-2 bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 border-none">
                                  {step.type}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteStep(step.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Step editor */}
                {currentEditingStep && (
                  <div className="w-1/2 border-l pl-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">Edit Step</h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setCurrentEditingStep(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="step-name">Step Name</Label>
                        <Input 
                          id="step-name" 
                          value={currentEditingStep.name} 
                          onChange={(e) => updateStep(currentEditingStep.id, { name: e.target.value })} 
                          placeholder="Enter step name"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="step-type">Step Type</Label>
                        <Select 
                          value={currentEditingStep.type} 
                          onValueChange={(value) => updateStep(currentEditingStep.id, { type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select step type" />
                          </SelectTrigger>
                          <SelectContent>
                            {stepTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Type-specific configuration would go here */}
                      {currentEditingStep.type === "PROMPT" && (
                        <div className="space-y-2">
                          <Label htmlFor="prompt-text">Prompt Text</Label>
                          <Textarea 
                            id="prompt-text" 
                            placeholder="Enter prompt text for AI"
                            rows={5}
                          />
                          <p className="text-xs text-muted-foreground">
                            Use the format {"{"}input{"}"} to reference data from previous steps.
                          </p>
                        </div>
                      )}
                      
                      {/* More type-specific configurations would be added here */}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Review step */}
            {currentStep === "review" && (
              <div className="space-y-6">
                <div className="border rounded-lg p-4">
                  <h3 className="text-sm text-muted-foreground font-medium uppercase tracking-wider mb-2">Agent Information</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium">Name:</span>
                      <span className="ml-2">{name}</span>
                    </div>
                    {description && (
                      <div>
                        <span className="text-sm font-medium">Description:</span>
                        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h3 className="text-sm text-muted-foreground font-medium uppercase tracking-wider mb-2">Workflow Steps</h3>
                  <div className="space-y-2">
                    {steps.map((step, index) => (
                      <div key={step.id} className="border rounded-lg p-3 flex items-start space-x-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/10 text-xs font-medium text-purple-600 mt-0.5">
                          {index + 1}
                        </div>
                        <div>
                          <div className="flex items-center">
                            <h4 className="font-medium">{step.name}</h4>
                            <Badge className="ml-2 bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 border-none">
                              {step.type}
                            </Badge>
                          </div>
                          {index < steps.length - 1 && (
                            <div className="ml-2 h-6 border-l border-dashed border-muted-foreground/30"></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="mt-6 pt-4 border-t flex justify-between items-center w-full">
          <div>
            {currentStep !== "info" && (
              <Button variant="ghost" onClick={() => setCurrentStep(currentStep === "steps" ? "info" : "steps")}>
                Back
              </Button>
            )}
          </div>
          <div>
            {currentStep !== "review" ? (
              <Button 
                onClick={() => setCurrentStep(currentStep === "info" ? "steps" : "review")}
                disabled={!isCurrentStepValid()}
                className="bg-purple-500 hover:bg-purple-600"
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className="bg-purple-500 hover:bg-purple-600"
              >
                {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create Agent"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 