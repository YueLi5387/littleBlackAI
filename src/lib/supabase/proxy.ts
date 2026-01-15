import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 核心：校验用户会话
  // 警告：createServerClient 和 getClaims 之间不要插入任何代码！
  // 否则可能导致用户会话随机失效，难以调试
  // getClaims()：获取当前用户的JWT声明（校验用户是否已登录，维持会话）
  // 重要：如果移除这行，服务端渲染时用户可能被随机登出
  const { data } = await supabase.auth.getClaims();

  // 提取用户信息：data.claims包含用户的JWT载荷（未登录则为null/undefined）
  const user = data?.claims;
  //未登录重定向逻辑
  // 条件：
  // 1. 无用户会话（!user）
  // 2. 当前访问的不是登录页（避免死循环：登录页本身不需要重定向）
  // 3. 当前访问的不是auth回调页（Supabase登录回调需要放行）
  if (
    !user &&
    request.nextUrl.pathname !== "/" &&
    !request.nextUrl.pathname.startsWith("/view/loginPage")
    // !request.nextUrl.pathname.startsWith("/auth")
  ) {
    // 没有登录，重定向到登录页
    const url = request.nextUrl.clone();
    url.pathname = "/view/loginPage";
    // 返回重定向响应
    return NextResponse.redirect(url);
  }

  // 响应返回规则
  // 重要：必须返回supabaseResponse对象，不能新建空的NextResponse！
  // 如果需要自定义响应，必须遵循4步：
  // 1. 新建响应时传入request：const myRes = NextResponse.next({ request })
  // 2. 复制cookie：myRes.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. 自定义修改（如改header、状态码），但不要动cookie
  // 4. 返回myRes
  // 否则会导致浏览器和服务端cookie不同步，用户会话提前终止！

  // 返回处理后的响应（包含cookie更新/或正常放行）

  return supabaseResponse;
}
