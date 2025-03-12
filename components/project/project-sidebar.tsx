"use client"

import * as React from "react"
import { MessageSquare, FolderIcon as FolderCode, Plus, FolderPlus, ChevronDown, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProjectCreationDialog } from "@/components/project/project-creation-dialog"
import { useProject } from "@/hooks/use-project"

export function ProjectSidebar() {
  const [showDialog, setShowDialog] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<"chats" | "projects">("chats")
  const [searchQuery, setSearchQuery] = React.useState("")
  const { projects, currentProject, loadProjects, setCurrentProject } = useProject()
  const { isMobile } = useSidebar()

  // Load projects on component mount
  React.useEffect(() => {
    loadProjects()
  }, [loadProjects])

  return (
    <Sidebar>
      <SidebarHeader className="pb-0">
        <Tabs defaultValue="chats" className="w-full" onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chats">Chats</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
          </TabsList>
        </Tabs>
      </SidebarHeader>

      <SidebarContent>
        {activeTab === "projects" ? (
          <>
            <div className="p-4 space-y-4">
              <div className="flex w-full gap-1">
                <Button className="w-2/3" onClick={() => setShowDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" /> New Project
                </Button>
                <Button className="w-1/3" variant="outline" onClick={() => setShowDialog(true)}>
                  <FolderPlus className="h-4 w-4" />
                </Button>
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  className="pl-8 h-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-1">
                <SidebarGroup>
                  <Collapsible defaultOpen className="group/collapsible">
                    <SidebarGroupLabel asChild>
                      <CollapsibleTrigger className="w-full flex justify-between">
                        Recent Projects
                        <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                      </CollapsibleTrigger>
                    </SidebarGroupLabel>
                    <CollapsibleContent>
                      <SidebarGroupContent>
                        <SidebarMenu>
                          {projects.map((project) => (
                            <SidebarMenuItem key={project.id}>
                              <SidebarMenuButton
                                isActive={currentProject?.id === project.id}
                                onClick={() => setCurrentProject(project.id)}
                              >
                                <FolderCode className="h-4 w-4 text-blue-400" />
                                <span>{project.name}</span>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
                          {projects.length === 0 && (
                            <div className="py-4 text-center text-muted-foreground text-sm">No projects yet</div>
                          )}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarGroup>

                <SidebarGroup>
                  <Collapsible defaultOpen className="group/collapsible">
                    <SidebarGroupLabel asChild>
                      <CollapsibleTrigger className="w-full flex justify-between">
                        Shared Projects
                        <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                      </CollapsibleTrigger>
                    </SidebarGroupLabel>
                    <CollapsibleContent>
                      <SidebarGroupContent>
                        <SidebarMenu>
                          <div className="py-4 text-center text-muted-foreground text-sm">No shared projects</div>
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarGroup>
              </div>
            </ScrollArea>
          </>
        ) : (
          // This is a placeholder for chat tab content
          // In the real implementation, this would be the ChatThreadList component
          <div className="py-4 text-center text-muted-foreground">Chat Threads Go Here</div>
        )}
      </SidebarContent>

      <SidebarFooter>
        <div className="p-4">
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => setActiveTab(activeTab === "chats" ? "projects" : "chats")}
          >
            {activeTab === "chats" ? (
              <>
                <FolderCode className="mr-2 h-4 w-4" />
                Switch to Projects
              </>
            ) : (
              <>
                <MessageSquare className="mr-2 h-4 w-4" />
                Switch to Chats
              </>
            )}
          </Button>
        </div>
      </SidebarFooter>

      <ProjectCreationDialog open={showDialog} onOpenChange={setShowDialog} />
    </Sidebar>
  )
}

