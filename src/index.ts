import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { chatsTable, messagesTable } from "./db/schema";
import { eq } from "drizzle-orm";
import { log } from "node:console";
async function main() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle({ client });
}
main();

// 创建聊天组
export const addChat = async (
  userId: number,
  title: string,
  model: string,
  createdAt: Date,
) => {
  const res = await db.insert(chatsTable).values({
    userId,
    title,
    model,
    createdAt,
  });
  console.log("res:", res);
};

// 获取某个用户所有聊天组
export const getAllChats = async (userId: number) => {
  const res = await db
    .select()
    .from(chatsTable)
    .where(eq(chatsTable.userId, userId));
  console.log("getAllChats:", res);
};

// 获取某个特定聊天组
export const getChatById = async (chatId: number) => {
  const res = await db
    .select()
    .from(chatsTable)
    .where(eq(chatsTable.id, chatId));
  console.log("getChatById:", res);
};

// 删除聊天组
export const deleteChatById = async (chatId: number) => {
  const res = await db.delete(chatsTable).where(eq(chatsTable.id, chatId));
  console.log("deleteChatById:", res);
};

// 创建信息
export const addMessage = async (
  message: typeof messagesTable.$inferInsert,
) => {
  const res = await db.insert(messagesTable).values(message);
  console.log("addMessage:", res);
};

// 获取某个聊天组的所有信息
export const getMessagesByChatId = async (chatId: number) => {
  const res = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.chatId, chatId));
  console.log("getMessagesByChatId:", res);
};
