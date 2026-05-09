// 封装RAG相关逻辑，包含文档转文字，文档切块，文字转向量，重排
import mammoth from "mammoth";
const pdf = require("pdf-parse");
import { useTranslation } from "react-i18next";
const { t } = useTranslation();

/**
 * 文件解析工具：将不同格式的文件转为纯文本
 */
export async function parseFileToText(
  fileBuffer: Buffer,
  fileType: string,
): Promise<string> {
  try {
    //  PDF 处理
    if (fileType === "application/pdf") {
      const data = await pdf(fileBuffer);
      return data.text || "";
    }

    // Word 处理 (.docx)
    if (
      fileType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const { value } = await mammoth.extractRawText({ buffer: fileBuffer });
      return value || "";
    }

    // 纯文本或 Markdown 处理
    if (
      fileType === "text/plain" ||
      fileType === "text/markdown" ||
      fileType.startsWith("text/")
    ) {
      return fileBuffer.toString("utf-8");
    }

    throw new Error(`${t("common.UnsupportedFileTypeError")}: ${fileType}`);
  } catch (error) {
    console.error(t("common.uploadFail"), error);
    throw new Error(t("common.failReadUpload"));
  }
}

/**
 * 递归分割文档
 * 作用：保证语义完整性，防止 AI 看到断章取义的内容
 * @param text 待须分割的文本内容
 * @param chunkSize 每个块的最大字符数
 * @param chunkOverlap 块与重叠区的字符数
 */
export function recursiveSplit(
  text: string,
  chunkSize: number = 600,
  chunkOverlap: number = 100,
): string[] {
  // 按照优先级分割：段落 > 换行 > 标点符号
  const separators = ["\n\n", "\n", "。", "！", "？", "!", "?", " ", ""];
  const finalChunks: string[] = []; //最终切片

  /**
   * @param content 当前待分割的文本
   * @param separatorIndex 当前使用的分隔符索引
   */
  function split(content: string, separatorIndex: number) {
    //  如果内容已经足够小，直接存入结果
    if (content.length <= chunkSize) {
      const trimmed = content.trim();
      if (trimmed) finalChunks.push(trimmed);
      return;
    }

    // 如果已经尝试了所有分隔符，内容依然超限，则执行强行截断（保底）
    if (separatorIndex >= separators.length) {
      finalChunks.push(content.slice(0, chunkSize));
      // 递归处理剩余部分
      split(content.slice(chunkSize), separatorIndex);
      return;
    }

    // 尝试当前等级的分隔符
    const separator = separators[separatorIndex];
    const parts = content.split(separator);
    let currentBuffer = "";

    for (const part of parts) {
      // 如果当前缓冲区加上这一部分（以及分隔符）没有超过限制，则继续累加
      if (
        (currentBuffer + (currentBuffer ? separator : "") + part).length <=
        chunkSize
      ) {
        currentBuffer += (currentBuffer ? separator : "") + part;
      } else {
        // 如果当前缓冲区有内容，先将其存入结果
        if (currentBuffer) {
          finalChunks.push(currentBuffer.trim());
        }
        // 关键点：对于刚才那个导致溢出的 part，需要用更细的下一级分隔符去切它
        split(part, separatorIndex + 1);
        currentBuffer = "";
      }
    }

    // 处理最后残留的内容
    if (currentBuffer) {
      finalChunks.push(currentBuffer.trim());
    }
  }

  // 从最高级分隔符 (\n\n) 开始递归
  split(text, 0);

  // Overlap (重叠区) 处理：增加块与块之间的语义联系，防止检索断章取义
  if (finalChunks.length <= 1) return finalChunks;

  return finalChunks.map((chunk, i) => {
    if (i === 0) return chunk;
    const prevChunk = finalChunks[i - 1];
    const overlap = prevChunk.slice(-chunkOverlap);
    return overlap + chunk;
  });
}

/**
 * 获取提问的向量
 */
export async function getQueryEmbedding(query: string): Promise<number[]> {
  const response = await fetch("https://api.siliconflow.cn/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SILICONFLOW_API_KEY}`,
    },
    body: JSON.stringify({
      model: "BAAI/bge-m3",
      input: [query],
    }),
  });

  if (!response.ok) throw new Error("获取提问向量失败");
  const { data } = await response.json();
  return data[0].embedding;
}

/**
 * Rerank 重排逻辑：使用 BGE-Reranker 对检索结果进行精排
 * @param query 用户提问的文本
 * @param chunks 检索到的文档块
 * @returns 重排后的文档块
 */
export async function rerankChunks(
  query: string,
  chunks: string[],
): Promise<string[]> {
  if (chunks.length === 0) return [];

  const response = await fetch("https://api.siliconflow.cn/v1/rerank", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SILICONFLOW_API_KEY}`,
    },
    body: JSON.stringify({
      model: "BAAI/bge-reranker-v2-m3",
      query: query,
      documents: chunks,
      top_n: 5, // 只取前 5 个最相关的
    }),
  });

  if (!response.ok) {
    console.error("Rerank failed, falling back to original order");
    return chunks.slice(0, 5);
  }

  const { results } = await response.json();
  // 根据重排得分返回对应的文本内容
  return results.map((r: any) => chunks[r.index]);
}
