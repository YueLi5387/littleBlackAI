"use client";
import TextArea from "antd/es/input/TextArea";
import styles from "./input.module.scss";
import { useState, memo, useCallback } from "react";
import { Button, message, Upload, Tag } from "antd";
import { PaperClipOutlined, CloseOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import http from "@/lib/utils/http";
import { useTranslation } from "react-i18next";
import { canSubmitChatInput } from "@/lib/utils/chatControls";

type ChatInputMode = "chatHome" | "chatDetail";

type ChatInputProps = {
  type: ChatInputMode;
  sendMessage?: (payload: { text: string }) => void;
  isResponding?: boolean;
  onStop?: () => void;
  // 详情页模式下的 props
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
  currentFile: propsCurrentFile,
  onRemoveFile: propsOnRemoveFile,
  isUploading: propsIsUploading,
}: ChatInputProps) {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  // 首页模式下的本地文件状态
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [localIsUploading, setLocalIsUploading] = useState(false);
  const router = useRouter();

  // 统一文件显示和上传状态（兼容首页和详情页）
  const currentFileName =
    type === "chatHome" ? localFile?.name : propsCurrentFile;
  const isUploading = type === "chatHome" ? localIsUploading : propsIsUploading;
  const question = input.trim();
  const canSubmit = canSubmitChatInput({
    type,
    hasQuestion: Boolean(question),
    isResponding,
    isUploading: Boolean(isUploading),
    isCreatingChat,
  });

  // 移除文件
  const handleRemoveFile = () => {
    if (type === "chatHome") {
      setLocalFile(null);
    } else {
      propsOnRemoveFile?.();
    }
  };

  // 跳转详情页
  const toChatDetail = async (question: string) => {
    if (isCreatingChat) return;
    setIsCreatingChat(true);

    try {
      //  创建对话组
      const res = (await http.post("/api/chat", {
        title: question,
        model: "deepseek-chat",
      })) as { data: { chatId: string }; message?: string };

      if (!res.data?.chatId) {
        throw new Error(res.message || t("chat.createFailed"));
      }

      const newChatId = res.data.chatId;

      // 2. 如果首页有暂存的文件，立即上传
      if (localFile) {
        setLocalIsUploading(true);
        const formData = new FormData();
        formData.append("file", localFile);
        formData.append("chatId", newChatId);

        await http.post("/api/knowledge/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      // 3. 跳转到详情页，带上问题和文件标记
      const query = new URLSearchParams({
        question,
        ...(localFile ? { file: localFile.name } : {}),
      }).toString();

      router.push(`${ROUTES.chatDetail(newChatId)}?${query}`);
      setInput("");
      setLocalFile(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t("chat.createFailed");
      message.error(errorMessage);
    } finally {
      setIsCreatingChat(false);
      setLocalIsUploading(false);
    }
  };

  const toChatDetailOrSubmit = async () => {
    // 先处理停止：无论输入框是否有内容，停止优先
    if (type === "chatDetail" && isResponding) {
      onStop?.();
      return;
    }

    if (!canSubmit) return;

    if (type === "chatHome") {
      await toChatDetail(question);
    } else {
      sendMessage?.({ text: question });
      setInput("");
    }
  };

  return (
    <div className={styles.footer}>
      <div className={styles.inputWrapper}>
        {currentFileName && (
          <div className={styles.fileTag}>
            <Tag
              color="blue"
              closable
              onClose={(e) => {
                e.preventDefault();
                handleRemoveFile();
              }}
              closeIcon={<CloseOutlined />}
            >
              {currentFileName}
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
        <Upload
          showUploadList={false}
          beforeUpload={(file) => {
            if (currentFileName) {
              message.warning(
                t("chat.removeFileFirst"),
              );
              return false;
            }
            if (type === "chatHome") {
              setLocalFile(file);
            } else {
              void onFileUpload?.(file);
            }
            return false;
          }}
          accept=".pdf,.docx,.md,.txt"
          disabled={isResponding || isUploading || !!currentFileName}
        >
          <Button
            icon={<PaperClipOutlined />}
            loading={isUploading}
            disabled={!!currentFileName}
            className={styles.uploadBtn}
            title={
              currentFileName
                ? t("common.onlyUploadFileOne")
                : t("common.uploadFile")
            }
          />
        </Upload>
        <Button
          className={styles.btn}
          type={isResponding && type === "chatDetail" ? "default" : "primary"}
          onClick={() => void toChatDetailOrSubmit()}
          loading={isCreatingChat}
          disabled={!canSubmit}
        >
          {isResponding && type === "chatDetail"
            ? t("common.stop")
            : t("common.send")}
        </Button>
      </div>
    </div>
  );
});
