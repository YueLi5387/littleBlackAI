"use client";
import { memo, useContext, useEffect, useRef } from "react";
import styles from "./chatDetail.module.scss";

import { ChatInput } from "@/components/chatInput/chatInput";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { Ctx } from "../layout";
import http from "@/lib/utils/http";
import { DeleteOutlined } from "@ant-design/icons";
import { message, Popconfirm } from "antd";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ChatPart = { type: string; text?: string };
type ChatMessage = {
  id: string;
  role: string;
  parts: ChatPart[];
  content?: string;
};

type ChatListItem = {
  id: string | number;
  title: string;
};

type ChatListResponse = {
  code: number;
  data: ChatListItem[];
};

type ChatHistoryItem = {
  id: string | number;
  role: string;
  content: string;
};

type ChatHistoryResponse = {
  code: number;
  data: ChatHistoryItem[];
};

type DeleteMessageResponse = {
  code: number;
};

// 抽取单个消息组件以利用 React.memo 减少重渲染
const MemoizedReactMarkdown = memo(ReactMarkdown);
const REMARK_PLUGINS = [remarkGfm];

const MessageItem = memo(
  ({
    message,
    isStreaming,
    onDelete,
  }: {
    message: ChatMessage;
    isStreaming: boolean;
    onDelete: (aiId: string) => void;
  }) => {
    return (
      <div
        className={`${styles.message} ${
          message.role === "user" ? styles.user : styles.ai
        }`}
      >
        <div className={styles.bubbleWrap}>
          <div className={styles.bubble}>
            {message.parts.map((part, pIndex) =>
              part.type === "text" ? (
                isStreaming ? (
                  <pre key={pIndex} className={styles.streamingText}>
                    {part.text ?? ""}
                  </pre>
                ) : (
                  <div key={pIndex} className={styles.markdownBody}>
                    <MemoizedReactMarkdown remarkPlugins={REMARK_PLUGINS}>
                      {part.text ?? ""}
                    </MemoizedReactMarkdown>
                  </div>
                )
              ) : null,
            )}
          </div>
          {message.role === "assistant" && (
            <div className={styles.actions}>
              <Popconfirm
                title="删除本条回答"
                description="确认删除这条 AI 回答吗？"
                okText="删除"
                cancelText="取消"
                onConfirm={() => onDelete(message.id)}
              >
                <DeleteOutlined className={styles.deleteIcon} />
              </Popconfirm>
            </div>
          )}
        </div>
      </div>
    );
  },
);

MessageItem.displayName = "MessageItem";

export default function ChatPageDeatil() {
  const params = useParams<{ chat_id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const context = useContext(Ctx);
  const hasAutoAskedRef = useRef(false);
  const chatId = params.chat_id;

  const { messages, sendMessage, setMessages, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: chatId ? `/api/message?chatId=${chatId}` : "/api/message",
    }),
    // 当 AI 回答结束时，触发一次侧边栏标题更新（如果是第一条消息）
    onFinish: async () => {
      if (hasAutoAskedRef.current || messages.length <= 2) {
        // 延迟一下再拉取侧边栏的对话组，给后端生成标题一点时间
        setTimeout(async () => {
          try {
            const res = (await http.get("/api/chat")) as ChatListResponse;
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
        const res = (await http.get(
          `/api/chat/${chatId}`,
        )) as ChatHistoryResponse;
        if (res.code === 0) {
          // 将数据库格式转换为 useChat 需要的格式
          const history = res.data.map((msg) => ({
            id: String(msg.id),
            role: msg.role as "user" | "assistant" | "system",
            content: msg.content,
            parts: [{ type: "text" as const, text: msg.content }],
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

  // 删除一组msg信息
  const handleDeleteAssistantReply = async (
    aiMessageId: string,
    userMessageId: string,
  ) => {
    try {
      const res1 = (await http.delete(
        `/api/chat/${chatId}?messageId=${aiMessageId}`,
      )) as DeleteMessageResponse;
      const res2 = (await http.delete(
        `/api/chat/${chatId}?messageId=${userMessageId}`,
      )) as DeleteMessageResponse;
      if (res1.code === 0 && res2.code === 0) {
        setMessages((prev) =>
          prev.filter(
            (item) => item.id !== aiMessageId && item.id !== userMessageId,
          ),
        );
        message.success("已删除这条 AI 回答");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "删除回答失败，请稍后重试";
      message.error(errorMessage);
    }
  };

  return (
    <div className={styles.chatDetailPage}>
      <div className={styles.content}>
        {(messages as ChatMessage[]).map((message, index) => (
          <MessageItem
            key={message.id}
            message={message}
            isStreaming={
              status === "streaming" &&
              index === messages.length - 1 &&
              message.role === "assistant"
            }
            onDelete={(aiId) => {
              const userMsgId = messages[index - 1]?.id;
              if (userMsgId) void handleDeleteAssistantReply(aiId, userMsgId);
            }}
          />
        ))}
        {/* 让最新消息一直显示在底部 */}
        <div ref={latestMsgRef}></div>
      </div>
      <div className={styles.footer}>
        <ChatInput
          sendMessage={sendMessage}
          type="chatDetail"
          isResponding={status === "streaming"}
          onStop={stop}
        />
      </div>
    </div>
  );
}
