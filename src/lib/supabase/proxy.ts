import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ROUTES } from "@/lib/constants/routes";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      // 配置cookie处理：让Supabase自动管理登录会话的cookie
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // 核心：校验用户会话
  // 警告：createServerClient 和 getClaims 之间不要插入任何代码！
  // 否则可能导致用户会话随机失效，难以调试
  // getClaims()：获取当前用户的JWT声明（校验用户是否已登录，维持会话）
  // 重要：如果移除这行，服务端渲染时用户可能被随机登出
  const {
    data: { user },
  } = await supabase.auth.getUser();

  //未登录重定向逻辑
  // 条件：
  // 1. 无用户会话
  // 2. 当前访问的不是登录页
  // 3. 当前访问的不是auth回调页（Supabase登录回调需要放行）
  // 4. 当前访问的不是公开的监控 API（上报性能和错误需要放行）
  const isPublicPath =
    request.nextUrl.pathname === "/" ||
    request.nextUrl.pathname.startsWith(ROUTES.login) ||
    request.nextUrl.pathname.startsWith(ROUTES.authConfirm) ||
    request.nextUrl.pathname === "/api/performanceEvents" ||
    request.nextUrl.pathname === "/api/errorEvents";

  if (!user && !isPublicPath) {
    // 没有登录，重定向到登录页
    const url = request.nextUrl.clone();
    url.pathname = ROUTES.login;
    // 返回重定向响应
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
