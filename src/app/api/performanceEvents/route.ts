import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  addPerformanceEvent,
  countPerformanceEvents,
  deletePerformanceEventById,
  getAllPerformanceEvents,
} from "@/db";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ code: 1, message: "未登录" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const [events, total] = await Promise.all([
      getAllPerformanceEvents(page, pageSize),
      countPerformanceEvents(),
    ]);
    return NextResponse.json({ code: 0, data: events, total });
  } catch (e) {
    const message = e instanceof Error ? e.message : "获取性能数据失败";
    return NextResponse.json({ code: 1, message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { path, metrics } = await req.json();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const event = await addPerformanceEvent(user?.id || null, path, metrics);
    return NextResponse.json({ code: 0, data: event });
  } catch (e) {
    console.error("POST /api/performanceEvents error:", e);
    const message = e instanceof Error ? e.message : "上报性能数据失败";
    return NextResponse.json({ code: 1, message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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

    const id = Number(req.nextUrl.searchParams.get("id"));
    if (isNaN(id)) {
      return NextResponse.json(
        { code: 1, message: "无效的性能日志 ID" },
        { status: 400 },
      );
    }

    const deleted = await deletePerformanceEventById(id);
    if (!deleted) {
      return NextResponse.json(
        { code: 1, message: "性能日志不存在或已删除" },
        { status: 404 },
      );
    }

    return NextResponse.json({ code: 0, data: deleted }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "删除性能日志失败";
    return NextResponse.json({ code: 1, message }, { status: 500 });
  }
}
