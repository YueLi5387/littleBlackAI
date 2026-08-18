import assert from "node:assert/strict";
import { canSubmitChatInput, shouldUseRAGForSend } from "./chatControls";

assert.equal(
  canSubmitChatInput({
    hasQuestion: true,
    isCreatingChat: false,
    isResponding: false,
    isUploading: true,
    type: "chatDetail",
  }),
  false,
  "chat detail send should be blocked while a file is uploading",
);

assert.equal(
  canSubmitChatInput({
    hasQuestion: false,
    isCreatingChat: false,
    isResponding: true,
    isUploading: true,
    type: "chatDetail",
  }),
  true,
  "chat detail stop action should remain available while streaming",
);

assert.equal(
  shouldUseRAGForSend({
    currentFile: "guide.pdf",
    pendingFile: null,
    useRAG: false,
  }),
  true,
  "a visible uploaded file should force the next message to use RAG",
);
