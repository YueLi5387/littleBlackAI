"use client";
import { useEffect } from "react";
import styles from "./chat.module.scss";

import { ChatInput } from "@/component/chatInput/chatInput";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

export default function ChatPage() {
  const { messages, sendMessage } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  useEffect(() => {
    console.log(messages);
  }, [messages]);

  return (
    <div className={styles.chatPage}>
      <div className={styles.content}>
        <p>你好，请问有什么可以帮你的吗？</p>
      </div>

      {messages.map((message: any) => (
        <div key={message.id}>
          {message.role === "user" ? "User: " : "AI: "}
          {message.parts.map((part: any, index: number) =>
            part.type === "text" ? <span key={index}>{part.text}</span> : null
          )}
        </div>
      ))}

      <div className={styles.footer}>
        <ChatInput sendMessage={sendMessage} type="chatHome" />
      </div>
    </div>
  );
}
