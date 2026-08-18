type ChatInputMode = "chatHome" | "chatDetail";

type SubmitState = {
  type: ChatInputMode;
  hasQuestion: boolean;
  isResponding: boolean;
  isUploading: boolean;
  isCreatingChat: boolean;
};

type RAGSendState = {
  currentFile: string | null;
  pendingFile: string | null;
  useRAG: boolean;
};

// 发送/暂停按钮是否可点击
export const canSubmitChatInput = ({
  type,
  hasQuestion,
  isResponding,
  isUploading,
  isCreatingChat,
}: SubmitState) => {
  if (type === "chatDetail" && isResponding) return true;

  // 文件解析完成前不能提交，避免问题先发出而知识库切片还没入库。
  if (isUploading || isCreatingChat) return false;

  return hasQuestion;
};

// 是否使用RAG
export const shouldUseRAGForSend = ({
  currentFile, //当前聊天已经绑定的文件
  pendingFile, //待上传文件
  useRAG, //是否使用RAG
}: RAGSendState) => {
  // 只要页面仍显示已上传文件，就强制按 RAG 请求发送，避免状态刷新/异步更新后漏带 useRAG。
  return useRAG || Boolean(currentFile || pendingFile);
};
