"use client";
import { useEffect } from "react";
import styles from "./chatDetail.module.scss";

import { ChatInput } from "@/component/chatInput/chatInput";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

export default function ChatPageDeatil() {
  const { messages, sendMessage } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  useEffect(() => {
    console.log(messages);
  }, [messages]);

  return (
    <div className={styles.chatDetailPage}>
      <div className={styles.content}>
        {messages.map((message: any) => (
          <div key={message.id}>
            {message.role === "user" ? "User: " : "AI: "}
            {message.parts.map((part: any, index: number) =>
              part.type === "text" ? <span key={index}>{part.text}</span> : null
            )}
          </div>
        ))}
      </div>
      <div className={styles.footer}>
        <ChatInput sendMessage={sendMessage} type="chatDetail" />
      </div>
    </div>
  );
}
