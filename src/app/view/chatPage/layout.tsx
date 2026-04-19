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

const { Header, Sider, Content } = Layout;
export const Ctx = React.createContext<{
  chat: any[];
  setChat: React.Dispatch<React.SetStateAction<any[]>>;
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

  const [chat, setChat] = useState<any[]>([]);

  // 进入页面拉取聊天列表
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = (await http.get("/api/chat")) as any;
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
            label: item.title,
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
          <h1 className={styles.title}>标题</h1>
          <Button type="text">退出登录</Button>
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
