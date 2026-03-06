"use client";
import { useEffect } from "react";
import styles from "./chatDetail.module.scss";

import { ChatInput } from "@/component/chatInput/chatInput";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

export default function ChatPageDeatil() {
  const { messages, sendMessage } = useChat({
    transport: new DefaultChatTransport({ api: "/api/message" }),
  });
  console.log("信息打印查看：", messages);

  useEffect(() => {
    console.log(messages);
  }, [messages]);

  return (
    <div className={styles.chatDetailPage}>
      <div className={styles.content}>
        {messages.map((message: any) => (
          <div
            key={message.id}
            className={`${styles.message} ${
              message.role === "user" ? styles.user : styles.ai
            }`}
          >
            <div className={styles.bubble}>
              {message.parts.map((part: any, index: number) =>
                part.type === "text" ? (
                  <span key={index}>{part.text}</span>
                ) : null,
              )}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.footer}>
        <ChatInput sendMessage={sendMessage} type="chatDetail" />
      </div>
    </div>
  );
}
