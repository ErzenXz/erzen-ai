"use client";

import { openDB, DBSchema, IDBPDatabase } from "idb";
import { AIModel, ChatThread, Message } from "./types";

interface ChatDB extends DBSchema {
  threads: {
    key: string;
    value: ChatThread;
    indexes: { "by-updated": string };
  };
  messages: {
    key: string;
    value: Message;
    indexes: { "by-thread": string };
  };
  models: {
    key: string;
    value: AIModel;
  };
}

const DB_NAME = "chat_db";
const DB_VERSION = 1;

class DatabaseService {
  private db: Promise<IDBPDatabase<ChatDB>> | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.db = this.initDB();
    }
  }

  private async initDB() {
    if (!this.db) {
      this.db = openDB<ChatDB>(DB_NAME, DB_VERSION, {
        upgrade(db: any) {
          // Create threads store with index
          if (!db.objectStoreNames.contains("threads")) {
            const threadStore = db.createObjectStore("threads", {
              keyPath: "id",
            });
            threadStore.createIndex("by-updated", "updatedAt");
          }

          // Create messages store with index
          if (!db.objectStoreNames.contains("messages")) {
            const messageStore = db.createObjectStore("messages", {
              keyPath: "id",
            });
            messageStore.createIndex("by-thread", "chatId");
          }

          // Create models store
          if (!db.objectStoreNames.contains("models")) {
            db.createObjectStore("models", { keyPath: "model" });
          }
        },
      });
    }
    return this.db;
  }

  // Thread operations
  async getThreads(
    page: number = 1,
    limit: number = 10
  ): Promise<ChatThread[]> {
    if (!this.db) return [];

    try {
      const db = await this.db;
      const tx = db.transaction("threads", "readonly");
      const index = tx.store.index("by-updated");

      // Get all threads sorted by updatedAt in descending order
      const allThreads = await index.getAll();

      // Sort threads by updatedAt in descending order (newest first)
      allThreads.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedThreads = allThreads.slice(startIndex, endIndex);

      await tx.done;
      return paginatedThreads;
    } catch (error) {
      console.error("Error getting threads:", error);
      return [];
    }
  }

  async getAllThreads(): Promise<ChatThread[]> {
    if (!this.db) return [];

    try {
      const db = await this.db;
      const threads = await db.getAll("threads");

      // Sort threads by updatedAt in descending order (newest first)
      return threads.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    } catch (error) {
      console.error("Error getting all threads:", error);
      return [];
    }
  }

  async getThread(threadId: string): Promise<ChatThread | undefined> {
    if (!this.db) return undefined;

    try {
      const db = await this.db;
      return await db.get("threads", threadId);
    } catch (error) {
      console.error(`Error getting thread ${threadId}:`, error);
      return undefined;
    }
  }

  async saveThread(thread: ChatThread): Promise<void> {
    if (!this.db) return;

    try {
      const db = await this.db;
      await db.put("threads", thread);
    } catch (error) {
      console.error("Error saving thread:", error);
    }
  }

  async saveThreads(threads: ChatThread[]): Promise<void> {
    if (!this.db) return;

    try {
      const db = await this.db;
      const tx = db.transaction("threads", "readwrite");
      await Promise.all([
        ...threads.map((thread) => tx.store.put(thread)),
        tx.done,
      ]);
    } catch (error) {
      console.error("Error saving threads:", error);
    }
  }

  async deleteThread(threadId: string): Promise<void> {
    if (!this.db) return;

    try {
      const db = await this.db;
      // Delete thread
      await db.delete("threads", threadId);

      // Delete all messages associated with this thread
      const messagesIndex = db.transaction("messages").store.index("by-thread");
      const threadMessages = await messagesIndex.getAll(threadId);

      if (threadMessages.length > 0) {
        const tx = db.transaction("messages", "readwrite");
        await Promise.all([
          ...threadMessages.map((msg) => tx.store.delete(msg.id)),
          tx.done,
        ]);
      }
    } catch (error) {
      console.error("Error deleting thread:", error);
    }
  }

  async searchThreads(query: string): Promise<ChatThread[]> {
    if (!this.db) return [];

    try {
      const db = await this.db;
      const threads = await db.getAll("threads");
      const searchTerm = query.toLowerCase();

      return threads
        .filter(
          (thread: ChatThread) =>
            thread.title?.toLowerCase().includes(searchTerm) ||
            thread.messages?.some((msg) =>
              msg.content.toLowerCase().includes(searchTerm)
            )
        )
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
    } catch (error) {
      console.error("Error searching threads:", error);
      return [];
    }
  }

  // Message operations
  async getMessages(threadId: string): Promise<Message[]> {
    if (!this.db) return [];

    try {
      const db = await this.db;
      const messages = await db.getAllFromIndex(
        "messages",
        "by-thread",
        threadId
      );

      return messages.sort((a, b) => {
        const timeA =
          a.timestamp instanceof Date
            ? a.timestamp.getTime()
            : new Date(a.timestamp).getTime();
        const timeB =
          b.timestamp instanceof Date
            ? b.timestamp.getTime()
            : new Date(b.timestamp).getTime();
        return timeA - timeB;
      });
    } catch (error) {
      console.error(`Error getting messages for thread ${threadId}:`, error);
      return [];
    }
  }

  async saveMessage(message: Message & { chatId: string }): Promise<void> {
    if (!this.db) return;

    try {
      const db = await this.db;
      await db.put("messages", message);

      // Update the thread's updatedAt timestamp
      if (message.chatId && message.chatId !== "new") {
        const thread = await this.getThread(message.chatId);
        if (thread) {
          thread.updatedAt = new Date().toISOString();
          await this.saveThread(thread);
        }
      }
    } catch (error) {
      console.error("Error saving message:", error);
    }
  }

  async saveMessages(
    messages: (Message & { chatId: string })[]
  ): Promise<void> {
    if (!this.db || messages.length === 0) return;

    try {
      const db = await this.db;
      const tx = db.transaction("messages", "readwrite");

      // Group messages by chatId
      const messagesByChatId = messages.reduce((acc, msg) => {
        if (msg.chatId && msg.chatId !== "new") {
          if (!acc[msg.chatId]) acc[msg.chatId] = [];
          acc[msg.chatId].push(msg);
        }
        return acc;
      }, {} as Record<string, (Message & { chatId: string })[]>);

      await Promise.all([
        ...messages.map((message) => tx.store.put(message)),
        tx.done,
      ]);

      // Update the updatedAt timestamp for each thread
      for (const chatId in messagesByChatId) {
        if (messagesByChatId[chatId].length > 0) {
          const thread = await this.getThread(chatId);
          if (thread) {
            thread.updatedAt = new Date().toISOString();
            await this.saveThread(thread);
          }
        }
      }
    } catch (error) {
      console.error("Error saving messages:", error);
    }
  }

  async deleteMessagesForThread(threadId: string): Promise<void> {
    if (!this.db) return;

    try {
      const db = await this.db;
      const messagesIndex = db.transaction("messages").store.index("by-thread");
      const threadMessages = await messagesIndex.getAll(threadId);

      if (threadMessages.length > 0) {
        const tx = db.transaction("messages", "readwrite");
        await Promise.all([
          ...threadMessages.map((msg) => tx.store.delete(msg.id)),
          tx.done,
        ]);
      }
    } catch (error) {
      console.error(`Error deleting messages for thread ${threadId}:`, error);
    }
  }

  // Model operations
  async getModels(): Promise<AIModel[]> {
    if (!this.db) return [];

    try {
      const db = await this.db;
      return db.getAll("models");
    } catch (error) {
      console.error("Error getting models:", error);
      return [];
    }
  }

  async saveModels(models: AIModel[]): Promise<void> {
    if (!this.db) return;

    try {
      const db = await this.db;
      const tx = db.transaction("models", "readwrite");
      await Promise.all([
        ...models.map((model) => tx.store.put(model)),
        tx.done,
      ]);
    } catch (error) {
      console.error("Error saving models:", error);
    }
  }

  // DB maintenance
  async clearAllData(): Promise<void> {
    if (!this.db) return;

    try {
      const db = await this.db;
      await db.clear("threads");
      await db.clear("messages");
      await db.clear("models");
    } catch (error) {
      console.error("Error clearing database:", error);
    }
  }
}

export const db = new DatabaseService();
