"use client"

import { useState } from "react"
import { Bot, MoreVertical, Clock, PlusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Agent, AgentStep } from "@/lib/types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Remove locally defined Agent interfaces
interface AgentGridProps {
  agents: Agent[]
  onAgentSelect: (agentId: string) => void
  onCreateAgent: () => void
  onEditAgent: (agentId: string) => void
  onDuplicateAgent: (agentId: string) => void
  onDeleteAgent: (agentId: string) => void
}

export function AgentGrid({
  agents,
  onAgentSelect,
  onCreateAgent,
  onEditAgent,
  onDuplicateAgent,
  onDeleteAgent,
}: AgentGridProps) {
  // Format date to relative time (e.g., "2d ago")
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
    const diffMinutes = Math.floor(diffTime / (1000 * 60))
    
    if (diffDays > 0) {
      return `${diffDays}d ago`
    } else if (diffHours > 0) {
      return `${diffHours}h ago`
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ago`
    } else {
      return 'Just now'
    }
  }
  
  return (
    <div className="space-y-8">
      {/* Header section with info and create button */}
      <div className="bg-purple-500/5 rounded-xl p-6 border border-purple-200/20">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-300/20">
            <Bot className="h-8 w-8 text-purple-500" />
          </div>
          <div>
            <h3 className="text-xl font-semibold">AI Agents</h3>
            <p className="text-muted-foreground mt-1">Create, configure, and deploy AI agents to automate your workflows.</p>
            <div className="mt-4 flex gap-3">
              <Button className="bg-purple-500 hover:bg-purple-600" onClick={onCreateAgent}>
                <Bot className="h-4 w-4 mr-2" />
                Create New Agent
              </Button>
              <Button variant="outline" className="border-purple-200/20">
                View Documentation
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Grid of agent cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Map over agents array to display each agent */}
        {agents.map((agent) => (
          <Card 
            key={agent.id}
            className="group relative rounded-xl border border-muted bg-card p-5 transition-all hover:shadow-md hover:border-purple-300/30"
            onClick={() => onAgentSelect(agent.id)}
          >
            <div className="flex justify-between">
              <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-300/20">
                <Bot className="h-5 w-5 text-purple-500" />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 opacity-0 group-hover:opacity-100"
                    onClick={(e) => e.stopPropagation()} // Prevent card click when clicking dropdown
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onEditAgent(agent.id);
                  }}>
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onDuplicateAgent(agent.id);
                  }}>
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteAgent(agent.id);
                    }}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <h3 className="mt-4 font-medium">{agent.name}</h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{agent.description || "No description"}</p>
            
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex justify-between items-center">
                <Badge variant="outline" className="bg-purple-500/5 text-purple-600 border-purple-200/30">
                  {agent.steps?.length || 0} step{agent.steps?.length !== 1 ? 's' : ''}
                </Badge>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Clock className="w-3 h-3 mr-1" />
                  <span>Updated {formatRelativeTime(agent.updatedAt)}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
        
        {/* Add new agent card */}
        <Card 
          className="rounded-xl border border-dashed border-muted bg-muted/40 p-5 flex flex-col items-center justify-center text-center h-[212px] hover:bg-purple-500/5 hover:border-purple-300/30 transition-all cursor-pointer group"
          onClick={onCreateAgent}
        >
          <div className="p-3 rounded-full bg-purple-500/10 border border-purple-300/20 mb-4 group-hover:scale-110 transition-transform">
            <PlusCircle className="h-6 w-6 text-purple-500" />
          </div>
          <h3 className="font-medium">Create New Agent</h3>
          <p className="text-sm text-muted-foreground mt-1">Build a custom AI workflow</p>
        </Card>
        
        {/* Show message when no agents exist */}
        {agents.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-10 text-center">
            <div className="p-4 rounded-full bg-purple-500/10 border border-purple-300/20 mb-4">
              <Bot className="h-8 w-8 text-purple-500" />
            </div>
            <h3 className="text-lg font-medium">No agents yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Create your first agent to start automating tasks with AI
            </p>
          </div>
        )}
      </div>
    </div>
  )
} 