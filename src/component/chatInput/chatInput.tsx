"use client";
import TextArea from "antd/es/input/TextArea";
import styles from "./input.module.scss";
import { useState } from "react";
import { Button } from "antd";
import { useRouter } from "next/navigation";

export function ChatInput(props: any) {
  const { sendMessage, type } = props;
  const [input, setInput] = useState("");
  const router = useRouter();

  const submit = () => {
    if (input.trim()) {
      sendMessage?.({ text: input });
      setInput("");
    }
  };
  const tochatDetail = () => {
    router.push("/view/chatPage/12345");
  };
  const toChatDetailOrSubmit = () => {
    if (type === "chatHome") {
      tochatDetail();
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
            toChatDetailOrSubmit();
          }
        }}
      />
      <div className={styles.chatBtn}>
        <Button
          className={styles.btn}
          type="primary"
          onClick={toChatDetailOrSubmit}
        >
          发送
        </Button>
      </div>
    </div>
  );
}
