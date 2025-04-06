"use client"

import { useState, useEffect, useRef } from "react"
import { Bot, Play, AlertCircle, Loader2 } from "lucide-react"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { executeAgent } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import type { Agent } from "@/lib/types"

interface AgentRunDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agent?: Agent
}

function extractRequiredInputs(agent?: Agent): Array<{name: string, description: string}> {
  if (!agent?.steps?.length) return [];
  
  // For this implementation, we're focusing on inputs referenced in SET_VARIABLE steps
  const requiredInputs: {[key: string]: string} = {};
  
  for (const step of agent.steps) {
    if (step.type === "SET_VARIABLE" && step.config?.expression) {
      // Look for patterns like {{input.city}} in expressions
      const matches = String(step.config.expression).match(/{{input\.([^}]+)}}/g);
      if (matches) {
        matches.forEach(match => {
          const inputName = match.replace(/{{input\.|}}$/g, '');
          requiredInputs[inputName] = `Input value for ${inputName}`;
        });
      }
    }
  }
  
  return Object.entries(requiredInputs).map(([name, description]) => ({
    name,
    description
  }));
}

export function AgentRunDialog({ open, onOpenChange, agent }: AgentRunDialogProps) {
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null) 
  const initialized = useRef(false)
  const [expandedView, setExpandedView] = useState(false)
  
  // Get required inputs outside the effect
  const requiredInputs = agent ? extractRequiredInputs(agent) : [];
  
  // Initialize inputs only once when dialog opens with a new agent
  useEffect(() => {
    if (open && agent && !initialized.current) {
      // Mark as initialized for this dialog session
      initialized.current = true;
      
      // Initialize inputs with empty values if not already set
      const initialInputs: Record<string, string> = {};
      requiredInputs.forEach(input => {
        initialInputs[input.name] = '';
      });
      
      setInputs(initialInputs);
      setResult(null);
    } else if (!open) {
      // Reset the initialization flag when dialog closes
      initialized.current = false;
    }
  }, [open, agent, requiredInputs]);
  
  // Handle input changes with proper event handling
  const handleInputChange = (name: string, value: string) => {
    setInputs(prev => {
      // Create a new object to ensure state update triggers correctly
      return { ...prev, [name]: value };
    });
  };
  
  const handleRun = async () => {
    if (!agent) return;
    
    // Check if all required inputs are provided
    const missingInputs = requiredInputs.filter(input => !inputs[input.name]);
    if (missingInputs.length > 0) {
      toast({
        title: "Missing required inputs",
        description: `Please provide values for: ${missingInputs.map(i => i.name).join(', ')}`,
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    setResult(null);
    
    try {
      const response = await executeAgent(agent.id, inputs);
      setResult(response);
      
      if (response.status === "FAILED") {
        toast({
          title: "Agent execution failed",
          description: response.error || "Execution failed with no specific error message",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Agent execution completed",
          description: "The agent has successfully processed your request",
        });
      }
    } catch (err) {
      toast({
        title: "Error running agent",
        description: err instanceof Error ? err.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Toggle expanded view for results
  const toggleExpandedView = () => {
    setExpandedView(!expandedView);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-500" />
            Run Agent: {agent?.name}
          </DialogTitle>
          <DialogDescription>
            {agent?.description || "Provide the required inputs to run this agent"}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4 max-h-[70vh]">
          <div className="space-y-6 py-2">
            {/* Required inputs section */}
            {requiredInputs.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Required Inputs</h3>
                
                {requiredInputs.map(input => (
                  <div key={input.name} className="space-y-2">
                    <Label htmlFor={`input-${input.name}`} className="capitalize">
                      {input.name}
                    </Label>
                    <input
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                      id={`input-${input.name}`}
                      value={inputs[input.name] || ''}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        handleInputChange(input.name, newValue);
                      }}
                      placeholder={input.description}
                      autoComplete="off"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                This agent does not require any specific inputs.
              </div>
            )}
            
            {/* Results section */}
            {result && (
              <div className="space-y-5 bg-background p-5 rounded-lg border shadow-sm">
                {/* Status and metadata */}
                <div className="flex items-center">
                  <div className={cn(
                    "mr-3 px-3 py-1 rounded-full text-xs font-medium",
                    result.status === "COMPLETED" ? "bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-400" :
                    result.status === "FAILED" ? "bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-400" :
                    "bg-amber-100 text-amber-800 dark:bg-amber-800/30 dark:text-amber-400"
                  )}>
                    {result.status}
                  </div>
                  {result.tokenUsage !== undefined && (
                    <div className="text-xs text-muted-foreground">
                      Token usage: {result.tokenUsage}
                    </div>
                  )}
                  {result.executionPath && result.executionPath.length > 0 && (
                    <div className="ml-auto text-xs text-muted-foreground">
                      {result.executionPath.length} steps executed
                    </div>
                  )}
                </div>
                
                {/* Formatted output */}
                {result.output && typeof result.output === 'object' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">Output</h3>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-xs"
                        onClick={() => {
                          try {
                            navigator.clipboard.writeText(JSON.stringify(result.output, null, 2));
                            toast({
                              title: "Copied",
                              description: "Output data copied to clipboard",
                            });
                          } catch (err) {
                            console.error("Failed to copy:", err);
                          }
                        }}
                      >
                        Copy All
                      </Button>
                    </div>
                    
                    {/* Special case for weather agent */}
                    {result.output.formattedWeather ? (
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800/50">
                        <div className="flex flex-col md:flex-row gap-6">
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold mb-2">{result.output.cityName}</h4>
                            <p className="text-sm mb-4">{result.output.summary}</p>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                                <span className="text-sm text-muted-foreground">Temperature:</span>
                                <span className="ml-auto font-medium">{result.output.temperature}</span>
                              </div>
                              <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                                <span className="text-sm text-muted-foreground">Humidity:</span>
                                <span className="ml-auto font-medium">{result.output.humidity}</span>
                              </div>
                              <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full bg-amber-500 mr-2"></div>
                                <span className="text-sm text-muted-foreground">Wind Speed:</span>
                                <span className="ml-auto font-medium">{result.output.windSpeed}</span>
                              </div>
                              <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                                <span className="text-sm text-muted-foreground">Condition:</span>
                                <span className="ml-auto font-medium">{result.output.condition}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Generic result display with improved scrolling */
                      <div className="rounded-lg border overflow-hidden">
                        <div className="bg-muted/50 px-4 py-2 border-b flex justify-between items-center">
                          <span className="text-xs font-medium">Result Data</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-xs"
                            onClick={toggleExpandedView}
                          >
                            {expandedView ? "Collapse" : "Expand"}
                          </Button>
                        </div>
                        
                        <div 
                          className={cn(
                            "overflow-y-auto transition-all duration-300 ease-in-out",
                            expandedView ? "max-h-[500px]" : "max-h-96"
                          )}
                        >
                          <div className="p-4 font-mono text-xs bg-card">
                            <pre className="whitespace-pre-wrap break-all">
                              {JSON.stringify(result.output, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Execution Path if available */}
                {result.executionPath && result.executionPath.length > 0 && (
                  <div className="mt-3">
                    <details className="group">
                      <summary className="flex items-center cursor-pointer text-sm font-medium">
                        <div className="flex items-center">
                          <div className="h-3 w-3 mr-2 rounded-sm border border-muted-foreground/30 group-hover:border-primary/50 group-hover:bg-primary/5 transition-colors"></div>
                          Execution Path ({result.executionPath.length} steps)
                        </div>
                      </summary>
                      <div className="mt-3 pl-5 border-l-2 border-muted max-h-40 overflow-y-auto">
                        {result.executionPath.map((stepId: string, index: number) => (
                          <div key={stepId} className="mb-2 text-xs flex items-center">
                            <div className="w-5 h-5 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center text-[10px] mr-2">
                              {index + 1}
                            </div>
                            <span>{stepId}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            )}
            
            {/* Error display */}
            {result && result.status === "FAILED" && (
              <div className="bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium mb-1">Error</h3>
                  <p className="text-sm">{result.error}</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        <DialogFooter className="pt-4 border-t mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button 
            className="bg-purple-500 hover:bg-purple-600 text-white" 
            onClick={handleRun}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run Agent
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 