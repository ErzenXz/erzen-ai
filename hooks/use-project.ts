"use client";

import React, {
  useState,
  useCallback,
  useMemo,
  useContext,
  createContext,
  useEffect,
} from "react";
import type {
  Project,
  ProjectFile,
  SingleProjectThread as BaseSingleProjectThread,
  CurrentVersion,
  Message,
} from "@/lib/types";
import { nanoid } from "nanoid";
import { toast } from "@/hooks/use-toast";
import {
  fetchProject,
  fetchProjectFiles,
  createProjectFile,
  updateProjectFile,
  fetchProjectFileVersions,
  revertProjectFileVersion,
  updateProject,
  deleteProject,
  processAgentInstruction,
  fetchProjectFile,
  createProject as apiCreateProject,
  fetchThreadMessages,
} from "@/lib/api";

// Extend the base thread type to include messages
interface SingleProjectThread extends BaseSingleProjectThread {
  messages?: Message[];
}

// Extend the Project type to include files array
interface ProjectWithFiles extends Project {
  files: string[];
}

// Extend ProjectFile to include content
interface ProjectFileWithContent extends ProjectFile {
  content?: string;
  language?: string;
  isFolder?: boolean;
}

interface ProjectContextValue {
  projects: ProjectWithFiles[];
  projectFiles: ProjectFileWithContent[];
  currentProject: ProjectWithFiles | null;
  isLoading: boolean;
  error: string | null;
  createProject: (name: string, description: string) => Promise<void>;
  loadProjects: () => Promise<void>;
  setCurrentProject: (projectId: string) => void;
  saveFile: (path: string, content: string) => Promise<void>;
  loadFile: (path: string) => Promise<ProjectFileWithContent | undefined>;
  createFile: (
    path: string,
    content: string,
    language?: string
  ) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  renameFile: (oldPath: string, newPath: string) => Promise<void>;
  // Update thread types in context value
  currentThread: SingleProjectThread | null;
  setCurrentThread: (thread: SingleProjectThread | null) => void;
  loadThread: (threadId: string) => Promise<SingleProjectThread | null>;
  threads: SingleProjectThread[];
  projectThreads: SingleProjectThread[];
  selectProjectThread: (threadId: string | null) => Promise<void>;
  // Add new methods
  fetchFileVersions: (filePath: string) => Promise<CurrentVersion[]>;
  revertToVersion: (filePath: string, versionNumber: number) => Promise<void>;
  processAIInstruction: (
    instruction: string,
    threadId?: string
  ) => Promise<any>;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(
  undefined
);

interface ProjectProviderProps {
  children: React.ReactNode;
  initialProjectId?: string;
}

export function ProjectProvider({
  children,
  initialProjectId,
}: ProjectProviderProps) {
  const [projects, setProjects] = useState<ProjectWithFiles[]>([]);
  const [projectFiles, setProjectFiles] = useState<ProjectFileWithContent[]>(
    []
  );
  const [currentProject, setCurrentProjectState] =
    useState<ProjectWithFiles | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Add state for threads
  const [threads, setThreads] = useState<SingleProjectThread[]>([]);
  const [projectThreads, setProjectThreads] = useState<SingleProjectThread[]>(
    []
  );
  const [currentThread, setCurrentThread] =
    useState<SingleProjectThread | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // In a real app, this would be an API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      // No-op for now since we're using demo data
      setIsLoading(false);
    } catch (err) {
      setError("Failed to load projects");
      console.error(err);
    }
  }, []);

  // Load initial project data if initialProjectId is provided
  useEffect(() => {
    if (initialProjectId) {
      const loadInitialProject = async () => {
        setIsLoading(true);
        try {
          const project = await fetchProject(initialProjectId);
          const files = await fetchProjectFiles(initialProjectId);

          // Convert SingleProjectFile[] to string[] by extracting file IDs
          setCurrentProjectState({
            ...project,
            files: project.files.map((f) => f.id),
          });

          // Convert files to ProjectFileWithContent[]
          const filesWithContent = Array.isArray(files) ? files : [files];
          setProjectFiles(
            filesWithContent.map((f) => ({
              ...f,
              content: f.currentVersion?.content,
            }))
          );

          // Set project threads from the project data
          if (project.threads) {
            setProjectThreads(project.threads);
          }

          setError(null);
        } catch (err) {
          setError("Failed to load project");
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      };

      loadInitialProject();
    }
  }, [initialProjectId]);

  // Add demo threads for testing
  useEffect(() => {
    if (currentProject && projectThreads.length === 0) {
      const demoThreads: SingleProjectThread[] = [
        {
          id: "1",
          title: "Getting Started",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          userId: "user-1",
          projectId: currentProject.id,
        },
        {
          id: "2",
          title: "Bug Fixes",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          userId: "user-1",
          projectId: currentProject.id,
        },
        {
          id: "3",
          title: "Feature Discussion",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          userId: "user-1",
          projectId: currentProject.id,
        },
      ];
      setProjectThreads(demoThreads);
    }
  }, [currentProject, projectThreads.length]);

  const createProject = useCallback(
    async (name: string, description: string) => {
      setIsLoading(true);
      try {
        // Call the real API to create a project
        const newProject = await apiCreateProject({
          name,
          description,
        });

        // Convert to ProjectWithFiles format
        const projectWithFiles: ProjectWithFiles = {
          ...newProject,
          files: [],
        };

        setProjects((prev) => [...prev, projectWithFiles]);
        setCurrentProjectState(projectWithFiles);
        setError(null);

        // Create initial files
        const readmeContent = `# ${name}\n\n${description}\n\nCreated on ${new Date().toLocaleDateString()}`;

        try {
          await createProjectFile(projectWithFiles.id, {
            name: "README.md",
            path: "README.md",
            content: readmeContent,
            commitMsg: "Initial commit",
          });

          // Refresh file list
          const files = await fetchProjectFiles(projectWithFiles.id);
          const filesWithContent = Array.isArray(files) ? files : [files];
          setProjectFiles(
            filesWithContent.map((f) => ({
              ...f,
              content: f.currentVersion?.content,
            }))
          );
        } catch (err) {
          console.error("Failed to create initial files:", err);
        }
      } catch (err) {
        setError("Failed to create project");
        console.error(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const setCurrentProject = useCallback(
    (projectId: string) => {
      const project = projects.find((p) => p.id === projectId);
      if (project) {
        setCurrentProjectState(project);
      }
    },
    [projects]
  );

  const saveFile = useCallback(
    async (path: string, content: string) => {
      if (!currentProject) {
        toast({
          title: "Error",
          description: "No project selected",
          variant: "destructive",
        });
        return;
      }

      try {
        const fileToSave = projectFiles.find((file) => file.path === path);
        if (!fileToSave) {
          throw new Error("File not found");
        }

        // Use the real API to update the file
        await updateProjectFile(currentProject.id, fileToSave.id, {
          content: content,
          commitMsg: `Updated ${path}`,
        });

        // Update local state
        setProjectFiles((prev) =>
          prev.map((file) => (file.path === path ? { ...file, content } : file))
        );

        // Update project's updatedAt
        setProjects((prev) =>
          prev.map((p) =>
            p.id === currentProject.id
              ? { ...p, updatedAt: new Date().toISOString() }
              : p
          )
        );
      } catch (err) {
        console.error("Failed to save file:", err);
        toast({
          title: "Error saving file",
          description: "Failed to save file. Please try again.",
          variant: "destructive",
        });
        throw err;
      }
    },
    [currentProject, projectFiles]
  );

  const loadFile = useCallback(
    async (path: string) => {
      if (!currentProject) {
        toast({
          title: "Error",
          description: "No project selected",
          variant: "destructive",
        });
        return undefined;
      }

      try {
        // First check if file is already in local state
        const existingFile = projectFiles.find((file) => file.path === path);
        if (existingFile && existingFile.content !== undefined) {
          return existingFile;
        }

        // If not found or content not loaded, fetch from API
        const fileId = projectFiles.find((file) => file.path === path)?.id;
        if (!fileId) {
          throw new Error("File not found");
        }

        const fileData = await fetchProjectFile(currentProject.id, fileId);

        // Update local state with fetched file
        const updatedFile = {
          ...fileData,
          content: fileData.currentVersion?.content,
        };

        setProjectFiles((prev) =>
          prev.map((file) => (file.id === fileId ? updatedFile : file))
        );

        return updatedFile;
      } catch (err) {
        console.error("Failed to load file:", err);
        toast({
          title: "Error loading file",
          description: "Failed to load file. Please try again.",
          variant: "destructive",
        });
        throw err;
      }
    },
    [currentProject, projectFiles]
  );

  const createFile = useCallback(
    async (path: string, content: string, language?: string) => {
      if (!currentProject) {
        toast({
          title: "Error",
          description: "No project selected",
          variant: "destructive",
        });
        return;
      }

      try {
        const filename = path.split("/").pop() || path;

        // Use the real API to create the file
        await createProjectFile(currentProject.id, {
          name: filename,
          path: path,
          content: content,
          commitMsg: `Created ${filename}`,
        });

        // Refresh file list to get the created file with its ID
        const files = await fetchProjectFiles(currentProject.id);
        const filesWithContent = Array.isArray(files) ? files : [files];
        setProjectFiles(
          filesWithContent.map((f) => ({
            ...f,
            content: f.currentVersion?.content,
            language: language,
          }))
        );

        // Update project's updatedAt
        setProjects((prev) =>
          prev.map((p) =>
            p.id === currentProject.id
              ? {
                  ...p,
                  updatedAt: new Date().toISOString(),
                  _count: {
                    files: p._count ? p._count.files + 1 : 1,
                    threads: p._count?.threads || 0,
                    collaborators: p._count?.collaborators || 0,
                  },
                }
              : p
          )
        );
      } catch (err) {
        console.error("Failed to create file:", err);
        toast({
          title: "Error creating file",
          description: "Failed to create file. Please try again.",
          variant: "destructive",
        });
        throw err;
      }
    },
    [currentProject]
  );

  const deleteFile = useCallback(
    async (path: string) => {
      if (!currentProject) {
        toast({
          title: "Error",
          description: "No project selected",
          variant: "destructive",
        });
        return;
      }

      try {
        const fileToDelete = projectFiles.find((file) => file.path === path);
        if (!fileToDelete) {
          throw new Error("File not found");
        }

        // Use the updateProjectFile API with isDeleted flag
        await updateProjectFile(currentProject.id, fileToDelete.id, {
          commitMsg: `Deleted ${path}`,
        });

        // Remove file from local state
        setProjectFiles((prev) => prev.filter((file) => file.path !== path));

        // Update project's updatedAt and file count
        setProjects((prev) =>
          prev.map((p) =>
            p.id === currentProject.id
              ? {
                  ...p,
                  updatedAt: new Date().toISOString(),
                  _count: {
                    files: p._count ? Math.max(0, p._count.files - 1) : 0,
                    threads: p._count?.threads || 0,
                    collaborators: p._count?.collaborators || 0,
                  },
                }
              : p
          )
        );
      } catch (err) {
        console.error("Failed to delete file:", err);
        toast({
          title: "Error deleting file",
          description: "Failed to delete file. Please try again.",
          variant: "destructive",
        });
        throw err;
      }
    },
    [currentProject, projectFiles]
  );

  const renameFile = useCallback(
    async (oldPath: string, newPath: string) => {
      if (!currentProject) {
        toast({
          title: "Error",
          description: "No project selected",
          variant: "destructive",
        });
        return;
      }

      try {
        const fileToRename = projectFiles.find((file) => file.path === oldPath);
        if (!fileToRename) {
          throw new Error("File not found");
        }

        const oldName = oldPath.split("/").pop() || oldPath;
        const newName = newPath.split("/").pop() || newPath;

        // Use the updateProjectFile API for rename
        await updateProjectFile(currentProject.id, fileToRename.id, {
          commitMsg: `Renamed ${oldName} to ${newName}`,
        });

        // Create a new file with the new path
        const content = fileToRename.content || "";
        await createFile(newPath, content, fileToRename.language);

        // Delete the old file (update local state only, server already handled the rename)
        setProjectFiles((prev) => prev.filter((file) => file.path !== oldPath));

        // Update project's updatedAt
        setProjects((prev) =>
          prev.map((p) =>
            p.id === currentProject.id
              ? { ...p, updatedAt: new Date().toISOString() }
              : p
          )
        );
      } catch (err) {
        console.error("Failed to rename file:", err);
        toast({
          title: "Error renaming file",
          description: "Failed to rename file. Please try again.",
          variant: "destructive",
        });
        throw err;
      }
    },
    [currentProject, projectFiles, createFile]
  );

  // Add method for fetching file versions
  const fetchFileVersions = useCallback(
    async (filePath: string): Promise<CurrentVersion[]> => {
      if (!currentProject) {
        toast({
          title: "Error",
          description: "No project selected",
          variant: "destructive",
        });
        return [];
      }

      try {
        const file = projectFiles.find((f) => f.path === filePath);
        if (!file) {
          throw new Error("File not found");
        }

        const versions = await fetchProjectFileVersions(
          currentProject.id,
          file.id
        );
        return versions;
      } catch (err) {
        console.error("Failed to fetch file versions:", err);
        toast({
          title: "Error fetching versions",
          description: "Failed to load file version history.",
          variant: "destructive",
        });
        throw err;
      }
    },
    [currentProject, projectFiles]
  );

  // Add method for reverting to a specific version
  const revertToVersion = useCallback(
    async (filePath: string, versionNumber: number): Promise<void> => {
      if (!currentProject) {
        toast({
          title: "Error",
          description: "No project selected",
          variant: "destructive",
        });
        return;
      }

      try {
        const file = projectFiles.find((f) => f.path === filePath);
        if (!file) {
          throw new Error("File not found");
        }

        // Use the API to revert the file
        await revertProjectFileVersion(currentProject.id, file.id, {
          version: versionNumber,
          commitMsg: `Reverted to version ${versionNumber}`,
        });

        // Reload the file to get the reverted content
        const updatedFile = await loadFile(filePath);
        if (updatedFile) {
          // Update file in local state
          setProjectFiles((prev) =>
            prev.map((f) => (f.id === file.id ? updatedFile : f))
          );
        }

        toast({
          title: "Version restored",
          description: `File reverted to version ${versionNumber}.`,
        });
      } catch (err) {
        console.error("Failed to revert version:", err);
        toast({
          title: "Error reverting version",
          description: "Failed to revert to the selected version.",
          variant: "destructive",
        });
        throw err;
      }
    },
    [currentProject, projectFiles, loadFile]
  );

  // Add method for processing AI agent instructions
  const processAIInstruction = useCallback(
    async (instruction: string, threadId?: string): Promise<any> => {
      if (!currentProject) {
        toast({
          title: "Error",
          description: "No project selected",
          variant: "destructive",
        });
        return;
      }

      try {
        const result = await processAgentInstruction(
          currentProject.id,
          instruction,
          threadId
        );

        // Refresh files after AI makes changes
        const files = await fetchProjectFiles(currentProject.id);
        const filesWithContent = Array.isArray(files) ? files : [files];
        setProjectFiles(
          filesWithContent.map((f) => ({
            ...f,
            content: f.currentVersion?.content,
          }))
        );

        return result;
      } catch (err) {
        console.error("Failed to process AI instruction:", err);
        toast({
          title: "Error",
          description: "Failed to process your instruction. Please try again.",
          variant: "destructive",
        });
        throw err;
      }
    },
    [currentProject]
  );

  // Load a thread by ID
  const loadThread = useCallback(
    async (threadId: string) => {
      // Basic implementation - find thread locally
      const thread = projectThreads.find((t) => t.id === threadId);
      return thread || null;
    },
    [projectThreads]
  );

  const selectProjectThread = useCallback(
    async (threadId: string | null) => {
      if (threadId) {
        const thread = projectThreads.find((t) => t.id === threadId);
        if (thread) {
          // Check if messages are already loaded or need fetching
          if (!thread.messages && currentProject?.id) {
            try {
              setIsLoading(true); // Indicate loading state
              // Call fetchThreadMessages with only threadId
              const rawMessages: any[] = await fetchThreadMessages(threadId); // Add : any[] type for now
              // Convert createdAt strings to Date objects and assign to timestamp
              const messagesWithDates = rawMessages.map((msg) => ({
                ...msg,
                timestamp: new Date(msg.createdAt), // Use createdAt for the timestamp
              }));
              const threadWithMessages = {
                ...thread,
                messages: messagesWithDates,
              }; // Use converted messages
              setCurrentThread(threadWithMessages);
              // Update the thread in the main projectThreads array as well
              setProjectThreads((prev) =>
                prev.map((t) => (t.id === threadId ? threadWithMessages : t))
              );
              setError(null);
            } catch (err) {
              console.error("Failed to fetch thread messages:", err);
              setError("Failed to load messages for this thread.");
              setCurrentThread(thread); // Set thread even if messages fail
            } finally {
              setIsLoading(false);
            }
          } else {
            // Messages already loaded or no project context, just set the thread
            setCurrentThread(thread);
          }
        } else {
          setCurrentThread(null);
        }
      } else {
        setCurrentThread(null);
      }
    },
    [projectThreads, currentProject?.id] // Add currentProject?.id dependency
  );

  const value = useMemo<ProjectContextValue>(
    () => ({
      projects,
      projectFiles,
      currentProject,
      isLoading,
      error,
      createProject,
      loadProjects,
      setCurrentProject,
      saveFile,
      loadFile,
      createFile,
      deleteFile,
      renameFile,
      // Add new methods
      fetchFileVersions,
      revertToVersion,
      processAIInstruction,
      // Thread-related functionality
      currentThread,
      setCurrentThread,
      loadThread,
      threads,
      projectThreads,
      selectProjectThread,
    }),
    [
      projects,
      projectFiles,
      currentProject,
      isLoading,
      error,
      createProject,
      loadProjects,
      setCurrentProject,
      saveFile,
      loadFile,
      createFile,
      deleteFile,
      renameFile,
      // Add new methods
      fetchFileVersions,
      revertToVersion,
      processAIInstruction,
      // Thread-related functionality
      currentThread,
      setCurrentThread,
      loadThread,
      threads,
      projectThreads,
      selectProjectThread,
    ]
  );

  return React.createElement(ProjectContext.Provider, { value }, children);
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}
