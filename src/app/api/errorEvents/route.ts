import { NextRequest, NextResponse } from "next/server";
import { addErrorEvent, getAllErrorEvents } from "@/db";
import { createClient } from "@/lib/supabase/server";

// 上报错误事件
export async function POST(req: NextRequest) {
  try {
    const { error, events } = await req.json();

    if (!error || !events) {
      return NextResponse.json(
        { code: 1, message: "参数错误，上报错误失败" },
        { status: 400 },
      );
    }

    const result = await addErrorEvent(error, events);

    return NextResponse.json({ code: 0, data: result }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "上报错误失败";
    return NextResponse.json({ code: 1, message }, { status: 500 });
  }
}

// 获取所有错误事件 (仅管理员)
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.email !== process.env.MY_QQ_EMAIL) {
      return NextResponse.json(
        { code: 1, message: "无权访问" },
        { status: 403 },
      );
    }

    const events = await getAllErrorEvents();
    return NextResponse.json({ code: 0, data: events }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "获取错误列表失败";
    return NextResponse.json({ code: 1, message }, { status: 500 });
  }
}
