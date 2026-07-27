"use client";
import {
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
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
import { VirtualList } from "@/components/VirtualList/index";
import { shouldUseRAGForSend } from "@/lib/utils/chatControls";

type ChatPart = { type: string; text?: string };
type ChatMessage = {
  id: string;
  role: string;
  parts: ChatPart[];
  content?: string;
  fileName?: string;
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
  fileName?: string;
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

// 信息条组件
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
            {message.fileName && message.role === "user" && (
              <div className={styles.fileTag}>{message.fileName}</div>
            )}
            {message.parts.map((part, pIndex) =>
              part.type === "text" ? (
                isStreaming ? (
                  <div key={pIndex}>
                    {(() => {
                      const text = part.text ?? "";
                      const lastIdx = text.lastIndexOf("\n\n");
                      if (lastIdx !== -1) {
                        return (
                          <>
                            <div className={styles.markdownBody}>
                              <MemoizedReactMarkdown
                                remarkPlugins={REMARK_PLUGINS}
                              >
                                {text.slice(0, lastIdx)}
                              </MemoizedReactMarkdown>
                            </div>
                            <pre className={styles.streamingText}>
                              {text.slice(lastIdx)}
                            </pre>
                          </>
                        );
                      }
                      return <pre className={styles.streamingText}>{text}</pre>;
                    })()}
                  </div>
                ) : (
                  // 输出完毕后转markdown
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
  const params = useParams<{ chat_id: string }>(); //拿动态路由里的参数  ---params参数
  const searchParams = useSearchParams(); //query参数
  const router = useRouter();
  const context = useContext(Ctx);
  const hasAutoAskedRef = useRef(false);
  const chatId = params.chat_id;

  const {
    messages,
    sendMessage,
    setMessages,
    status,
    stop,
    useRAG,
    setUseRAG,
  } = useCustomChat({
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
                parts: [{ type: "text" as const, text: msg.content }],
                fileName: (msg as any).fileName,
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
            parts: [{ type: "text" as const, text: msg.content }],
            fileName: (msg as any).fileName,
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
    const file = searchParams.get("file"); // 在 router.replace 之前捕获
    if (!question || hasAutoAskedRef.current) return;

    hasAutoAskedRef.current = true; // 立即标记，防止重入

    // 先跳转清理 URL，再发送消息，避免 searchParams 变化触发副作用
    router.replace(ROUTES.chatDetail(chatId));

    // 延迟一丁点发送，确保路由状态已更新
    setTimeout(() => {
      sendMessage({
        text: question,
        fileName: file ? decodeURIComponent(file) : undefined,
      });
    }, 50);

    // 如果是新对话，同步更新侧边栏状态
    if (context) {
      context.setChat((prev) => [{ id: chatId, title: question }, ...prev]);
    }
  }, [chatId, router, searchParams, sendMessage, context]);

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

  const [isUploading, setIsUploading] = useState(false);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<string | null>(null);

  // 新增：进入页面时检查 URL 参数，如果带了 file，说明是从首页上传跳转过来的
  useEffect(() => {
    const fileName = searchParams.get("file");
    if (fileName) {
      const name = decodeURIComponent(fileName);
      setCurrentFile(name);
      setUseRAG(true);
      setPendingFile(name); // 自动提问时带上文件名
    }
  }, []);

  // 文件上传
  const handleFileUpload = async (file: File) => {
    if (!chatId) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("chatId", chatId);

    try {
      const res = (await http.post("/api/knowledge/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })) as { code: number; message: string };

      if (res.code === 0) {
        message.success(t("common.uploadSuccess"));

        setCurrentFile(file.name);
        setUseRAG(true);
        setPendingFile(file.name); // 下次提问自动带上文件名
      } else {
        message.error(res.message);
      }
    } catch (error) {
      message.error(t("common.uploadFailed"));
    } finally {
      setIsUploading(false);
    }
  };

  // 删除文件
  const handleRemoveFile = async () => {
    setCurrentFile(null);
    setPendingFile(null);
    setUseRAG(false);
  };

  // 封装 sendMessage，自动带上 pendingFile（仅第一次提问生效）
  const handleSendMessage = useCallback(
    (payload: { text: string }) => {
      sendMessage({
        text: payload.text,
        fileName: pendingFile || undefined,
        useRAG: shouldUseRAGForSend({ currentFile, pendingFile, useRAG }),
      });
      if (pendingFile) setPendingFile(null);
    },
    [sendMessage, pendingFile, currentFile, useRAG],
  );

  // 删除信息
  const handleMessageDelete = useCallback(
    (aiId: string, index: number) => {
      const userMsgId = messages[index - 1]?.id;
      if (userMsgId) void handleDeleteAssistantReply(aiId, userMsgId);
    },
    [messages, handleDeleteAssistantReply],
  );

  return (
    <div className={styles.chatDetailPage}>
      <VirtualList
        listData={messages}
        estimatedItemHeight={64} // 调大预估高度，减少冗余 DOM 渲染
        autoScrollToBottom={true}
        className={styles.content}
        renderItem={(message, index) => (
          <MessageItem
            key={(message as ChatMessage).id}
            message={message as ChatMessage}
            isStreaming={
              status === "streaming" &&
              index === messages.length - 1 &&
              (message as ChatMessage).role === "assistant"
            }
            onDelete={(aiId) => handleMessageDelete(aiId, index)}
          />
        )}
      />
      <div className={styles.footer}>
        <ChatInput
          sendMessage={handleSendMessage}
          type="chatDetail"
          isResponding={status === "streaming"}
          onStop={stop}
          onFileUpload={handleFileUpload}
          currentFile={currentFile}
          onRemoveFile={handleRemoveFile}
          isUploading={isUploading}
        />
      </div>
    </div>
  );
}
