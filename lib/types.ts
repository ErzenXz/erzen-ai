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
