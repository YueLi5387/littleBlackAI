import { NextRequest } from "next/server";
import { streamText, convertToModelMessages, generateText } from "ai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import {
  addMessage,
  updateChatTitle,
  getAllMessages,
  hybridSearch,
} from "@/db";
import { getQueryEmbedding, rerankChunks } from "@/lib/utils/ragUtils";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const deepSeek = createDeepSeek({
  apiKey: DEEPSEEK_API_KEY, //设置API密钥
});

type ClientMessagePart = {
  type: "text";
  text: string;
};

// 生成聊天信息
export async function POST(req: NextRequest) {
  const chatIdParam = req.nextUrl.searchParams.get("chatId");
  const chatId = chatIdParam ? Number(chatIdParam) : null;
  const payload = await req.json();
  const { messages = [], useRAG = false } = payload;

  const latestUserMessage = [...messages].reverse().find((message) => {
    return message.role === "user";
  });

  // 把用户最新消息的文字内容拼接起来，用户发的最新消息可能是：
  // parts: [
  //   { type: "text", text: "请看这个图片" },
  //   { type: "image", image: "..." },
  //   { type: "text", text: "这是什么？" },
  // ];
  const latestUserText = latestUserMessage?.parts
    ?.filter((part: ClientMessagePart) => part.type === "text")
    .map((part: ClientMessagePart) => part.text ?? "")
    .join("")
    .trim();

  let userMessageId: string | undefined;

  if (chatId && Number.isFinite(chatId) && latestUserText) {
    const userMsg = await addMessage(chatId, "user", latestUserText); //把用户发送的信息存数据库
    userMessageId = String(userMsg.id);

    // 异步生成标题，不阻塞聊天响应
    // 检查数据库中该对话的消息总数，如果是第一条（或者只有当前插入的这一条），则生成标题
    const historyMessages = await getAllMessages(chatId);
    const isFirstMessage = historyMessages.length <= 1;

    if (isFirstMessage) {
      (async () => {
        try {
          // generateText：整段话输出，适合用来生成标题，streamText代表流式输出，做打字机效果
          const { text: title } = await generateText({
            model: deepSeek("deepseek-chat"),
            prompt: `请根据以下用户的首条提问，总结一个简短的标题（不超过15个字），不要包含引号或其他修饰符：\n\n${latestUserText}`,
          });
          if (title) {
            const cleanTitle = title.trim();
            await updateChatTitle(chatId, cleanTitle);
          }
        } catch (error) {
          console.error("生成标题失败:", error);
        }
      })();
    }
  }
  // 系统提示词
  let systemPrompt =
    "你是智能助手陈小黑，你很聪明，会耐心回答用户的问题，会说多国语言，能根据用户的提问调整对应的回答语言，是人类的好帮手。";

  // 如果启用了 RAG 模式
  if (useRAG && chatId && latestUserText) {
    try {
      // 1. 获取用户提问向量
      const queryEmbedding = await getQueryEmbedding(latestUserText);

      // 2. 混合检索 (向量 + 关键词)
      const rawChunks = await hybridSearch(
        Number(chatId),
        latestUserText,
        queryEmbedding,
      );

      // 3. Rerank 重排
      const chunkContents = rawChunks.map((c) => c.content);
      const rerankedContents = await rerankChunks(
        latestUserText,
        chunkContents,
      );

      if (rerankedContents.length > 0) {
        systemPrompt = `你是智能助手陈小黑。当前用户已上传文档。
你的回答规则：
1. 必须【严格结合】下方提供的【参考资料】来回答。
2. 如果参考资料中没有相关信息，请直接回答：“抱歉，在您上传的文档中没有找到相关内容。”
3. 严禁使用你自带的预训练知识来回答文档之外的内容。

【参考资料开始】
${rerankedContents.join("\n\n")}
【参考资料结束】`;
      } else {
        systemPrompt += `\n\n注意：当前用户已上传文档，但针对该问题未检索到匹配的段落。请告知用户文档中没有相关内容。`;
      }
    } catch (error) {
      console.error("RAG 链路发生错误:", error);
    }
  }

  // 关键：如果是 RAG 模式且检索到了内容，我们构造一个新的消息数组
  // 将参考资料通过 System 角色直接“喂”给模型，并保持用户问题在最后
  let finalMessages = convertToModelMessages(messages);

  if (useRAG && chatId && latestUserText) {
    // 强制重置上下文，只给系统提示词和当前问题，防止历史干扰
    finalMessages = [{ role: "user" as const, content: latestUserText }];
  }

  const result = streamText({
    model: deepSeek("deepseek-chat"), //使用deepseek-chat模型
    messages: finalMessages,
    system: systemPrompt,
  });

  // 自定义 SSE 流实现
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let fullText = "";
      try {
        for await (const delta of result.textStream) {
          fullText += delta;
          const data = JSON.stringify({ type: "text-delta", delta });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`)); //往流里推入一块数据（二进制）
        }
      } catch (error) {
        console.error("Stream error:", error);
      } finally {
        // 无论正常结束还是中止，只要有内容就存入数据库
        if (chatId && Number.isFinite(chatId) && fullText.trim()) {
          try {
            const aiMsg = await addMessage(
              chatId,
              "assistant",
              fullText.trim(),
            );
            // 返回这组messages的id信息：用户msg的id+ai msg的id
            const idData = JSON.stringify({
              type: "message-ids",
              userMessageId,
              assistantMessageId: String(aiMsg.id),
            });
            // 如果连接已关闭，enqueue 会失败，这里 catch 住就行
            controller.enqueue(encoder.encode(`data: ${idData}\n\n`));
          } catch (e) {
            // 连接可能已关闭
          }
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
