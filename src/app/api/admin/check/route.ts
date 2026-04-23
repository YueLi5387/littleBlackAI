import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isAdmin = user?.email === process.env.MY_QQ_EMAIL;

    return NextResponse.json({ code: 0, data: { isAdmin } });
  } catch (e) {
    return NextResponse.json({ code: 1, data: { isAdmin: false } });
  }
}
