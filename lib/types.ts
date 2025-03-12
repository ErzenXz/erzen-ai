export interface Message {
  id: string;
  content: string;
  role: "user" | "assistant" | "model";
  timestamp: Date;
  chatId?: string;
  createdAt?: string;
  thinking?: boolean;
  thinkingContent?: string;
}

export interface ChatThread {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  messages: Message[];
}

export interface AIModel {
  id: string;
  name: string;
  description: string;
  model: string;
  type: string;
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

export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    files: number;
    threads: number;
    collaborators: number;
  };
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
