"use client";
import React, { useState, useEffect } from "react";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusCircleOutlined,
} from "@ant-design/icons";
import { Button, Layout, Menu, theme } from "antd";
import styles from "./view.module.scss";
import http from "@/lib/utils/http";
import { useRouter, useParams } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { createClient } from "@/lib/supabase/client";
import dayjs from "dayjs";

const { Header, Sider, Content } = Layout;

type ChatItem = {
  id: string | number;
  title: string;
  createdAt: string;
};

type ChatListResponse = {
  code: number;
  data: ChatItem[];
};

export const Ctx = React.createContext<{
  chat: ChatItem[];
  setChat: React.Dispatch<React.SetStateAction<ChatItem[]>>;
} | null>(null);

export default function ChatLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const params = useParams<{ chat_id: string }>();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const supabase = createClient();
  const [chat, setChat] = useState<ChatItem[]>([]);

  // 获取当前对话标题
  const currentChat = chat.find((item) => String(item.id) === params.chat_id);
  const headerTitle = currentChat?.title || "新对话";

  // 进入页面拉取聊天列表
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = (await http.get("/api/chat")) as ChatListResponse;
        if (res.code === 0) {
          setChat(res.data);
        }
      } catch (error) {
        console.error("获取聊天列表失败:", error);
      }
    };
    fetchChats();
  }, []);

  // 新建对话
  const handleNewChat = () => {
    router.push(ROUTES.chatHome);
  };

  // 跳转特定对话组
  const handleMenuClick = ({ key }: { key: string }) => {
    router.push(ROUTES.chatDetail(key));
  };

  // 退出登录
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace(ROUTES.login);
  };

  return (
    <Layout className={styles.layout}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className={styles.left}
      >
        <div style={{ padding: "16px", textAlign: "center" }}>
          <Button
            type="primary"
            icon={<PlusCircleOutlined />}
            onClick={handleNewChat}
            block
            style={{ marginBottom: "16px" }}
          >
            {!collapsed && "新建对话"}
          </Button>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={params.chat_id ? [params.chat_id] : []}
          onClick={handleMenuClick}
          items={chat.map((item) => ({
            key: String(item.id),
            label: (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "5px",
                  lineHeight: "1.2",
                  padding: "4px 0",
                }}
              >
                <span
                  style={{
                    fontSize: "16px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.title}
                </span>
                {!collapsed && (
                  <span
                    style={{
                      fontSize: "10px",
                      color: "rgba(255, 255, 255, 0.45)",
                    }}
                  >
                    {dayjs(item.createdAt).format("YYYY-MM-DD HH:mm")}
                  </span>
                )}
              </div>
            ),
          }))}
        />
      </Sider>
      <Layout className={styles.right}>
        <Header
          style={{ padding: 0, background: colorBgContainer }}
          className={styles.header}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: "16px",
              width: 64,
              height: 64,
            }}
          />
          <h1 className={styles.title}>{headerTitle}</h1>
          <Button type="text" onClick={handleLogout}>
            退出登录
          </Button>
        </Header>
        <Content
          style={{
            margin: "12px 10px 0px ",
            minHeight: 280,
            borderRadius: borderRadiusLG,
          }}
          className={styles.content}
        >
          <Ctx.Provider value={{ chat, setChat }}>{children}</Ctx.Provider>
        </Content>
      </Layout>
    </Layout>
  );
}
