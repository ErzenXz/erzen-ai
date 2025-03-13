import {
  AIModel,
  AuthResponse,
  UserInfo,
  ChatThread,
  ChatMemory,
  UserInstruction,
  Message,
  SingleProject,
  Project,
  ProjectFile,
  ProjectFileCreateDto,
  CurrentVersion,
} from "./types";

const API_BASE_URL = "https://apis.erzen.tk";

class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Helper to check if code is running in browser environment
const isBrowser = typeof window !== "undefined";

// Safe localStorage access functions with debug logging
const getStorageItem = (key: string): string | null => {
  if (isBrowser) {
    const value = localStorage.getItem(key);
    console.debug(
      `[TokenManager] Reading ${key}: ${value ? "exists" : "not found"}`
    );
    return value;
  }
  return null;
};

const setStorageItem = (key: string, value: string): void => {
  if (isBrowser) {
    console.debug(`[TokenManager] Setting ${key}`);
    localStorage.setItem(key, value);
  }
};

// Event manager for token refresh events
class TokenEventManager {
  private listeners: (() => void)[] = [];

  addListener(callback: () => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(
        (listener) => listener !== callback
      );
    };
  }

  notifyRefresh() {
    console.debug(
      `[TokenManager] Notifying ${this.listeners.length} listeners of token refresh`
    );
    this.listeners.forEach((callback) => callback());
  }
}

// Create a singleton event manager
const tokenEventManager = new TokenEventManager();

// Token manager to handle token refreshing and expiration
class TokenManager {
  private refreshPromise: Promise<boolean> | null = null;
  private tokenExpiration: number = 0;
  private refreshBuffer = 2 * 60 * 1000; // 2 minutes in milliseconds
  private lastRefreshAttempt: number = 0;
  private minRefreshInterval = 10 * 1000; // Minimum 10 seconds between refresh attempts

  constructor() {
    if (isBrowser) {
      this.loadTokenExpiration();

      // Set up periodic token check every minute
      setInterval(() => {
        this.checkAndRefreshToken();
      }, 60 * 1000);

      // Do an immediate check
      setTimeout(() => this.checkAndRefreshToken(), 1000);

      console.debug("[TokenManager] Initialized");
    }
  }

  private async checkAndRefreshToken() {
    if (this.isTokenExpiringSoon() && isBrowser) {
      console.debug("[TokenManager] Token is expiring soon, refreshing...");
      await this.refreshTokenIfNeeded();
    }
  }

  private loadTokenExpiration() {
    const expiration = getStorageItem("tokenExpiration");
    this.tokenExpiration = expiration ? parseInt(expiration, 10) : 0;
    console.debug(
      `[TokenManager] Loaded token expiration: ${new Date(
        this.tokenExpiration
      ).toISOString()}`
    );
  }

  private saveTokenExpiration(expiresIn: number) {
    // Calculate expiration time in milliseconds since epoch
    const expirationTime = Date.now() + expiresIn * 1000;
    setStorageItem("tokenExpiration", expirationTime.toString());
    this.tokenExpiration = expirationTime;
    console.debug(
      `[TokenManager] Saved token expiration: ${new Date(
        expirationTime
      ).toISOString()}`
    );
  }

  async getValidToken(): Promise<string | null> {
    // Return null immediately if not in browser
    if (!isBrowser) return null;

    const token = getStorageItem("accessToken");

    // If no token or token is about to expire, refresh it
    if (!token || this.isTokenExpiringSoon()) {
      console.debug(
        `[TokenManager] Token is ${
          !token ? "missing" : "expiring soon"
        }, refreshing...`
      );
      const refreshed = await this.refreshTokenIfNeeded();
      if (!refreshed) {
        console.error("[TokenManager] Failed to refresh token");
        return null;
      }
      return getStorageItem("accessToken");
    }

    return token;
  }

  isTokenExpiringSoon(): boolean {
    const willExpireSoon =
      Date.now() + this.refreshBuffer > this.tokenExpiration;
    if (willExpireSoon) {
      console.debug(
        `[TokenManager] Token will expire soon. Current time: ${new Date().toISOString()}, Expiration: ${new Date(
          this.tokenExpiration
        ).toISOString()}`
      );
    }
    return willExpireSoon;
  }

