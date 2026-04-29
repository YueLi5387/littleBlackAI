import { useState, useCallback, useRef } from "react";

export type ChatPart = { type: "text"; text: string };
export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  parts: ChatPart[];
  content?: string;
};

interface UseCustomChatOptions {
  api: string;
  onFinish?: (messages: ChatMessage[]) => void;
}

export function useCustomChat({ api, onFinish }: UseCustomChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<"idle" | "streaming">("idle");
  const abortControllerRef = useRef<AbortController | null>(null); ///判断是否正在输出
  const messagesRef = useRef<ChatMessage[]>([]);
  const statusRef = useRef<"idle" | "streaming">("idle");
  const onFinishRef = useRef(onFinish);

  // 同步 messages 到 ref，方便在异步回调中获取最新值
  messagesRef.current = messages;
  statusRef.current = status;
  onFinishRef.current = onFinish;

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

      const userMsg: ChatMessage = {
        id: Date.now().toString(), //先把id设置为当前时间戳，等输出完成后再更新
        role: "user",
        parts: [{ type: "text", text }],
      };

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        parts: [{ type: "text", text: "" }],
      };

      const newMessages = [...messagesRef.current, userMsg, assistantMsg];
      setMessages(newMessages);
      statusRef.current = "streaming";
      setStatus("streaming");

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch(api, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: newMessages }),
          signal: controller.signal,
        });

        if (!response.ok) throw new Error("Failed to send message");

        const reader = response.body?.getReader(); //获取响应体的读取流容器（里边包含很多切片流）
        if (!reader) throw new Error("No reader available");

        const decoder = new TextDecoder(); //二进制->文本
        let buffer = ""; //用来存ai返回的完整文本，存数据库的

        while (true) {
          const { done, value } = await reader.read(); //读取每个切片流
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
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
                      const newLast = {
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
  };
}
