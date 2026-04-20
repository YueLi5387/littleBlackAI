"use client";
import TextArea from "antd/es/input/TextArea";
import styles from "./input.module.scss";
import { useState } from "react";
import { Button, message } from "antd";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import http from "@/lib/utils/http";

type ChatInputMode = "chatHome" | "chatDetail";

type ChatInputProps = {
  type: ChatInputMode;
  sendMessage?: (payload: { text: string }) => void;
  isResponding?: boolean;
  onStop?: () => void;
};

export function ChatInput({
  sendMessage,
  type,
  isResponding = false,
  onStop,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const router = useRouter();

  const submit = () => {
    if (input.trim()) {
      sendMessage?.({ text: input });
      setInput("");
    }
  };
  const toChatDetail = async (question: string) => {
    if (isCreatingChat) return;

    setIsCreatingChat(true);
    try {
      const res = (await http.post("/api/chat", {
        title: question,
        model: "deepseek-chat",
      })) as {
        data: {
          chatId: string;
        };
        message?: string;
      };

      if (!res.data?.chatId) {
        throw new Error(res.message || "创建聊天组失败");
      }
      // console.log("看聊天组是否创建成功", res.data);

      const query = new URLSearchParams({ question }).toString();
      router.push(`${ROUTES.chatDetail(res.data.chatId)}?${query}`);
      setInput("");
    } catch (error) {
      console.log("失败了");

      const errorMessage =
        error instanceof Error ? error.message : "创建聊天组失败";
      message.error(errorMessage);
    } finally {
      setIsCreatingChat(false);
    }
  };

  const toChatDetailOrSubmit = async () => {
    if (isResponding && type === "chatDetail") {
      onStop?.();
      return;
    }

    const question = input.trim();
    if (!question) return;

    if (type === "chatHome") {
      await toChatDetail(question);
    } else {
      submit();
    }
  };
  return (
    <div className={styles.footer}>
      <TextArea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="请输入内容"
        className={styles.textarea}
        size="large"
        autoSize={{ minRows: 3, maxRows: 4 }}
        style={{ boxShadow: "none" }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void toChatDetailOrSubmit();
          }
        }}
      />
      <div className={styles.chatBtn}>
        <Button
          className={styles.btn}
          type={isResponding && type === "chatDetail" ? "default" : "primary"}
          onClick={() => void toChatDetailOrSubmit()}
          loading={isCreatingChat}
        >
          {isResponding && type === "chatDetail" ? "中断" : "发送"}
        </Button>
      </div>
    </div>
  );
}
