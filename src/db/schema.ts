import { integer, pgTable, varchar, serial, date } from "drizzle-orm/pg-core";
export const chatsTable = pgTable("chats", {
  id: serial().primaryKey().primaryKey(),
  userId: integer().notNull(),
  title: varchar({ length: 255 }).notNull(),
  model: varchar({ length: 100 }).notNull(), // 使用的模型
  createdAt: date({ mode: "date" }).notNull(), //创建时间
});

export const messagesTable = pgTable("messages", {
  id: serial().primaryKey(),
  chatId: integer()
    .notNull()
    .references(() => chatsTable.id),
  role: varchar({ length: 100 }).notNull(),
  content: varchar({ length: 1000 }).notNull(),
});
