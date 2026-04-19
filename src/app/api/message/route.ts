import { NextRequest } from "next/server";
import { streamText, convertToModelMessages, generateText } from "ai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { addMessage, updateChatTitle } from "@/db";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const deepSeek = createDeepSeek({
  apiKey: DEEPSEEK_API_KEY, //设置API密钥
});

// 生成聊天信息
export async function POST(req: NextRequest) {
  const chatIdParam = req.nextUrl.searchParams.get("chatId");
  const chatId = chatIdParam ? Number(chatIdParam) : null;
  const payload = (await req.json()) as { messages?: any[] }; //前端useChat钩子在发送请求时，会自动把当前页面的所有历史对话内容打包放在 messages 数组里传给后端
  const messages = Array.isArray(payload.messages) ? payload.messages : [];

  // 检查是否是第一条消息，如果是，则生成标题
  const isFirstMessage = messages.length <= 1;

  const latestUserMessage = [...messages]
    .reverse()
    .find(
      (message: {
        role?: string;
        parts?: { type?: string; text?: string }[];
      }) => {
        return message.role === "user";
      },
    );

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

  if (chatId && Number.isFinite(chatId) && latestUserText) {
    await addMessage(chatId, "user", latestUserText); //把用户发送的信息存数据库

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

            // 关键：在流式响应末尾添加特殊标记，通知前端更新标题
            // 但因为是 toUIMessageStreamResponse，我们不能直接改 Body
            // 我们通过 onFinish 结束后，前端会有一个 finish 状态，我们让前端去重新拉取一次标题
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
      "你是智能助手陈小黑，你很聪明，会耐心回答用户的问题，是人类的好帮手", //系统提示词
    // 当流式响应返回完成时调用，将生成的文本保存到数据库中
    onFinish: async ({ text }) => {
      if (!chatId || !Number.isFinite(chatId)) return;
      const aiText = text.trim();
      if (!aiText) return;
      await addMessage(chatId, "assistant", aiText); //把ai回答的信息存数据库
    },
  });

  return result.toUIMessageStreamResponse(); //返回流式响应
}
