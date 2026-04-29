import { NextRequest } from "next/server";
import { streamText, convertToModelMessages, generateText } from "ai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { addMessage, updateChatTitle } from "@/db";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const deepSeek = createDeepSeek({
  apiKey: DEEPSEEK_API_KEY, //设置API密钥
});

type ClientMessagePart = {
  type: "text";
  text: string;
};

type ClientMessage = {
  role: "user" | "assistant" | "system";
  parts: ClientMessagePart[];
};

// 生成聊天信息
export async function POST(req: NextRequest) {
  const chatIdParam = req.nextUrl.searchParams.get("chatId");
  const chatId = chatIdParam ? Number(chatIdParam) : null;
  const payload = (await req.json()) as { messages?: ClientMessage[] }; //前端useChat钩子在发送请求时，会自动把当前页面的所有历史对话内容打包放在 messages 数组里传给后端
  const messages = Array.isArray(payload.messages) ? payload.messages : [];

  // 检查是否是第一条消息，如果是，则生成标题
  const isFirstMessage = messages.length <= 1;

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
    ?.filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  let userMessageId: string | undefined;

  if (chatId && Number.isFinite(chatId) && latestUserText) {
    const userMsg = await addMessage(chatId, "user", latestUserText); //把用户发送的信息存数据库
    userMessageId = String(userMsg.id);

    // 异步生成标题，不阻塞聊天响应
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

  const result = streamText({
    model: deepSeek("deepseek-chat"), //使用deepseek-chat模型
    messages: convertToModelMessages(messages), //转换成ai厂商需要的格式
    system:
      "你是智能助手陈小黑，你很聪明，会耐心回答用户的问题，会说多国语言，能根据用户的提问调整对应的回答语言，是人类的好帮手。", //系统提示词
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
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
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
            const idData = JSON.stringify({
              type: "message-ids",
              userMessageId,
              assistantMessageId: String(aiMsg.id),
            });
            // 如果连接已关闭，enqueue 会失败，这里 catch 住即可
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
