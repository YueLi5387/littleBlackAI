"use client";
import styles from "./chat.module.scss";

import { ChatInput } from "@/components/chatInput/chatInput";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useTranslation } from "react-i18next";

type ChatPart = { type: string; text?: string };
type ChatMessage = { id: string; role: string; parts: ChatPart[] };

export default function ChatPage() {
  const { t } = useTranslation();
  const { messages, sendMessage } = useChat({
    transport: new DefaultChatTransport({ api: "/api/message" }),
  });

  return (
    <div className={styles.chatPage}>
      <div className={styles.content}>
        <p>{t("chat.welcome")}</p>
      </div>

      {(messages as ChatMessage[]).map((message) => (
        <div key={message.id}>
          {message.role === "user" ? "User: " : "AI: "}
          {message.parts.map((part, index) =>
            part.type === "text" ? <span key={index}>{part.text}</span> : null,
          )}
        </div>
      ))}

      <div className={styles.footer}>
        <ChatInput sendMessage={sendMessage} type="chatHome" />
      </div>
    </div>
  );
}
