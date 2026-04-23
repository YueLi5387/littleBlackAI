import { drizzle } from "drizzle-orm/postgres-js";
import { and, desc, eq } from "drizzle-orm";
import postgres from "postgres";
import {
  chatsTable,
  errorEventsTable,
  messagesTable,
  performanceEventsTable,
} from "@/db/schema";

// Supabase 连接池需要关闭 prepare
const client = postgres(process.env.DATABASE_URL!, { prepare: false });
export const db = drizzle(client);

// 新增一个聊天组
export const addChat = async (userId: string, title: string, model: string) => {
  const [chat] = await db
    .insert(chatsTable)
    .values({
      userId,
      title,
      model,
    })
    .returning({ id: chatsTable.id });

  if (!chat) {
    throw new Error("创建聊天组失败");
  }
  console.log("caht--->", chat);
  return chat;
};

// 查询所有聊天组
export const getAllChats = async (userId: string) => {
  return await db
    .select()
    .from(chatsTable)
    .where(eq(chatsTable.userId, userId))
    .orderBy(desc(chatsTable.createdAt));
};

// 新增一条信息
export const addMessage = async (
  chatId: number,
  role: string,
  content: string,
) => {
  const [message] = await db
    .insert(messagesTable)
    .values({
      chatId,
      role,
      content,
    })
    .returning({ id: messagesTable.id });

  if (!message) {
    throw new Error("创建消息失败");
  }

  return message;
};

// 更新聊天组标题
export const updateChatTitle = async (chatId: number, title: string) => {
  return await db
    .update(chatsTable)
    .set({ title })
    .where(eq(chatsTable.id, chatId));
};

// 查询所有信息
export const getAllMessages = async (chatId: number) => {
  return await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.chatId, chatId))
    .orderBy(messagesTable.createdAt);
};

// 根据 id 查询聊天组（用于权限校验）
export const getChatById = async (chatId: number) => {
  const [chat] = await db
    .select()
    .from(chatsTable)
    .where(eq(chatsTable.id, chatId));

  return chat ?? null;
};

// 删除指定对话中的某一条消息
export const deleteMessageById = async (chatId: number, messageId: number) => {
  const [deleted] = await db
    .delete(messagesTable)
    .where(
      and(eq(messagesTable.chatId, chatId), eq(messagesTable.id, messageId)),
    )
    .returning({ id: messagesTable.id });

  return deleted ?? null;
};

// 新增错误日志
export const addErrorEvent = async (error: any, events: any) => {
  const [event] = await db
    .insert(errorEventsTable)
    .values({
      error,
      events,
    })
    .returning({ id: errorEventsTable.id });
  return event;
};

// 获取所有错误日志
export const getAllErrorEvents = async () => {
  return await db
    .select()
    .from(errorEventsTable)
    .orderBy(desc(errorEventsTable.createdAt));
};

// 新增性能日志
export const addPerformanceEvent = async (
  userId: string | null,
  path: string,
  metrics: any,
) => {
  const [event] = await db
    .insert(performanceEventsTable)
    .values({
      userId,
      path,
      metrics,
    })
    .returning({ id: performanceEventsTable.id });
  return event;
};

// 获取所有性能日志
export const getAllPerformanceEvents = async () => {
  return await db
    .select()
    .from(performanceEventsTable)
    .orderBy(desc(performanceEventsTable.createdAt));
};

// 根据 ID 获取错误事件
export const getErrorEventById = async (id: number) => {
  const [event] = await db
    .select()
    .from(errorEventsTable)
    .where(eq(errorEventsTable.id, id));

  return event ?? null;
};