  async refreshTokenIfNeeded(): Promise<boolean> {
    // Return false immediately if not in browser
    if (!isBrowser) return false;

    // If token is not expiring soon, no need to refresh
    if (!this.isTokenExpiringSoon() && getStorageItem("accessToken")) {
      return true;
    }

    // Prevent too frequent refresh attempts
    const now = Date.now();
    if (now - this.lastRefreshAttempt < this.minRefreshInterval) {
      console.debug(
        `[TokenManager] Skipping refresh, attempted too recently (${
          (now - this.lastRefreshAttempt) / 1000
        }s ago)`
      );
      return this.refreshPromise !== null; // Return true if there's an ongoing refresh
    }

    this.lastRefreshAttempt = now;

    // If a refresh is already in progress, wait for it
    if (this.refreshPromise) {
      console.debug("[TokenManager] Refresh already in progress, waiting...");
      return await this.refreshPromise;
    }

    // Start a new refresh process
    console.debug("[TokenManager] Starting new refresh process");
    this.refreshPromise = this.performRefresh();
    const result = await this.refreshPromise;
    this.refreshPromise = null;

    if (result) {
      // Notify listeners that token has been refreshed
      tokenEventManager.notifyRefresh();
    }

    return result;
  }

  // Force a refresh regardless of current token state
  async forceRefresh(): Promise<boolean> {
    if (!isBrowser) return false;

    console.debug("[TokenManager] Forcing token refresh");
    this.lastRefreshAttempt = Date.now();

    // If a refresh is already in progress, wait for it
    if (this.refreshPromise) {
      return await this.refreshPromise;
    }

    this.refreshPromise = this.performRefresh();
    const result = await this.refreshPromise;
    this.refreshPromise = null;

    if (result) {
      tokenEventManager.notifyRefresh();
    }

    return result;
  }

  private async performRefresh(): Promise<boolean> {
    try {
      console.debug("[TokenManager] Performing token refresh");
      const response = await fetch(`${API_BASE_URL}/v1/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        console.error(
          `[TokenManager] Refresh failed with status: ${response.status}`
        );
        return false;
      }

      const data: AuthResponse = await response.json();
      setStorageItem("accessToken", data.accessToken);
      setStorageItem("refreshToken", data.refreshToken);

      // Save expiration info (assuming expiresIn is in seconds)
      if (data.expiresIn) {
        this.saveTokenExpiration(data.expiresIn);
      } else {
        // Default to 1 hour if not specified
        this.saveTokenExpiration(500);
      }

      console.debug("[TokenManager] Token refreshed successfully");
      return true;
    } catch (error) {
      console.error("[TokenManager] Token refresh failed:", error);
      return false;
    }
  }

  // Register a callback for token refresh events
  onTokenRefresh(callback: () => void): () => void {
    return tokenEventManager.addListener(callback);
  }
}

// Create a singleton instance of TokenManager
const tokenManager = new TokenManager();

// Modified fetchWithAuth to use TokenManager and handle SSR
async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
  retries = 3
): Promise<Response> {
  // Skip auth for server-side requests and just make the request without auth
  if (!isBrowser) {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        "Content-Type": "application/json",
      },
    });
  }

  // Get a valid token before making the request
  const token = await tokenManager.getValidToken();

  if (!token) {
    console.error(
      "[API] No valid authentication token available. Attempting force refresh."
    );
    const refreshSucceeded = await tokenManager.forceRefresh();
    if (!refreshSucceeded) {
      throw new APIError(
        401,
        "No valid authentication token available after refresh attempt"
      );
    }

    const newToken = getStorageItem("accessToken");
    if (!newToken) {
      throw new APIError(
        401,
        "No authentication token after successful refresh"
      );
    }
  }

  const currentToken = getStorageItem("accessToken");
  console.debug(`[API] Making authenticated request to ${url}`);

  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...options.headers,
      "Content-Type": "application/json",
      Authorization: `Bearer ${currentToken}`,
    },
  });

  if (response.status === 401 && retries > 0) {
    console.warn(
      `[API] Authentication error (401) on request to ${url}, attempting refresh...`
    );

    // Force refresh the token
    const refreshed = await tokenManager.forceRefresh();

    if (refreshed) {
      console.debug("[API] Token refreshed successfully, retrying request");
      // Retry the request with one less retry attempt
      return fetchWithAuth(url, options, retries - 1);
    } else {
      console.error("[API] Token refresh failed after 401 error");
    }

    throw new APIError(
      401,
      "Authentication failed after token refresh attempt"
    );
  }

  if (!response.ok) {
    console.error(`[API] Request failed with status ${response.status}`);
    throw new APIError(response.status, "API request failed");
  }

  return response;
}

export async function refreshToken(): Promise<boolean> {
  // Skip token refresh in SSR context
  if (!isBrowser) return false;
  return tokenManager.forceRefresh(); // Use forceRefresh for explicit refreshes
}

export function onTokenRefresh(callback: () => void): () => void {
  return tokenManager.onTokenRefresh(callback);
}

export async function fetchUserInfo(): Promise<UserInfo> {
  const response = await fetchWithAuth(`${API_BASE_URL}/v1/auth/info`);
  return response.json();
}

export async function fetchModels(): Promise<AIModel[]> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/intelligence/dev/intelligence/models`
  );
  return response.json();
}

export async function fetchThreads(
  page: number = 1,
  limit: number = 10
): Promise<ChatThread[]> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/intelligence/chat/threads?page=${page}&limit=${limit}`
  );
  return response.json();
}

export async function fetchThreadMessages(
  threadId: string
): Promise<Message[]> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/intelligence/chat/thread/${threadId}`
  );
  return response.json();
}

