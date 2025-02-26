"use client";

import { openDB, DBSchema, IDBPDatabase } from "idb";
import { AIModel, ChatThread, Message } from "./types";

interface ChatDB extends DBSchema {
  threads: {
    key: string;
    value: ChatThread;
    indexes: { "by-updated": Date };
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
      const count = await db.count("threads");
      const threads = await db.getAllFromIndex(
        "threads",
        "by-updated",
        null,
        limit
      );
      // Adjust pagination logic
      const paginatedThreads = threads.slice((page - 1) * limit, page * limit);
      return threads.reverse();
    } catch (error) {
      console.error("Error getting threads:", error);
      return [];
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
      await db.delete("threads", threadId);
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
      return threads.filter(
        (thread: ChatThread) =>
          thread.title?.toLowerCase().includes(searchTerm) ||
          thread.messages?.some((msg) =>
            msg.content.toLowerCase().includes(searchTerm)
          )
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
      return db.getAllFromIndex("messages", "by-thread", threadId);
    } catch (error) {
      console.error("Error getting messages:", error);
      return [];
    }
  }

  async saveMessage(message: Message & { chatId: string }): Promise<void> {
    if (!this.db) return;

    try {
      const db = await this.db;
      await db.put("messages", message);
    } catch (error) {
      console.error("Error saving message:", error);
    }
  }

  async saveMessages(
    messages: (Message & { chatId: string })[]
  ): Promise<void> {
    if (!this.db) return;

    try {
      const db = await this.db;
      const tx = db.transaction("messages", "readwrite");
      await Promise.all([
        ...messages.map((message) => tx.store.put(message)),
        tx.done,
      ]);
    } catch (error) {
      console.error("Error saving messages:", error);
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
}

export const db = new DatabaseService();
