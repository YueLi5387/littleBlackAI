import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  jsonb,
} from "drizzle-orm/pg-core";

export const chatsTable = pgTable(
  "chats",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 128 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    model: varchar("model", { length: 100 }).notNull(), //最新使用的模型
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("chats_user_id_idx").on(table.userId)],
);

export const messagesTable = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    chatId: integer("chat_id")
      .notNull()
      .references(() => chatsTable.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("messages_chat_id_idx").on(table.chatId)],
);

// 错误监控存储表
export const errorEventsTable = pgTable("error_events", {
  id: serial("id").primaryKey(),
  error: jsonb("error").notNull(),
  events: jsonb("events").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 性能监控存储表
export const performanceEventsTable = pgTable("performance_events", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 128 }),
  path: varchar("path", { length: 255 }).notNull(),
  metrics: jsonb("metrics").notNull(), // { loadTime, ttfb, fcp, 请求接口耗时..... }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
