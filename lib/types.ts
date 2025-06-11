import { Message } from "ai/react";

// The base message type from the Vercel AI SDK, which can be extended
export type AppMessage = Message;

// Represents a single chat message stored in the database
export interface ChatMessage extends AppMessage {
  // Potentially add other app-specific message properties here in the future
  // For now, it matches the Vercel AI SDK's Message type
}

// Represents a full chat thread, including its messages
export interface ChatThread {
  id: string;
  title: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  userId: string;
  messages: ChatMessage[];
}

// Represents a project
export interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  userId: string;
}

export interface AIModel {
  id: string;
  name: string;
  description: string;
  model: string;
  type: string;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number; // Time in seconds until token expires
}

export interface UserInfo {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  lastLogin: string;
  multifactorEnabled: boolean;
  emailVerified: boolean;
  externalUser: boolean;
  birthdate: string;
  language: string;
  timezone: string;
  image: string;
  mainApiData: any;
}

export interface ChatMemory {
  id: string;
  userId: string;
  key: string;
  value: string;
  createdAt: string;
}

export interface UserInstruction {
  id: string;
  userId: string;
  job: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatResponse {
  result: {
    content: string;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    thinking: string;
  };
  chatId: string;
}

export interface SingleProject {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  owner: SingleProjectOwner;
  collaborators: any[];
  files: SingleProjectFile[];
  threads: SingleProjectThread[];
}

export interface SingleProjectOwner {
  id: string;
  username: string;
  email: string;
  profilePicture: string;
}

export interface SingleProjectFile {
  id: string;
  projectId: string;
  name: string;
  path: string;
  currentVersionId: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  currentVersion: SingleProjectCurrentVersion;
}

export interface SingleProjectCurrentVersion {
  id: string;
  fileId: string;
  version: number;
  content: string;
  commitMsg: string;
  authorId: string;
  createdAt: string;
  isDeleted: boolean;
}

export interface SingleProjectThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  projectId: string;
}

export interface ProjectFile {
  id: string;
  projectId: string;
  name: string;
  path: string;
  currentVersionId: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  currentVersion: CurrentVersion;
  _count?: Count;
}

export interface Author {
  id: string;
  username: string;
  email: string;
  profilePicture: string;
}

export interface CurrentVersion {
  id: string;
  fileId: string;
  version: number;
  content: string;
  commitMsg: string;
  authorId: string;
  createdAt: string;
  isDeleted: boolean;
  author?: Author;
}

export interface Count {
  versions: number;
}

export interface ProjectFileCreateDto {
  id: string;
  projectId: string;
  name: string;
  path: string;
  currentVersionId: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  currentVersion: CurrentVersion;
}

export interface Collaborator {
  id: string;
  userId: string;
  projectId: string;
  role: "owner" | "editor" | "viewer";
  joinedAt: string;
}

export interface AIInstruction {
  id: string;
  projectId: string;
  instruction: string;
  result: string;
  createdAt: string;
}

export interface Agent {
  id: string;
  name: string;
  description?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  steps?: AgentStep[];
  variables?: AgentVariable[];
  credentials?: AgentCredential[];
}

export interface AgentStep {
  id: string;
  name: string;
  description?: string;
  type: string;
  config: any;
  order: number;
  agentId: string;
  nextOnSuccess?: string;
  nextOnFailure?: string;
}

export interface AgentVariable {
  id: string;
  name: string;
  defaultValue?: string;
  description?: string;
  agentId: string;
}

export interface AgentCredential {
  id: string;
  name: string;
  type: string;
  agentId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentExecution {
  id: string;
  agentId: string;
  userId: string;
  status: "RUNNING" | "COMPLETED" | "FAILED";
  input: any;
  output?: any;
  executionPath: string[];
  startTime: string;
  endTime?: string;
  errorMessage?: string;
  tokenUsage: number;
  stepResults?: AgentStepResult[];
}

export interface AgentStepResult {
  id: string;
  stepId: string;
  executionId: string;
  status: "SUCCESS" | "FAILURE";
  input: any;
  output: any;
  startTime: string;
  endTime: string;
  errorMessage?: string;
}

export type { AppMessage as Message };
