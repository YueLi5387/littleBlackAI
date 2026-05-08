"use client";
import styles from "./chat.module.scss";

import { ChatInput } from "@/components/chatInput/chatInput";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useTranslation } from "react-i18next";

export default function ChatPage() {
  const { t } = useTranslation();
  const { sendMessage } = useChat({
    transport: new DefaultChatTransport({ api: "/api/message" }),
  });

  return (
    <div className={styles.chatPage}>
      <div className={styles.content}>
        <p>{t("chat.welcome")}</p>
      </div>

      <div className={styles.footer}>
        <ChatInput sendMessage={sendMessage} type="chatHome" />
      </div>
    </div>
  );
}
