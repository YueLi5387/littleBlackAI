// 封装RAG相关逻辑，包含文档转文字，文档切块，文字转向量，重排
import mammoth from "mammoth";
import pdf from "pdf-parse";

const EMBEDDING_API_URL = "https://api.siliconflow.cn/v1/embeddings";
const EMBEDDING_MODEL = "BAAI/bge-m3";
const RAG_API_TIMEOUT_MS = 10000;

/**
 * 文件解析工具：将不同格式的文件转为纯文本
 */
export async function parseFileToText(
  fileBuffer: Buffer,
  fileType: string,
): Promise<string> {
  try {
    // PDF 处理
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

    throw new Error(`不支持的文件类型: ${fileType}`);
  } catch (error) {
    console.error("解析文件失败:", error);
    throw new Error("文件内容读取失败，请检查文件是否加密或损坏");
  }
}

/**
 * 递归分割文档。
 * 作为语义分块失败时的保底方案，也负责切开过长的单句。
 */
export function recursiveSplit(
  text: string,
  chunkSize: number = 600,
  chunkOverlap: number = 100,
): string[] {
  // 按照优先级分割：段落 > 换行 > 标点符号
  const separators = ["\n\n", "\n", "。", "！", "？", "!", "?", " ", ""];
  const finalChunks: string[] = [];

  function split(content: string, separatorIndex: number) {
    // 如果内容已经足够小，直接保存
    if (content.length <= chunkSize) {
      const trimmed = content.trim();
      if (trimmed) finalChunks.push(trimmed);
      return;
    }

    // 所有分隔符都无法继续切分时，按长度强制截断
    if (separatorIndex >= separators.length) {
      finalChunks.push(content.slice(0, chunkSize));
      split(content.slice(chunkSize), separatorIndex);
      return;
    }

    const separator = separators[separatorIndex];
    const parts = content.split(separator);
    let currentBuffer = "";

    for (const part of parts) {
      const nextBuffer = currentBuffer
        ? `${currentBuffer}${separator}${part}`
        : part;

      if (nextBuffer.length <= chunkSize) {
        currentBuffer = nextBuffer;
        continue;
      }

      if (currentBuffer) finalChunks.push(currentBuffer.trim());
      split(part, separatorIndex + 1);
      currentBuffer = "";
    }

    if (currentBuffer) finalChunks.push(currentBuffer.trim());
  }

  split(text, 0);

  // chunkOverlap 重叠
  if (finalChunks.length <= 1 || chunkOverlap <= 0) return finalChunks;

  return finalChunks.map((chunk, index) => {
    if (index === 0) return chunk;
    const overlap = finalChunks[index - 1].slice(-chunkOverlap);
    return overlap + chunk;
  });
}

/**
 * 基于 embedding 的语义分块。
 *
 * 先把文档拆成句子，再比较相邻句子的向量相似度：
 * 相似度低，说明主题可能发生变化，此处就建立新的 chunk。
 * chunkSize 和 chunkOverlap 仍然负责控制最终文本块的大小和上下文衔接。
 */
export async function semanticSplit(
  text: string,
  chunkSize: number = 600,
  chunkOverlap: number = 100,
  similarityThreshold: number = 0.72,
): Promise<string[]> {
  const sentences = splitIntoSentences(text, chunkSize);

  if (sentences.length <= 1) return sentences;

  try {
    // 一次请求获取所有句子的向量，避免逐句请求接口。
    const embeddings = await getTextEmbeddings(sentences);

    if (embeddings.length !== sentences.length) {
      throw new Error("句子数量和向量数量不一致");
    }

    const chunks: string[] = [];
    let currentChunk = sentences[0];

    for (let i = 1; i < sentences.length; i++) {
      const sentence = sentences[i];
      const similarity = cosineSimilarity(embeddings[i - 1], embeddings[i]);
      const mergedChunk = `${currentChunk}\n${sentence}`;

      // 主题变化或合并后超出长度限制时，开始新的 chunk。
      if (similarity < similarityThreshold || mergedChunk.length > chunkSize) {
        chunks.push(currentChunk);
        currentChunk = sentence;
      } else {
        currentChunk = mergedChunk;
      }
    }

    chunks.push(currentChunk);

    // 给相邻 chunk 保留少量上下文，避免答案刚好跨越分块边界。
    if (chunks.length <= 1 || chunkOverlap <= 0) return chunks;

    return chunks.map((chunk, index) => {
      if (index === 0) return chunk;
      const overlap = chunks[index - 1].slice(-chunkOverlap);
      return overlap + chunk;
    });
  } catch (error) {
    // embedding 服务异常时仍然允许文件上传完成，退回普通递归分块。
    console.error("语义分块失败，退回递归分块:", error);
    return recursiveSplit(text, chunkSize, chunkOverlap);
  }
}

/**
 * 将文档切成适合计算相似度的句子单元。
 * 过长的单句无法再靠语义边界切开时，才使用递归分块强制拆分。
 */
function splitIntoSentences(text: string, maxSize: number): string[] {
  const sentences: string[] = [];
  const paragraphs = text.split(/\n{2,}/);

  for (const paragraph of paragraphs) {
    const content = paragraph.trim();
    if (!content) continue;

    const parts = content.match(/[^。！？!?；;.\n]+[。！？!?；;.]?/g) || [
      content,
    ];

    for (const part of parts) {
      const sentence = part.trim();
      if (!sentence) continue;

      if (sentence.length <= maxSize) {
        sentences.push(sentence);
      } else {
        sentences.push(...recursiveSplit(sentence, maxSize, 0));
      }
    }
  }

  return sentences;
}

/**
 * 计算两个向量的余弦相似度。
 * 返回值越接近 1，表示两个文本单元的语义越接近。
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let aLength = 0;
  let bLength = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    aLength += a[i] * a[i];
    bLength += b[i] * b[i];
  }

  if (aLength === 0 || bLength === 0) return 0;
  return dotProduct / (Math.sqrt(aLength) * Math.sqrt(bLength));
}

/**
 * 批量获取文本向量，供语义分块使用。
 */
async function getTextEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await fetch(EMBEDDING_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SILICONFLOW_API_KEY}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
    }),
    signal: AbortSignal.timeout(RAG_API_TIMEOUT_MS),
  });

  if (!response.ok) throw new Error("获取语义分块向量失败");

  const { data } = await response.json();
  return data.map((item: { embedding: number[] }) => item.embedding);
}

/**
 * 获取提问的向量
 */
export async function getQueryEmbedding(query: string): Promise<number[]> {
  const response = await fetch(EMBEDDING_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SILICONFLOW_API_KEY}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: [query],
    }),
    signal: AbortSignal.timeout(RAG_API_TIMEOUT_MS),
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

  try {
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
      signal: AbortSignal.timeout(RAG_API_TIMEOUT_MS),
    });

    if (!response.ok) throw new Error("Rerank 请求失败");

    const { results } = await response.json();
    // 根据重排得分返回对应的文本内容
    return results.map((result: { index: number }) => chunks[result.index]);
  } catch (error) {
    console.error("Rerank 失败，保留原始片段顺序:", error);
    return chunks.slice(0, 5);
  }
}
