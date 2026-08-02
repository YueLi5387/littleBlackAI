// 文件转文字--》分块----》转向量----》存数据库
import { NextRequest, NextResponse } from "next/server";
import { parseFileToText, semanticSplit } from "@/lib/utils/ragUtils";
import { addKnowledgeChunks, deleteKnowledgeChunksByChatId } from "@/db";

// 硅基流动 API 配置
const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY;
const EMBEDDING_MODEL = "BAAI/bge-m3";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const chatId = formData.get("chatId") as string;

    if (!file || !chatId) {
      return NextResponse.json(
        { code: 1, message: "参数缺失" },
        { status: 400 },
      );
    }

    // 解析文件内容
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const text = await parseFileToText(buffer, file.type);

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ code: 1, message: "文件内容为空或解析失败" });
    }

    // 文档切片：优先使用 embedding 相似度做语义分块，失败时工具函数会回退到递归分块
    const chunks = await semanticSplit(text, 600, 100);

    let embeddings: (number[] | null)[];
    let degraded = false;

    try {
      // 获取向量。服务不可用时保留文本分块，RAG 会走文档片段兜底。
      const embeddingsResponse = await fetch(
        "https://api.siliconflow.cn/v1/embeddings",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SILICONFLOW_API_KEY}`,
          },
          body: JSON.stringify({
            model: EMBEDDING_MODEL,
            input: chunks,
          }),
          signal: AbortSignal.timeout(10000),
        },
      );

      if (!embeddingsResponse.ok) {
        const error = (await embeddingsResponse.json()) as {
          message?: string;
        };
        throw new Error(error.message || "获取向量失败");
      }

      const { data } = await embeddingsResponse.json();
      if (!Array.isArray(data) || data.length !== chunks.length) {
        throw new Error("向量数量与文档分块数量不一致");
      }
      embeddings = data.map((item: { embedding: number[] }) => item.embedding);
    } catch (error) {
      degraded = true;
      embeddings = chunks.map(() => null);
      console.error("向量服务不可用，使用文本分块降级存储:", error);
    }

    // 存入数据库
    // 先清理该对话旧的知识库（每个对话目前只支持一个活动文件）
    await deleteKnowledgeChunksByChatId(Number(chatId));

    const records = chunks.map((content, index) => ({
      chatId: Number(chatId),
      content,
      embedding: embeddings[index],
    }));

    await addKnowledgeChunks(records);

    return NextResponse.json({
      code: 0,
      message: degraded
        ? "上传成功，向量服务暂不可用，已启用基础检索"
        : "上传并解析成功",
      data: {
        chunkCount: chunks.length,
        degraded,
      },
    });
  } catch (error: unknown) {
    console.error("Upload error:", error);
    const message = error instanceof Error ? error.message : "上传失败";
    return NextResponse.json(
      { code: 1, message },
      { status: 500 },
    );
  }
}
