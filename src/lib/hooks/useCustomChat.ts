// 封装SSE的实现逻辑
import { useState, useCallback, useRef } from "react";

export type ChatPart = { type: "text"; text: string };
export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  parts: ChatPart[];
};

interface UseCustomChatOptions {
  api: string;
  onFinish?: (messages: ChatMessage[]) => void;
}

export function useCustomChat({ api, onFinish }: UseCustomChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<"idle" | "streaming">("idle");
  const [useRAG, setUseRAG] = useState(false); // 是否使用 RAG 功能
  const abortControllerRef = useRef<AbortController | null>(null); ///判断是否正在输出
  const messagesRef = useRef<ChatMessage[]>([]);
  const statusRef = useRef<"idle" | "streaming">("idle"); // 代表是否正在输出
  const onFinishRef = useRef(onFinish);
  const useRAGRef = useRef(useRAG); // 使用 ref 同步 useRAG 状态，避免 sendMessage 闭包问题

  // 同步状态到 ref，确保异步回调或闭包内能获取最新值
  messagesRef.current = messages;
  statusRef.current = status;
  onFinishRef.current = onFinish;
  useRAGRef.current = useRAG;

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      statusRef.current = "idle"; //代表已经停止输出
      setStatus("idle");
    }
  }, []);

  const sendMessage = useCallback(
    async ({ text }: { text: string }) => {
      // 如果正在输出，则不允许再次发送
      if (statusRef.current === "streaming") return;

      // 先预设好用户发送的信息
      const userMsg: ChatMessage = {
        id: Date.now().toString(), //先把id设置为当前时间戳，等输出完成后再更新
        role: "user",
        parts: [{ type: "text", text }],
      };
      // 先预设好ai发送的信息
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        parts: [{ type: "text", text: "请稍等..." }],
      };
      //  一次性将两条消息放入数组，先占位，ai输出的时候再更新msg信息
      const newMessages = [...messagesRef.current, userMsg, assistantMsg];

      setMessages(newMessages);
      statusRef.current = "streaming";
      setStatus("streaming");
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // --获取后端传来的回答--
      try {
        const response = await fetch(api, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: newMessages,
            useRAG: useRAGRef.current, // 使用 ref 获取最新的 RAG 开启状态
          }),
          signal: controller.signal,
        });

        if (!response.ok) throw new Error("Failed to send message");

        const reader = response.body?.getReader(); //获取响应体的读取流容器（里边包含很多切片流）
        if (!reader) throw new Error("No reader available");

        const decoder = new TextDecoder(); //二进制->文本
        let buffer = ""; //用来存ai返回的完整文本，存数据库的

        //ai准备输出了，把先前设置的请稍等占位符去掉
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === "assistant") {
            const newLast: ChatMessage = {
              ...last,
              parts: [{ type: "text", text: "" }],
            };
            return [...prev.slice(0, -1), newLast];
          }
          return prev;
        });

        while (true) {
          const { done, value } = await reader.read(); //读取每个切片流
          if (done) break;

          buffer += decoder.decode(value, { stream: true }); //通过stream将多余的二进制给留在下一次的buffer里，等下一次读取时再处理，此时的buffer存的是完整的二进制，就可以正常解析成字符串，不会有乱码的问题
          //但是，解析的字符串可能不完整，比如
          // data: {"type":"text-delta","delta":"你好"}
          // data: {"type":"text-delta","delta":"我正在
          // 它少了“}，不能被转成JSON对象，所以需要等下一次读取时再处理
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const dataStr = line.slice(6).trim(); //去掉前置的 "data: "这六个字符，获取有效内容
                if (!dataStr) continue;
                const json = JSON.parse(dataStr);
                if (json.type === "text-delta") {
                  // 拼接ai返回的文本
                  setMessages((prev) => {
                    const last = prev[prev.length - 1];
                    if (last && last.role === "assistant") {
                      const newLast: ChatMessage = {
                        ...last,
                        parts: [
                          {
                            ...last.parts[0],
                            text: last.parts[0].text + json.delta,
                          },
                        ],
                      };
                      return [...prev.slice(0, -1), newLast];
                    }
                    return prev;
                  });
                } else if (json.type === "message-ids") {
                  // 同步真实的数据库 ID,AI结束回答后，后端把这最新的一组用户提问和ai回答的存在数据库里生成的真实 ID 发过来了
                  setMessages((prev) => {
                    const next = [...prev];
                    if (next.length >= 2) {
                      if (json.assistantMessageId) {
                        next[next.length - 1] = {
                          ...next[next.length - 1],
                          id: json.assistantMessageId,
                        };
                      }
                      if (json.userMessageId) {
                        next[next.length - 2] = {
                          ...next[next.length - 2],
                          id: json.userMessageId,
                        };
                      }
                    }
                    return next;
                  });
                }
              } catch (e) {
                console.error("Parse error:", e, "Line:", line);
              }
            }
          }
        }
      } catch (error: any) {
        if (error.name === "AbortError") {
          console.log("Stream aborted");
        } else {
          console.error("Stream error:", error);
        }
      } finally {
        statusRef.current = "idle";
        setStatus("idle");
        abortControllerRef.current = null;
        // 获取最新的 messagesRef.current 并通过 ref 调用 onFinish
        onFinishRef.current?.(messagesRef.current);
      }
    },
    [api], // 只依赖 api，保持稳定
  );

  return {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    useRAG,
    setUseRAG,
  };
}
