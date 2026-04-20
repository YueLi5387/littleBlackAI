import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteMessageById, getAllMessages, getChatById } from "@/db";

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
    if (isNaN(chatId)) {
      return NextResponse.json(
        { code: 1, message: "无效的聊天ID" },
        { status: 400 },
      );
    }

    const messages = await getAllMessages(chatId);

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

// 删除该 chat_id 对话组下的一条消息
export async function DELETE(
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
    if (isNaN(chatId)) {
      return NextResponse.json(
        { code: 1, message: "无效的聊天ID" },
        { status: 400 },
      );
    }

    const messageIdParam = req.nextUrl.searchParams.get("messageId");
    const messageId = Number(messageIdParam);
    if (!messageIdParam || isNaN(messageId)) {
      return NextResponse.json(
        { code: 1, message: "无效的消息ID" },
        { status: 400 },
      );
    }

    // 防止“越权删除“，如果数据库里根本没这个对话组或者这个对话组的主人 ID，不是当前登录用户的 ID，就不能删除
    const chat = await getChatById(chatId);
    if (!chat || chat.userId !== user.id) {
      return NextResponse.json(
        { code: 1, message: "无权限操作该对话" },
        { status: 403 },
      );
    }

    const deleted = await deleteMessageById(chatId, messageId);
    if (!deleted) {
      return NextResponse.json(
        { code: 1, message: "消息不存在或已删除" },
        { status: 404 },
      );
    }

    return NextResponse.json({ code: 0, data: deleted }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "删除消息失败";
    return NextResponse.json({ code: 1, message }, { status: 500 });
  }
}
