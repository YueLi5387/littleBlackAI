"use client";
import { useState } from "react";
import styles from "./chat.module.scss";
import TextArea from "antd/es/input/TextArea";
import { Button } from "antd";

export default function ChatPage() {
  // 输入框
  const [value, setValue] = useState("");

  return (
    <div className={styles.chatPage}>
      <div className={styles.content}>Content</div>
      <div className={styles.footer}>
        <TextArea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Controlled autosize"
          className={styles.textarea}
          size="large"
        />
        <div className={styles.chatBtn}>
          <Button className={styles.btn} type="primary">
            发送
          </Button>
        </div>
      </div>
    </div>
  );
}
