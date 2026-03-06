import { NextRequest } from "next/server";
import { streamText, convertToModelMessages } from "ai";
import { createDeepSeek } from "@ai-sdk/deepseek";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const deepSeek = createDeepSeek({
  apiKey: DEEPSEEK_API_KEY, //设置API密钥
});
export async function POST(req: NextRequest) {
  const { messages } = await req.json(); //获取请求体
  //这里为什么接受messages 因为我们使用前端的useChat 他会自动注入这个参数，所有可以直接读取
  const result = streamText({
    model: deepSeek("deepseek-chat"), //使用deepseek-chat模型
    messages: convertToModelMessages(messages), //转换成ai厂商需要的格式
    system: "你是中国动画罗小黑战记里的罗小黑，请用罗小黑的语气和口吻回答问题", //系统提示词
  });

  return result.toUIMessageStreamResponse(); //返回流式响应
}
