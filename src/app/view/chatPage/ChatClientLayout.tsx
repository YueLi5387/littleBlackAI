"use client";
import React, { useState, useCallback, useMemo } from "react";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusCircleOutlined,
  MoreOutlined,
  MonitorOutlined,
  LogoutOutlined,
  BugOutlined,
} from "@ant-design/icons";
import { Button, Layout, Menu, theme, Select, Dropdown } from "antd";
import styles from "./view.module.scss";
import { useRouter, useParams } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { createClient } from "@/lib/supabase/client";
import dayjs from "dayjs";
import throttle from "lodash/throttle";
import { useTranslation } from "react-i18next";

const { Header, Sider, Content } = Layout;
const { Option } = Select;

type ChatItem = {
  id: string | number;
  title: string;
  createdAt?: string;
};

export const Ctx = React.createContext<{
  chat: ChatItem[];
  setChat: React.Dispatch<React.SetStateAction<ChatItem[]>>;
} | null>(null);

interface ChatClientLayoutProps {
  children: React.ReactNode;
  initialChats: ChatItem[];
  isAdmin: boolean;
}
/**
@initialChats: 初始聊天列表
@isAdmin: 是否为管理员
**/
export default function ChatClientLayout({
  children,
  initialChats,
  isAdmin: initialIsAdmin,
}: ChatClientLayoutProps) {
  const { t, i18n } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileVisible, setMobileVisible] = useState(false);
  const router = useRouter();
  const params = useParams<{ chat_id: string }>();
  const {
    token: { colorBgContainer },
  } = theme.useToken();
  const supabase = createClient();
  const [chat, setChat] = useState<ChatItem[]>(initialChats);
  const [isAdmin, setIsAdmin] = useState(initialIsAdmin);

  // 获取当前对话标题
  const currentChat = chat.find((item) => String(item.id) === params.chat_id);
  const headerTitle = currentChat?.title || t("common.newChat");

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

  const moreMenuItems = useMemo(() => {
    const items = [];
    items.push({
      key: "language",
      label: (
        <Select
          value={i18n.language.split("-")[0]}
          style={{ width: "100%" }}
          onChange={(value) => i18n.changeLanguage(value)}
          size="small"
          onClick={(e) => e.stopPropagation()}
        >
          <Option value="zh">{t("common.china")}</Option>
          <Option value="en">{t("common.English")}</Option>
          <Option value="jp">{t("common.Jap")}</Option>
        </Select>
      ),
    });
    if (isAdmin) {
      items.push({
        key: "errorTest",
        icon: <BugOutlined />,
        label: t("common.errorTest"),
        onClick: () => {
          console.log(
            "错误演示，控制台打印---",
            (window as any).ooojijsahicxb非.name,
          );
        },
      });
      items.push({
        key: "supervise",
        icon: <MonitorOutlined />,
        label: t("common.monitor"),
        onClick: handleGoSupervise,
      });
    }
    items.push({
      key: "logout",
      icon: <LogoutOutlined />,
      label: t("common.logout"),
      onClick: handleLogout,
    });
    return { items };
  }, [isAdmin, handleGoSupervise, handleLogout, t, i18n]);

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
      {/* 移动端遮罩 */}
      {mobileVisible && (
        <div
          className={styles.mobileMask}
          onClick={() => setMobileVisible(false)}
        />
      )}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className={`${styles.left} ${mobileVisible ? styles.mobileVisible : ""}`}
        width={260}
      >
        <div style={{ padding: "16px", textAlign: "center" }}>
          <Button
            type="primary"
            icon={<PlusCircleOutlined />}
            onClick={() => {
              handleNewChat();
              setMobileVisible(false);
            }}
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
          onClick={(e) => {
            handleMenuClick(e);
            setMobileVisible(false);
          }}
          items={menuItems}
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
            onClick={() => {
              if (window.innerWidth <= 768) {
                setMobileVisible(!mobileVisible);
              } else {
                setCollapsed(!collapsed);
              }
            }}
            style={{
              fontSize: "16px",
              width: 54,
              height: 64,
            }}
          />
          <h1 className={styles.title}>{headerTitle}</h1>
          <div className={styles.headerActions}>
            {/* PC 端：完全平铺，无更多按钮 */}
            <div className={styles.desktopOnly}>
              <Select
                value={i18n.language.split("-")[0]}
                style={{ width: 100 }}
                onChange={(value) => i18n.changeLanguage(value)}
                size="small"
              >
                <Option value="zh">{t("common.china")}</Option>
                <Option value="en">{t("common.English")}</Option>
                <Option value="jp">{t("common.Jap")}</Option>
              </Select>
              {isAdmin && (
                <>
                  <Button
                    type="primary"
                    ghost
                    danger
                    size="small"
                    onClick={() => {
                      console.log(
                        "错误演示，控制台打印---",
                        (window as any).ooojijsahicxb非.name,
                      );
                    }}
                  >
                    {t("common.errorTest")}
                  </Button>
                  <Button
                    type="primary"
                    ghost
                    size="small"
                    onClick={handleGoSupervise}
                  >
                    {t("common.monitor")}
                  </Button>
                </>
              )}
              <Button type="primary" ghost size="small" onClick={handleLogout}>
                {t("common.logout")}
              </Button>
            </div>

            {/* 移动端：仅展示更多按钮面板 */}
            <div className={styles.mobileOnly}>
              <Dropdown
                menu={moreMenuItems}
                trigger={["click"]}
                placement="bottomRight"
              >
                <Button
                  type="text"
                  icon={<MoreOutlined style={{ fontSize: "20px" }} />}
                />
              </Dropdown>
            </div>
          </div>
        </Header>
        <Content
          style={{
            margin: "12px 12px 0",
            minHeight: 280,
          }}
          className={styles.content}
        >
          <Ctx.Provider value={{ chat, setChat }}>{children}</Ctx.Provider>
        </Content>
      </Layout>
    </Layout>
  );
}