export async function fetchMemory(): Promise<ChatMemory[]> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/intelligence/chat/memory`
  );
  return response.json();
}

export async function deleteAllMemory(): Promise<void> {
  await fetchWithAuth(`${API_BASE_URL}/intelligence/chat/memory`, {
    method: "DELETE",
  });
}

export async function fetchInstructions(): Promise<UserInstruction[]> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/intelligence/chat/instruction`
  );
  return response.json();
}

export async function addInstruction(job: string): Promise<UserInstruction> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/intelligence/chat/instruction`,
    {
      method: "POST",
      body: JSON.stringify({ job }),
    }
  );
  return response.json();
}

export async function updateInstruction(
  id: string,
  job: string
): Promise<UserInstruction> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/intelligence/chat/instruction/${id}`,
    {
      method: "PUT",
      body: JSON.stringify({ job }),
    }
  );
  return response.json();
}

export async function deleteInstruction(id: string): Promise<void> {
  await fetchWithAuth(`${API_BASE_URL}/intelligence/chat/instruction/${id}`, {
    method: "DELETE",
  });
}

export async function streamChat(
  message: string,
  model: string,
  chatId?: string,
  useBrowserMode: boolean = false,
  reasoning: boolean = false
): Promise<{
  stream: () => AsyncGenerator<string, void, unknown>;
  cancel: () => void;
}> {
  // Ensure token is valid before starting a streaming request (only in browser)
  if (isBrowser) {
    await tokenManager.refreshTokenIfNeeded();
  }

  const endpoint = useBrowserMode
    ? `${API_BASE_URL}/intelligence/chat/stream`
    : `${API_BASE_URL}/intelligence/chat/plain/stream`;

  const bodyObj: any = { message, model, chatId };
  if (useBrowserMode && reasoning) {
    bodyObj.reasoning = true;
  }

  console.debug(`[API] Starting stream request to ${endpoint}`);
  const response = await fetchWithAuth(endpoint, {
    method: "POST",
    body: JSON.stringify(bodyObj),
  });

  if (!response.body) {
    throw new Error("Response body is null");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  return {
    stream: async function* () {
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        // Process all complete lines except the last one
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (line.startsWith("data: ")) {
            const data = line.slice(6); // Remove 'data: ' prefix
            try {
              const parsed = JSON.parse(data);
              if (parsed.content.startsWith("__CHATID__")) {
                const chatId = parsed.content.slice(10, -2); // Extract chatId
                yield JSON.stringify({ chatId });
              } else {
                yield JSON.stringify({ result: { content: parsed.content } });
              }
            } catch {
              yield data;
            }
          }
        }

        // Keep the last incomplete line in the buffer
        buffer = lines[lines.length - 1];
      }

      // Process any remaining data
      if (buffer.trim()) {
        yield buffer;
      }
    },
    cancel: () => reader.cancel(),
  };
}

export async function deleteThread(id: string): Promise<void> {
  await fetchWithAuth(`${API_BASE_URL}/intelligence/chat/thread/${id}`, {
    method: "DELETE",
  });
}

