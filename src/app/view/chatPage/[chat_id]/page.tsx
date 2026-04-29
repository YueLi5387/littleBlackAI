"use client";
import {
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import styles from "./chatDetail.module.scss";

import { ChatInput } from "@/components/chatInput/chatInput";
import { useCustomChat } from "@/lib/hooks/useCustomChat";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { Ctx } from "../ChatClientLayout";
import http from "@/lib/utils/http";
import { DeleteOutlined } from "@ant-design/icons";
import { message, Popconfirm } from "antd";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import throttle from "lodash/throttle";
import { useTranslation } from "react-i18next";

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
    const { t } = useTranslation();
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
                title={t("chat.deleteConfirm")}
                okText={t("common.confirm")}
                cancelText={t("common.cancel")}
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
  const { t } = useTranslation();
  const params = useParams<{ chat_id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const context = useContext(Ctx);
  const hasAutoAskedRef = useRef(false);
  const chatId = params.chat_id;

  const { messages, sendMessage, setMessages, status, stop } = useCustomChat({
    api: chatId ? `/api/message?chatId=${chatId}` : "/api/message",
    onFinish: (latestMessages) => {
      // 结束后，如果发现 ID 还是临时的（长度很长），说明可能是暂停了或者 ID 没同步成功，拉取一次历史记录同步 ID
      const lastMsg = latestMessages[latestMessages.length - 1];
      if (lastMsg && lastMsg.id.length > 10 && lastMsg.role === "assistant") {
        setTimeout(async () => {
          try {
            const res = (await http.get(
              `/api/chat/${chatId}`,
            )) as ChatHistoryResponse;
            if (res.code === 0 && res.data.length > 0) {
              const history = res.data.map((msg) => ({
                id: String(msg.id),
                role: msg.role as "user" | "assistant" | "system",
                content: msg.content,
                parts: [{ type: "text" as const, text: msg.content }],
              }));
              // 只有当数据库返回的消息数量大于等于当前消息数量时才同步，避免覆盖掉正在输出的内容
              setMessages((prev) =>
                history.length >= prev.length ? history : prev,
              );
            }
          } catch (error) {
            console.error("同步 ID 失败:", error);
          }
        }, 1000); // 稍微加长延迟，确保后端保存完成
      }

      // 如果是第一条消息，更新侧边栏标题
      if (latestMessages.length <= 2) {
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
    // 关键：如果已经有消息了，或者是正在自动提问流程中，不要拉取历史记录覆盖
    if (!chatId || messages.length > 0 || hasAutoAskedRef.current) return;
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
          // 仅在本地仍为空时写入，避免覆盖流式中的 assistant 消息
          setMessages((prev) => (prev.length === 0 ? history : prev));
        }
      } catch (error) {
        console.error("获取历史消息失败:", error);
      }
    };
    fetchHistory();
  }, [chatId, setMessages, messages.length]);

  useEffect(() => {
    const question = searchParams.get("question")?.trim();
    if (!question || hasAutoAskedRef.current) return;

    hasAutoAskedRef.current = true; // 立即标记，防止重入

    // 先跳转清理 URL，再发送消息，避免 searchParams 变化触发副作用
    router.replace(ROUTES.chatDetail(chatId));

    // 延迟一丁点发送，确保路由状态已更新
    setTimeout(() => {
      sendMessage({ text: question });
    }, 50);

    // 如果是新对话，同步更新侧边栏状态
    if (context) {
      context.setChat((prev) => [{ id: chatId, title: question }, ...prev]);
    }
  }, [chatId, router, searchParams, sendMessage, context]);

  const latestMsgRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    latestMsgRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 删除一组msg信息
  const handleDeleteAssistantReply = useCallback(
    throttle(
      async (aiMessageId: string, userMessageId: string) => {
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
            message.success(t("chat.deleteSuccess"));
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : t("chat.deleteFailed");
          message.error(errorMessage);
        }
      },
      1000,
      { trailing: false },
    ),
    [chatId, setMessages, t],
  );

  const handleMessageDelete = useCallback(
    (aiId: string, index: number) => {
      const userMsgId = messages[index - 1]?.id;
      if (userMsgId) void handleDeleteAssistantReply(aiId, userMsgId);
    },
    [messages, handleDeleteAssistantReply],
  );

  const messageItems = useMemo(() => {
    return (messages as ChatMessage[]).map((message, index) => (
      <MessageItem
        key={message.id}
        message={message}
        isStreaming={
          status === "streaming" &&
          index === messages.length - 1 &&
          message.role === "assistant"
        }
        onDelete={(aiId) => handleMessageDelete(aiId, index)}
      />
    ));
  }, [messages, status, handleMessageDelete]);

  return (
    <div className={styles.chatDetailPage}>
      <div className={styles.content}>
        {messageItems}
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
