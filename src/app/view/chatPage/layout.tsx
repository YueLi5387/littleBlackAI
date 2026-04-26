import React from "react";
import { getAllChats } from "@/db";
import { createClient } from "@/lib/supabase/server";
import ChatClientLayout from "./ChatClientLayout";

export default async function ChatLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  //  在服务端预获取数据
  let initialChats: any[] = [];
  let isAdmin = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      initialChats = await getAllChats(user.id);
      isAdmin = user.email === process.env.MY_QQ_EMAIL;
    }
  } catch (error) {
    console.error("服务端获取聊天列表失败:", error);
  }

  // 将数据传给客户端组件，实现“秒开”
  return (
    <ChatClientLayout initialChats={initialChats} isAdmin={isAdmin}>
      {children}
    </ChatClientLayout>
  );
}
