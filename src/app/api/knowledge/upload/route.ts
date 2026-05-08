import { NextRequest, NextResponse } from "next/server";
import { parseFileToText, recursiveSplit } from "@/lib/utils/ragUtils";
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

    //  文档切片 (递归分割 + Overlap)
    const chunks = recursiveSplit(text, 600, 100);

    //  获取向量 (硅基流动 BGE-M3)
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
      },
    );

    if (!embeddingsResponse.ok) {
      const error = await embeddingsResponse.json();
      throw new Error(error.message || "获取向量失败");
    }

    const { data: embeddingData } = await embeddingsResponse.json();

    // 存入数据库
    // 先清理该对话旧的知识库（每个对话目前只支持一个活动文件）
    await deleteKnowledgeChunksByChatId(Number(chatId));

    const records = chunks.map((content, index) => ({
      chatId: Number(chatId),
      content,
      embedding: embeddingData[index].embedding,
    }));

    await addKnowledgeChunks(records);

    return NextResponse.json({
      code: 0,
      message: "上传并解析成功",
      data: {
        chunkCount: chunks.length,
      },
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { code: 1, message: error.message || "上传失败" },
      { status: 500 },
    );
  }
}
