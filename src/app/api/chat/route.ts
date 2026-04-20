import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addChat, getAllChats } from "@/db";
// 获取对话组
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ code: 1, message: "未登录" }, { status: 401 });
    }

    const chats = await getAllChats(user.id);
    return NextResponse.json(
      { code: 0, data: chats },
      {
        status: 200,
      },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "获取聊天列表失败";
    return NextResponse.json({ code: 1, message }, { status: 500 });
  }
}
// 新建对话组
export async function POST(req: NextRequest) {
  try {
    const res = await req.json();
    const { title, model } = res;
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { message: "未登录或登录已过期" },
        { status: 401 },
      );
    }

    const safeTitle = (title ?? "").trim() || "新对话";
    const safeModel = (model ?? "").trim() || "deepseek-chat";
    const chat = await addChat(user.id, safeTitle, safeModel);

    return NextResponse.json(
      {
        code: 0,
        data: {
          chatId: String(chat.id),
        },
      },
      { status: 200 },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "创建新对话失败";
    return NextResponse.json({ code: 1, message }, { status: 500 });
  }
}
