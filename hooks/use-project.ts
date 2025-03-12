"use client";

import React, {
  useState,
  useCallback,
  useMemo,
  useContext,
  createContext,
  useEffect,
} from "react";
import type { Project, ProjectFile } from "@/lib/types";
import { nanoid } from "nanoid";
import { toast } from "@/hooks/use-toast";
import { fetchProject, fetchProjectFiles } from "@/lib/api";

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

  const createProject = useCallback(
    async (name: string, description: string) => {
      setIsLoading(true);
      try {
        // In a real app, this would be an API call
        await new Promise((resolve) => setTimeout(resolve, 500));

        const newProject: ProjectWithFiles = {
          id: nanoid(),
          name,
          description,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ownerId: "", // Required by Project type
          files: [],
          _count: {
            files: 0,
            threads: 0,
            collaborators: 0,
          },
        };

        setProjects((prev) => [...prev, newProject]);
        setCurrentProjectState(newProject);
        setError(null);

        // Create initial files
        const initialFiles: ProjectFileWithContent[] = [
          {
            id: nanoid(),
            projectId: newProject.id,
            path: "README.md",
            name: "README.md",
            currentVersionId: nanoid(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isDeleted: false,
            content: `# ${name}\n\n${description}\n\nCreated on ${new Date().toLocaleDateString()}`,
            currentVersion: {
              id: nanoid(),
              fileId: nanoid(),
              version: 1,
              content: `# ${name}\n\n${description}\n\nCreated on ${new Date().toLocaleDateString()}`,
              commitMsg: "Initial commit",
              authorId: "",
              createdAt: new Date().toISOString(),
              isDeleted: false,
            },
          },
        ];

        setProjectFiles((prev) => [...prev, ...initialFiles]);

        // Update project with file references
        setProjects((prev) =>
          prev.map((p) =>
            p.id === newProject.id
              ? { ...p, files: initialFiles.map((f) => f.id) }
              : p
          )
        );
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
      try {
        // In a real app, this would be an API call
        await new Promise((resolve) => setTimeout(resolve, 300));

        setProjectFiles((prev) =>
          prev.map((file) => (file.path === path ? { ...file, content } : file))
        );

        // Update project's updatedAt
        if (currentProject) {
          setProjects((prev) =>
            prev.map((p) =>
              p.id === currentProject.id
                ? { ...p, updatedAt: new Date().toISOString() }
                : p
            )
          );
        }
      } catch (err) {
        console.error("Failed to save file:", err);
        throw err;
      }
    },
    [currentProject]
  );

  const loadFile = useCallback(
    async (path: string) => {
      try {
        // In a real app, this would be an API call
        await new Promise((resolve) => setTimeout(resolve, 100));

        return projectFiles.find((file) => file.path === path);
      } catch (err) {
        console.error("Failed to load file:", err);
        throw err;
      }
    },
    [projectFiles]
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
        // In a real app, this would be an API call
        await new Promise((resolve) => setTimeout(resolve, 300));

        const newFile: ProjectFileWithContent = {
          id: nanoid(),
          projectId: currentProject.id,
          name: path.split("/").pop() || path,
          path,
          currentVersionId: nanoid(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isDeleted: false,
          content,
          language,
          currentVersion: {
            id: nanoid(),
            fileId: nanoid(),
            version: 1,
            content,
            commitMsg: "Initial commit",
            authorId: "",
            createdAt: new Date().toISOString(),
            isDeleted: false,
          },
        };

        setProjectFiles((prev) => [...prev, newFile]);

        // Update project's files and updatedAt
        setProjects((prev) =>
          prev.map((p) =>
            p.id === currentProject.id
              ? {
                  ...p,
                  files: [...p.files, newFile.id],
                  updatedAt: new Date().toISOString(),
                }
              : p
          )
        );
      } catch (err) {
        console.error("Failed to create file:", err);
        throw err;
      }
    },
    [currentProject]
  );

  const deleteFile = useCallback(
    async (path: string) => {
      if (!currentProject) {
        return;
      }

      try {
        // In a real app, this would be an API call
        await new Promise((resolve) => setTimeout(resolve, 300));

        const fileToDelete = projectFiles.find((file) => file.path === path);
        if (!fileToDelete) {
          return;
        }

        setProjectFiles((prev) => prev.filter((file) => file.path !== path));

        // Update project's files and updatedAt
        setProjects((prev) =>
          prev.map((p) =>
            p.id === currentProject.id
              ? {
                  ...p,
                  files: p.files.filter(
                    (fileId: string) => fileId !== fileToDelete.id
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : p
          )
        );
      } catch (err) {
        console.error("Failed to delete file:", err);
        throw err;
      }
    },
    [currentProject, projectFiles]
  );

  const renameFile = useCallback(
    async (oldPath: string, newPath: string) => {
      try {
        // In a real app, this would be an API call
        await new Promise((resolve) => setTimeout(resolve, 300));

        setProjectFiles((prev) =>
          prev.map((file) =>
            file.path === oldPath ? { ...file, path: newPath } : file
          )
        );

        // Update project's updatedAt
        if (currentProject) {
          setProjects((prev) =>
            prev.map((p) =>
              p.id === currentProject.id
                ? { ...p, updatedAt: new Date().toISOString() }
                : p
            )
          );
        }
      } catch (err) {
        console.error("Failed to rename file:", err);
        throw err;
      }
    },
    [currentProject]
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
