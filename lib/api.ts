import axios from "axios";
import { ChatThread } from "./types";
import type {
  AIModel,
  UserInfo,
  ChatMemory,
  UserInstruction,
  CurrentVersion,
  Message,
} from "./types";

export async function updateThreadMessage(
  threadId: string,
  messageId: string,
  data: { content: string }
) {
  await axios.patch(`/api/threads/${threadId}/messages/${messageId}`, data);
}

export async function retryThreadMessage(threadId: string, messageId: string) {
  await axios.post(`/api/threads/${threadId}/messages/${messageId}/retry`);
}

export async function branchThreadAtMessage(
  threadId: string,
  messageId: string
): Promise<ChatThread> {
  const res = await axios.post<ChatThread>(`/api/threads/${threadId}/branch`, {
    messageId,
  });
  return res.data;
}

// -----------------------------------------------------------------------------
// NEW GENERIC HELPERS (non-agent endpoints)
// These are thin wrappers around Next.js API routes. They make the client
// code compile and provide a single place to tweak the URL/shape later.
// -----------------------------------------------------------------------------

const axiosInstance = axios.create({
  // In the browser this is relative to the same origin. On the server it will
  // also work provided the URL is absolute or you proxy requests.
  baseURL: "",
  withCredentials: true,
});

/* -------------------------------------------------------------------------- */
/* User endpoints                                                              */
/* -------------------------------------------------------------------------- */
export async function fetchUserInfo(): Promise<UserInfo> {
  const res = await axiosInstance.get<UserInfo>("/api/user/info");
  return res.data;
}

/* -------------------------------------------------------------------------- */
/* Models                                                                      */
/* -------------------------------------------------------------------------- */
export async function fetchModels(): Promise<AIModel[]> {
  const res = await axiosInstance.get<AIModel[]>("/api/models");
  return res.data;
}

/* -------------------------------------------------------------------------- */
/* Usage                                                                       */
/* -------------------------------------------------------------------------- */
export async function fetchUsage(): Promise<any> {
  const res = await axiosInstance.get("/api/usage");
  return res.data;
}

/* -------------------------------------------------------------------------- */
/* Memory                                                                      */
/* -------------------------------------------------------------------------- */
export async function fetchMemory(): Promise<ChatMemory[]> {
  const res = await axiosInstance.get<ChatMemory[]>("/api/memory");
  return res.data;
}

export async function deleteAllMemory(): Promise<void> {
  await axiosInstance.delete("/api/memory");
}

/* -------------------------------------------------------------------------- */
/* Instructions                                                                */
/* -------------------------------------------------------------------------- */
export async function fetchInstructions(): Promise<UserInstruction[]> {
  const res = await axiosInstance.get<UserInstruction[]>("/api/instructions");
  return res.data;
}

export async function addInstruction(job: string): Promise<UserInstruction> {
  const res = await axiosInstance.post<UserInstruction>("/api/instructions", {
    job,
  });
  return res.data;
}

export async function updateInstruction(
  id: string,
  job: string
): Promise<UserInstruction> {
  const res = await axiosInstance.patch<UserInstruction>(
    `/api/instructions/${id}`,
    { job }
  );
  return res.data;
}

export async function deleteInstruction(id: string): Promise<void> {
  await axiosInstance.delete(`/api/instructions/${id}`);
}

/* -------------------------------------------------------------------------- */
/* Projects – file versions + CRUD                                             */
/* -------------------------------------------------------------------------- */
export async function fetchProjectFileVersions(
  projectId: string,
  fileId: string
): Promise<CurrentVersion[]> {
  const res = await axiosInstance.get<CurrentVersion[]>(
    `/api/projects/${projectId}/files/${fileId}/versions`
  );
  return res.data;
}

export async function revertProjectFileVersion(
  projectId: string,
  fileId: string,
  versionId: string
): Promise<void> {
  await axiosInstance.post(
    `/api/projects/${projectId}/files/${fileId}/versions/${versionId}/revert`
  );
}

export async function createProjectFile(
  projectId: string,
  path: string,
  content: string
): Promise<void> {
  await axiosInstance.post(`/api/projects/${projectId}/files`, {
    path,
    content,
  });
}

export async function updateProjectFile(
  projectId: string,
  fileId: string,
  content: string,
  commitMsg?: string
): Promise<void> {
  await axiosInstance.patch(`/api/projects/${projectId}/files/${fileId}`, {
    content,
    commitMsg,
  });
}

/* -------------------------------------------------------------------------- */
/* Threads – messages                                                          */
/* -------------------------------------------------------------------------- */
export async function fetchThreadMessages(
  threadId: string
): Promise<Message[]> {
  const res = await axiosInstance.get<Message[]>(
    `/api/threads/${threadId}/messages`
  );
  return res.data;
}

/* -------------------------------------------------------------------------- */
/* Text Input Completions                                                     */
/* -------------------------------------------------------------------------- */

export async function getTextInputCompletions(
  prompt: string,
  maxSuggestions: number = 10
): Promise<string[]> {
  try {
    const res = await axiosInstance.post<{ completions: string[] }>(
      "/api/completions",
      {
        prompt,
        maxSuggestions,
      }
    );
    return res.data.completions;
  } catch (error) {
    console.error("Failed to fetch completions", error);
    return [];
  }
}
