"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusCircleOutlined,
} from "@ant-design/icons";
import { Button, Layout, Menu, theme, Select } from "antd";
import styles from "./view.module.scss";
import http from "@/lib/utils/http";
import { useRouter, useParams } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { createClient } from "@/lib/supabase/client";
import dayjs from "dayjs";
import throttle from "lodash/throttle";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";

const { Header, Sider, Content } = Layout;
const { Option } = Select;

type ChatItem = {
  id: string | number;
  title: string;
  createdAt?: string;
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
  const { t, i18n } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const params = useParams<{ chat_id: string }>();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const supabase = createClient();
  const [chat, setChat] = useState<ChatItem[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // 获取当前对话标题
  const currentChat = chat.find((item) => String(item.id) === params.chat_id);
  const headerTitle = currentChat?.title || t("common.newChat");

  // 进入页面拉取聊天列表和管理员状态
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
    // 判断是不是管理员，是管理员显示“监控按钮”
    const checkAdmin = async () => {
      try {
        const res = (await http.get("/api/admin/check")) as {
          code: number;
          data: { isAdmin: boolean };
        };
        if (res.code === 0) {
          setIsAdmin(res.data.isAdmin);
        }
      } catch (error) {
        console.error("检查管理员状态失败:", error);
      }
    };

    fetchChats();
    checkAdmin();
  }, []);

  // 新建对话
  const handleNewChat = useCallback(
    throttle(
      () => {
        router.push(ROUTES.chatHome);
      },
      1000,
      { trailing: false },
    ),
    [router],
  );

  // 跳转特定对话组
  const handleMenuClick = ({ key }: { key: string }) => {
    router.push(ROUTES.chatDetail(key));
  };

  // 跳转监控页面
  const handleGoSupervise = useCallback(
    throttle(
      () => {
        router.push(ROUTES.supervise);
      },
      1000,
      { trailing: false },
    ),
    [router],
  );

  // 退出登录
  const handleLogout = useCallback(
    throttle(
      async () => {
        await supabase.auth.signOut();
        router.replace(ROUTES.login);
      },
      1000,
      { trailing: false },
    ),
    [supabase.auth, router],
  );
  // 测试报错
  // const test = () => {
  //   console.log("dsds", oooo);
  //   http.get("/api/sss");
  // };

  const menuItems = useMemo(() => {
    return chat.map((item) => ({
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
    }));
  }, [chat, collapsed]);

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
            {!collapsed && t("common.newChat")}
          </Button>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={params.chat_id ? [params.chat_id] : []}
          onClick={handleMenuClick}
          items={menuItems}
        />
      </Sider>
      <Layout className={styles.right}>
        <Header
          style={{ padding: 0, background: colorBgContainer }}
          className={styles.header}
        >
          {/* ------测试报错--- */}
          {/* 
          <form>
            <button onClick={() => test()}>dihdiwhdiwh</button>
            <input type="text" />
          </form> */}
          {/* --------- */}

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
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <Select
              value={i18n.language.split("-")[0]} // 处理 zh-CN 这种情况
              style={{ width: 100 }}
              onChange={(value) => i18n.changeLanguage(value)}
              size="small"
            >
              <Option value="zh">中文</Option>
              <Option value="en">English</Option>
              <Option value="jp">日本語</Option>
            </Select>
            {isAdmin && (
              <Button type="primary" ghost onClick={handleGoSupervise}>
                {t("common.monitor")}
              </Button>
            )}
            <Button type="primary" ghost onClick={handleLogout}>
              {t("common.logout")}
            </Button>
          </div>
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
