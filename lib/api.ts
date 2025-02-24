import {
  AIModel,
  AuthResponse,
  UserInfo,
  ChatThread,
  ChatMemory,
  UserInstruction,
  Message,
} from "./types";

const API_BASE_URL = "https://apis.erzen.tk";

class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...options.headers,
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    const refreshed = await refreshToken();
    if (refreshed) {
      return fetchWithAuth(url, options);
    }
    throw new APIError(401, "Authentication failed");
  }

  if (!response.ok) {
    throw new APIError(response.status, "API request failed");
  }

  return response;
}

export async function refreshToken(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return false;
    }

    const data: AuthResponse = await response.json();
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    return true;
  } catch (error) {
    return false;
  }
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
  const endpoint = useBrowserMode
    ? `${API_BASE_URL}/intelligence/chat/stream`
    : `${API_BASE_URL}/intelligence/chat/plain/stream`;

  const bodyObj: any = { message, model, chatId };
  if (useBrowserMode && reasoning) {
    bodyObj.reasoning = true;
  }

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
