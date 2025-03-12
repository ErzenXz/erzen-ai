"use client"

import { useEffect } from "react"
import { ProjectProvider } from "@/hooks/use-project"
import { ChatThreadList } from "@/components/page/sidebar/chat-thread-list"
import { useProject } from "@/hooks/use-project"
import { ProjectWorkspace } from "@/components/project/project-workspace"

export default function ProjectsPage() {
  return (
    <ProjectProvider>
      <div className="flex h-screen bg-background">
        <ProjectSidebar />
        <main className="flex-1 overflow-hidden">
          <ProjectWorkspace />
        </main>
      </div>
    </ProjectProvider>
  )
}

function ProjectSidebar() {
  const { projects, currentProject, loadProjects, setCurrentProject, createProject } = useProject()

  // Load projects on component mount
  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  // Convert projects to ChatThread format for the sidebar
  const projectThreads = projects.map((project) => ({
    id: project.id,
    title: project.name,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    userId: "current-user", // This would come from auth in a real app
    messages: [],
    type: "project" as const,
  }))

  return (
    <ChatThreadList
      threads={projectThreads}
      currentThreadId={currentProject?.id ?? null}
      onThreadSelect={(id) => setCurrentProject(id)}
      onNewThread={() => {
        // Open project creation dialog
        // For now, just create a default project
        createProject("New Project", "Created from sidebar")
      }}
      onRenameThread={(id, newTitle) => {
        // This would update the project name in a real app
        console.log("Rename project", id, newTitle)
      }}
      onDuplicateThread={(id) => {
        // This would duplicate the project in a real app
        console.log("Duplicate project", id)
      }}
      onDeleteThread={(id) => {
        // This would delete the project in a real app
        console.log("Delete project", id)
      }}
      hasMore={false}
      searchQuery=""
      onSearchChange={() => {}}
    />
  )
}

