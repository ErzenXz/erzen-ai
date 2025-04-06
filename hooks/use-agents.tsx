"use client"

import { useState, useCallback, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "@/hooks/use-toast"
import { 
  fetchAgents, 
  fetchAgent, 
  createAgent,
  updateAgent,
  deleteAgent
} from "@/lib/api"
import type { Agent } from "@/lib/types"

export function useAgents() {
  const { user } = useAuth()
  const [agents, setAgents] = useState<Agent[]>([])
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAgents = useCallback(async () => {
    if (!user) return
    
    try {
      setIsLoading(true)
      setError(null)
      const agentsData = await fetchAgents()
      setAgents(agentsData)
    } catch (error) {
      console.error("Error loading agents:", error)
      setError("Failed to load agents")
      toast({
        title: "Error",
        description: "Failed to load agents",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [user])

  const getAgent = useCallback(async (agentId: string) => {
    if (!user) return null
    
    try {
      setIsLoading(true)
      const agent = await fetchAgent(agentId)
      setCurrentAgent(agent)
      return agent
    } catch (error) {
      console.error("Error fetching agent:", error)
      toast({
        title: "Error",
        description: "Failed to load agent details",
        variant: "destructive",
      })
      return null
    } finally {
      setIsLoading(false)
    }
  }, [user])

  const createNewAgent = useCallback(async (data: { name: string; description?: string }) => {
    if (!user) return null
    
    try {
      setIsLoading(true)
      const newAgent = await createAgent(data)
      setAgents((prev) => [...prev, newAgent])
      toast({
        title: "Success",
        description: "Agent created successfully",
      })
      return newAgent
    } catch (error) {
      console.error("Error creating agent:", error)
      toast({
        title: "Error",
        description: "Failed to create agent",
        variant: "destructive",
      })
      return null
    } finally {
      setIsLoading(false)
    }
  }, [user])

  const updateExistingAgent = useCallback(async (
    agentId: string, 
    data: { name?: string; description?: string }
  ) => {
    if (!user) return null
    
    try {
      setIsLoading(true)
      const updatedAgent = await updateAgent(agentId, data)
      setAgents((prev) => 
        prev.map((agent) => (agent.id === agentId ? updatedAgent : agent))
      )
      if (currentAgent?.id === agentId) {
        setCurrentAgent(updatedAgent)
      }
      toast({
        title: "Success",
        description: "Agent updated successfully",
      })
      return updatedAgent
    } catch (error) {
      console.error("Error updating agent:", error)
      toast({
        title: "Error",
        description: "Failed to update agent",
        variant: "destructive",
      })
      return null
    } finally {
      setIsLoading(false)
    }
  }, [user, currentAgent])

  const duplicateExistingAgent = useCallback(async (agentId: string) => {
    if (!user) return null
    
    try {
      setIsLoading(true)
      const agentToDuplicate = await fetchAgent(agentId)
      const newAgent = await createAgent({
        name: `${agentToDuplicate.name} (Copy)`,
        description: agentToDuplicate.description,
      })
      setAgents((prev) => [...prev, newAgent])
      toast({
        title: "Success",
        description: "Agent duplicated successfully",
      })
      return newAgent
    } catch (error) {
      console.error("Error duplicating agent:", error)
      toast({
        title: "Error",
        description: "Failed to duplicate agent",
        variant: "destructive",
      })
      return null
    } finally {
      setIsLoading(false)
    }
  }, [user])

  const deleteExistingAgent = useCallback(async (agentId: string) => {
    if (!user) return false
    
    try {
      setIsLoading(true)
      await deleteAgent(agentId)
      setAgents((prev) => prev.filter((agent) => agent.id !== agentId))
      if (currentAgent?.id === agentId) {
        setCurrentAgent(null)
      }
      toast({
        title: "Success",
        description: "Agent deleted successfully",
      })
      return true
    } catch (error) {
      console.error("Error deleting agent:", error)
      toast({
        title: "Error",
        description: "Failed to delete agent",
        variant: "destructive",
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }, [user, currentAgent])

  // Use a more stable setCurrentAgent implementation
  const setCurrentAgentWithStableRef = useCallback((agent: Agent | null) => {
    setCurrentAgent(agent);
  }, []);

  // Load agents on initial mount if user is logged in
  useEffect(() => {
    if (user) {
      loadAgents()
    }
  }, [user, loadAgents])

  return {
    agents,
    currentAgent,
    isLoading,
    error,
    loadAgents,
    getAgent,
    createAgent: createNewAgent,
    updateAgent: updateExistingAgent,
    duplicateAgent: duplicateExistingAgent,
    deleteAgent: deleteExistingAgent,
    setCurrentAgent: setCurrentAgentWithStableRef,
  }
} 