import { drizzle } from "drizzle-orm/postgres-js";
import { and, desc, eq, sql } from "drizzle-orm";
import postgres from "postgres";
import {
  chatsTable,
  errorEventsTable,
  messagesTable,
  performanceEventsTable,
  knowledgeChunksTable,
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

// 查询聊天组
export const getAllChats = async (userId: string, page = 1, pageSize = 17) => {
  return await db
    .select()
    .from(chatsTable)
    .where(eq(chatsTable.userId, userId))
    .orderBy(desc(chatsTable.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
};

// 新增一条信息
export const addMessage = async (
  chatId: number,
  role: string,
  content: string,
  fileName?: string,
) => {
  const [message] = await db
    .insert(messagesTable)
    .values({
      chatId,
      role,
      content,
      ...(fileName ? { fileName } : {}),
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

// 删除整组对话；消息和知识库切片依赖数据库外键级联删除。
export const deleteChatById = async (chatId: number) => {
  const [deleted] = await db
    .delete(chatsTable)
    .where(eq(chatsTable.id, chatId))
    .returning({ id: chatsTable.id });

  return deleted ?? null;
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

// 获取错误日志
export const getAllErrorEvents = async (page = 1, pageSize = 8) => {
  return await db
    .select()
    .from(errorEventsTable)
    .orderBy(desc(errorEventsTable.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
};

// 删除指定错误日志。
export const deleteErrorEventById = async (id: number) => {
  const [deleted] = await db
    .delete(errorEventsTable)
    .where(eq(errorEventsTable.id, id))
    .returning({ id: errorEventsTable.id });

  return deleted ?? null;
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

// 获取性能日志
export const getAllPerformanceEvents = async (page = 1, pageSize = 10) => {
  return await db
    .select()
    .from(performanceEventsTable)
    .orderBy(desc(performanceEventsTable.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
};

export const countPerformanceEvents = async () => {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(performanceEventsTable);
  return Number(result.count);
};

// 删除指定性能日志。
export const deletePerformanceEventById = async (id: number) => {
  const [deleted] = await db
    .delete(performanceEventsTable)
    .where(eq(performanceEventsTable.id, id))
    .returning({ id: performanceEventsTable.id });

  return deleted ?? null;
};

// 根据 ID 获取错误事件
export const getErrorEventById = async (id: number) => {
  const [event] = await db
    .select()
    .from(errorEventsTable)
    .where(eq(errorEventsTable.id, id));

  return event ?? null;
};

// 批量新增知识库切片（分批插入，防止大文件参数过多导致失败）
export const addKnowledgeChunks = async (
  chunks: { chatId: number; content: string; embedding: number[] | null }[],
) => {
  const BATCH_SIZE = 50; // 每组 50 条，安全且高效
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    await db.insert(knowledgeChunksTable).values(batch);
  }
};

// 删除指定对话的所有知识库切片（每个对话组在同一时间内只有有一个文件存在）
export const deleteKnowledgeChunksByChatId = async (chatId: number) => {
  return await db
    .delete(knowledgeChunksTable)
    .where(eq(knowledgeChunksTable.chatId, chatId));
};

// 向量服务不可用时，均匀取出部分文档片段作为 RAG 兜底上下文。
export const getKnowledgeChunksByChatId = async (
  chatId: number,
  limit: number = 10,
) => {
  const chunks = await db
    .select({ content: knowledgeChunksTable.content })
    .from(knowledgeChunksTable)
    .where(eq(knowledgeChunksTable.chatId, chatId))
    .orderBy(knowledgeChunksTable.id);

  if (chunks.length <= limit) return chunks;
  if (limit <= 1) return chunks.slice(0, 1);

  // 从文档开头到结尾均匀取样，避免只把前几段交给模型。
  return Array.from({ length: limit }, (_, index) => {
    const chunkIndex = Math.round(
      (index * (chunks.length - 1)) / (limit - 1),
    );
    return chunks[chunkIndex];
  });
};

// 混合检索：向量相似度 + 关键词搜索 (RRF 算法)
// rrf公式：（1/(k+向量排名)）+（1/(k+关键字排名)）   --k是平滑系数，一般取60
export const hybridSearch = async (
  chatId: number,
  queryText: string,
  queryEmbedding: number[],
) => {
  // 注意：这里使用 raw sql 来实现高效的混合检索，这是简历里的核心亮点
  const results = await db.execute(sql`
    WITH vector_matches AS (
      SELECT id, content, 1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity,
             ROW_NUMBER() OVER (ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as rank
      FROM knowledge_chunks
      WHERE chat_id = ${chatId}
      -- LIMIT 必须在排序之后执行，否则大文件/后续文件会随机截断候选切片。
      ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
      LIMIT 20
    ),
    keyword_matches AS (
      SELECT id, content, ts_rank(to_tsvector('simple', content), plainto_tsquery('simple', ${queryText})) as rank_score,
             ROW_NUMBER() OVER (ORDER BY ts_rank(to_tsvector('simple', content), plainto_tsquery('simple', ${queryText})) DESC) as rank
      FROM knowledge_chunks
      WHERE chat_id = ${chatId} AND to_tsvector('simple', content) @@ plainto_tsquery('simple', ${queryText})
      -- 关键词候选同样先排序再截断，保证 rerank 输入的是最相关的一批内容。
      ORDER BY ts_rank(to_tsvector('simple', content), plainto_tsquery('simple', ${queryText})) DESC
      LIMIT 20
    )
    SELECT 
      COALESCE(v.id, k.id) as id,
      COALESCE(v.content, k.content) as content,
      (COALESCE(1.0 / (v.rank + 60), 0.0) + COALESCE(1.0 / (k.rank + 60), 0.0)) as rrf_score
    FROM vector_matches v
    FULL OUTER JOIN keyword_matches k ON v.id = k.id
    ORDER BY rrf_score DESC
    LIMIT 10
  `);

  return results as unknown as {
    id: number;
    content: string;
    rrf_score: number;
  }[];
};
