"use client";
import { useContext } from "react";
import styles from "./chatDetail.module.scss";

import { ChatInput } from "@/components/chatInput/chatInput";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { Ctx } from "../layout";
import http from "@/lib/utils/http";

type ChatPart = { type: string; text?: string };
type ChatMessage = {
  id: string;
  role: string;
  parts: ChatPart[];
  content?: string;
};

export default function ChatPageDeatil() {
  const params = useParams<{ chat_id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const context = useContext(Ctx);
  const hasAutoAskedRef = useRef(false);
  const chatId = params.chat_id;

  const { messages, sendMessage, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: chatId ? `/api/message?chatId=${chatId}` : "/api/message",
    }),
    // 当 AI 回答结束时，触发一次侧边栏标题更新（如果是第一条消息）
    onFinish: async () => {
      if (hasAutoAskedRef.current || messages.length <= 2) {
        // 延迟一下再拉取侧边栏的对话组，给后端生成标题一点时间
        setTimeout(async () => {
          try {
            const res = (await http.get("/api/chat")) as any;
            if (res.code === 0 && context) {
              context.setChat(res.data);
            }
          } catch (error) {
            console.error("更新侧边栏标题失败:", error);
          }
        }, 1500);
      }
    },
  });

  // 拉取历史消息
  useEffect(() => {
    if (!chatId) return;
    const fetchHistory = async () => {
      try {
        const res = (await http.get(`/api/chat/${chatId}`)) as any;
        if (res.code === 0) {
          // 将数据库格式转换为 useChat 需要的格式
          const history = res.data.map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            parts: [{ type: "text", text: msg.content }],
          }));
          setMessages(history);
        }
      } catch (error) {
        console.error("获取历史消息失败:", error);
      }
    };
    fetchHistory();
  }, [chatId, setMessages]);

  useEffect(() => {
    const question = searchParams.get("question")?.trim();
    if (!question || hasAutoAskedRef.current) return;

    hasAutoAskedRef.current = true; //防止流式文字返回高频刷新，导致messages一直变化，从而触发useEffect,死循环问题
    sendMessage({ text: question });

    // 如果是新对话，同步更新侧边栏状态
    if (context) {
      context.setChat((prev) => [{ id: chatId, title: question }, ...prev]);
    }

    router.replace(ROUTES.chatDetail(chatId));
  }, [chatId, router, searchParams, sendMessage, context]);

  const latestMsgRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    latestMsgRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className={styles.chatDetailPage}>
      <div className={styles.content}>
        {(messages as ChatMessage[]).map((message) => (
          <div
            key={message.id}
            className={`${styles.message} ${
              message.role === "user" ? styles.user : styles.ai
            }`}
          >
            <div className={styles.bubble}>
              {message.parts.map((part, index) =>
                part.type === "text" ? (
                  <span key={index}>{part.text}</span>
                ) : null,
              )}
            </div>
          </div>
        ))}
        {/* 让最新消息一直显示在底部 */}
        <div ref={latestMsgRef}></div>
      </div>
      <div className={styles.footer}>
        <ChatInput sendMessage={sendMessage} type="chatDetail" />
      </div>
    </div>
  );
}
