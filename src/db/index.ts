import { drizzle } from "drizzle-orm/postgres-js";
import { desc, eq } from "drizzle-orm";
import postgres from "postgres";
import { chatsTable, messagesTable } from "@/db/schema";

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
