import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAllMessages } from "@/db";

// 获取改chat_id对话组下的所有聊天信息
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ chat_id: string }> },
) {
  try {
    const { chat_id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ code: 1, message: "未登录" }, { status: 401 });
    }

    const chatId = Number(chat_id);
    console.log("chatId--->", chatId);
    if (isNaN(chatId)) {
      return NextResponse.json(
        { code: 1, message: "无效的聊天ID" },
        { status: 400 },
      );
    }

    const messages = await getAllMessages(chatId);
    console.log("获取所有message-->", messages);

    // 转换为前端 useChat 需要的格式
    const formattedMessages = messages.map((msg) => ({
      id: String(msg.id),
      role: msg.role,
      content: msg.content,
      createdAt: msg.createdAt,
    }));

    return NextResponse.json(
      { code: 0, data: formattedMessages },
      { status: 200 },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "获取历史消息失败";
    return NextResponse.json({ code: 1, message, data: null }, { status: 500 });
  }
}