export async function duplicateThread(id: string): Promise<ChatThread> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/intelligence/chat/thread/${id}/duplicate`,
    {
      method: "POST",
    }
  );
  return response.json();
}

export async function renameThread(
  id: string,
  title: string
): Promise<ChatThread> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/intelligence/chat/thread/${id}/rename`,
    {
      method: "PUT",
      body: JSON.stringify({ name: title }),
    }
  );
  return response.json();
}

// New local API methods for XenAI backend services
const LOCAL_API_BASE = "/api";

// Test API connection
export async function testApiConnection() {
  try {
    const response = await fetch(`${LOCAL_API_BASE}/test`);
    return await response.json();
  } catch (error) {
    console.error("API test error:", error);
    throw new Error("Failed to connect to API");
  }
}

// User API methods
export async function fetchLocalUsers() {
  try {
    const response = await fetch(`${LOCAL_API_BASE}/users`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching users:", error);
    throw new Error("Failed to fetch users");
  }
}

export async function fetchLocalUser(id: string) {
  try {
    const response = await fetch(`${LOCAL_API_BASE}/users/${id}`);
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching user ${id}:`, error);
    throw error;
  }
}

export async function createLocalUser(data: { email: string; name?: string }) {
  try {
    const response = await fetch(`${LOCAL_API_BASE}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create user");
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

export async function updateLocalUser(
  id: string,
  data: { email?: string; name?: string }
) {
  try {
    const response = await fetch(`${LOCAL_API_BASE}/users/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update user");
    }

    return await response.json();
  } catch (error) {
    console.error(`Error updating user ${id}:`, error);
    throw error;
  }
}

export async function deleteLocalUser(id: string) {
  try {
    const response = await fetch(`${LOCAL_API_BASE}/users/${id}`, {
      method: "DELETE",
    });

    if (!response.ok && response.status !== 204) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to delete user");
    }

    return true;
  } catch (error) {
    console.error(`Error deleting user ${id}:`, error);
    throw error;
  }
}

export async function fetchProjects(): Promise<Project[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/intelligence/projects`);
  return response.json();
}

export async function fetchProject(projectId: string): Promise<SingleProject> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/intelligence/projects/${projectId}`
  );
  return response.json();
}

export async function updateProject(
  projectId: string,
  data: { name?: string; description?: string }
): Promise<any> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/intelligence/projects/${projectId}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to update project");
  }
  return response.json();
}

export async function deleteProject(
  projectId: string,
  data: { name?: string; description?: string }
): Promise<any> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/intelligence/projects/${projectId}`,
    {
      method: "DELETE",
    }
  );
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to update project");
  }
  return response.json();
}

export async function fetchProjectFiles(
  projectId: string
): Promise<ProjectFile> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/intelligence/projects/${projectId}/files`
  );
  return response.json();
}

export async function createProjectFile(
  projectId: string,
  data: { name: string; path: string; content: string; commitMsg: string }
): Promise<ProjectFileCreateDto> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/intelligence/projects/${projectId}/files`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to create project file");
  }
  return response.json();
}

export async function fetchProjectFile(
  projectId: string,
  fileId: string
): Promise<ProjectFile> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/intelligence/projects/${projectId}/files/${fileId}`
  );
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to fetch project file");
  }
  return response.json();
}

export async function updateProjectFile(
  projectId: string,
  fileId: string,
  data: { content?: string; commitMsg?: string }
): Promise<ProjectFile> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/intelligence/projects/${projectId}/files/${fileId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to update project file");
  }
  return response.json();
}

export async function fetchProjectFileVersions(
  projectId: string,
  fileId: string
): Promise<CurrentVersion[]> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/intelligence/projects/${projectId}/files/${fileId}/versions`
  );
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to fetch project file versions");
  }
  return response.json() as Promise<CurrentVersion[]>;
}

export async function revertProjectFileVersion(
  projectId: string,
  fileId: string,
  data: { version: number; commitMsg?: string }
): Promise<ProjectFile> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/intelligence/projects/${projectId}/files/${fileId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to update project file");
  }
  return response.json();
}

export async function processAgentInstruction(
  projectId: string,
  instruction: string,
  threadId?: string
): Promise<any> {
  const response = await fetchWithAuth(
    `${API_BASE_URL}/intelligence/projects/process-agent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instruction,
        projectId,
        threadId: threadId || undefined,
      }),
    }
  );
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to process agent instruction");
  }
  return response.json();
}
