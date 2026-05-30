import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addPerformanceEvent, getAllPerformanceEvents, countPerformanceEvents } from "@/db";

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
