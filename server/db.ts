import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Conversation and message queries
export async function getUserConversations(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const { conversations: conversationsTable } = await import("../drizzle/schema");
  return await db.select().from(conversationsTable).where(eq(conversationsTable.userId, userId));
}

export async function getConversationWithMessages(conversationId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;

  const { conversations: conversationsTable, messages: messagesTable } = await import("../drizzle/schema");
  const conversation = await db.select().from(conversationsTable).where(eq(conversationsTable.id, conversationId)).limit(1);

  if (!conversation || conversation.length === 0 || conversation[0].userId !== userId) {
    return null;
  }

  const msgs = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, conversationId));

  return { conversation: conversation[0], messages: msgs };
}

export async function createConversation(userId: number, title: string, description?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { conversations: conversationsTable } = await import("../drizzle/schema");
  const result = await db.insert(conversationsTable).values({
    userId,
    title,
    description,
  });

  return result;
}

export async function addMessage(conversationId: number, role: "user" | "assistant", content: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { messages: messagesTable } = await import("../drizzle/schema");
  return await db.insert(messagesTable).values({
    conversationId,
    role,
    content,
  });
}

export async function deleteConversation(conversationId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { conversations: conversationsTable, messages: messagesTable } = await import("../drizzle/schema");
  
  const conversation = await db.select().from(conversationsTable).where(eq(conversationsTable.id, conversationId)).limit(1);
  if (!conversation || conversation.length === 0 || conversation[0].userId !== userId) {
    throw new Error("Unauthorized");
  }

  await db.delete(messagesTable).where(eq(messagesTable.conversationId, conversationId));
  await db.delete(conversationsTable).where(eq(conversationsTable.id, conversationId));
}
