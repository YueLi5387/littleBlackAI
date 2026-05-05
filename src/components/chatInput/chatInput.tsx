"use client";
import TextArea from "antd/es/input/TextArea";
import styles from "./input.module.scss";
import { useState, useRef } from "react";
import { Button, message, Upload, Tag } from "antd";
import { PaperClipOutlined, CloseOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import http from "@/lib/utils/http";
import { useTranslation } from "react-i18next";
import { memo } from "react";

type ChatInputMode = "chatHome" | "chatDetail";

type ChatInputProps = {
  type: ChatInputMode;
  sendMessage?: (payload: { text: string }) => void;
  isResponding?: boolean;
  onStop?: () => void;
  onFileUpload?: (file: File) => Promise<void>;
  currentFile?: string | null;
  onRemoveFile?: () => void;
  isUploading?: boolean;
};

export const ChatInput = memo(function ChatInput({
  sendMessage,
  type,
  isResponding = false,
  onStop,
  onFileUpload,
  currentFile,
  onRemoveFile,
  isUploading,
}: ChatInputProps) {
  const { t } = useTranslation();
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
        throw new Error(res.message || t("chat.createFailed"));
      }

      const query = new URLSearchParams({ question }).toString();
      router.push(`${ROUTES.chatDetail(res.data.chatId)}?${query}`);
      setInput("");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t("chat.createFailed");
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
      <div className={styles.inputWrapper}>
        {currentFile && (
          <div className={styles.fileTag}>
            <Tag
              color="blue"
              closable
              onClose={(e) => {
                e.preventDefault();
                onRemoveFile?.();
              }}
              closeIcon={<CloseOutlined />}
            >
              {currentFile}
            </Tag>
          </div>
        )}
        <TextArea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("common.placeholder")}
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
      </div>
      <div className={styles.chatBtn}>
        {type === "chatDetail" && onFileUpload && (
          <Upload
            showUploadList={false}
            beforeUpload={(file) => {
              void onFileUpload(file);
              return false;
            }}
            accept=".pdf,.docx,.md,.txt"
          >
            <Button
              icon={<PaperClipOutlined />}
              loading={isUploading}
              disabled={!!currentFile}
              className={styles.uploadBtn}
              title={"一次只能上传一个文件"}
            />
          </Upload>
        )}
        <Button
          className={styles.btn}
          type={isResponding && type === "chatDetail" ? "default" : "primary"}
          onClick={() => void toChatDetailOrSubmit()}
          loading={isCreatingChat}
        >
          {isResponding && type === "chatDetail"
            ? t("common.stop")
            : t("common.send")}
        </Button>
      </div>
    </div>
  );
});
