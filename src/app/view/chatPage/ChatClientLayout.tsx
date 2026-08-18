"use client";
import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusCircleOutlined,
  MoreOutlined,
  MonitorOutlined,
  LogoutOutlined,
  BugOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import {
  Button,
  Layout,
  Menu,
  theme,
  Select,
  Dropdown,
  Spin,
  Popconfirm,
  message,
} from "antd";
import styles from "./view.module.scss";
import { useRouter, useParams } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { createClient } from "@/lib/supabase/client";
import http from "@/lib/utils/http";
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
  const [chatPage, setChatPage] = useState(1);
  const [chatHasMore, setChatHasMore] = useState(true);
  const [chatLoadingMore, setChatLoadingMore] = useState(false);
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
  const siderRef = useRef<HTMLDivElement>(null);

  // 侧边栏滚动加载
  const handleSiderScroll = useCallback(async () => {
    if (chatLoadingMore || !chatHasMore || !siderRef.current) return;
    const { scrollHeight, scrollTop, clientHeight } = siderRef.current;
    if (scrollHeight - scrollTop - clientHeight < 50) {
      setChatLoadingMore(true);
      try {
        const res = (await http.get(
          `/api/chat?page=${chatPage + 1}&pageSize=17`,
        )) as { code: number; data: ChatItem[]; hasMore: boolean };
        if (res.code === 0) {
          setChat((prev) => [...prev, ...res.data]);
          setChatHasMore(res.hasMore);
          setChatPage((p) => p + 1);
        }
      } finally {
        setChatLoadingMore(false);
      }
    }
  }, [chatPage, chatLoadingMore, chatHasMore]);

  // 服务端 initialChats 更新时重置分页
  useEffect(() => {
    setChat(initialChats);
    setChatPage(1);
    setChatHasMore(initialChats.length === 17);
  }, [initialChats]);

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

  const handleDeleteChat = useCallback(
    async (chatId: string) => {
      setDeletingChatId(chatId);
      try {
        const res = (await http.delete(`/api/chat/${chatId}`)) as {
          code: number;
        };
        if (res.code === 0) {
          setChat((prev) => prev.filter((item) => String(item.id) !== chatId));
          if (params.chat_id === chatId) router.replace(ROUTES.chatHome);
          message.success("已删除对话");
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "删除对话失败";
        message.error(errorMessage);
      } finally {
        setDeletingChatId(null);
      }
    },
    [params.chat_id, router],
  );

  const renderChatMenuLabel = useCallback(
    (item: ChatItem) => {
      const chatId = String(item.id);
      const isDeleting = deletingChatId === chatId;

      return (
        <div className={styles.chatMenuItem}>
          <div className={styles.chatMenuText}>
            <span className={styles.chatTitle}>{item.title}</span>
            {!collapsed && (
              <span className={styles.chatTime}>
                {dayjs(item.createdAt).format("YYYY-MM-DD HH:mm")}
              </span>
            )}
          </div>
          {!collapsed && (
            <Popconfirm
              title="确认删除这个对话吗？"
              okText={t("common.confirm")}
              cancelText={t("common.cancel")}
              onConfirm={(event) => {
                event?.stopPropagation();
                void handleDeleteChat(chatId);
              }}
            >
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                loading={isDeleting}
                className={styles.chatDeleteBtn}
                onClick={(event) => event.stopPropagation()}
              />
            </Popconfirm>
          )}
        </div>
      );
    },
    [collapsed, deletingChatId, handleDeleteChat, t],
  );

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
      label: renderChatMenuLabel(item),
    }));
  }, [chat, renderChatMenuLabel]);

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
        ref={siderRef}
        onScroll={handleSiderScroll}
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
        {!collapsed &&
          chat.length >= 17 &&
          (chatLoadingMore || !chatHasMore) && (
            <div
              style={{
                padding: "16px",
                textAlign: "center",
                color: "rgba(255,255,255,0.35)",
                fontSize: 12,
                opacity: chatLoadingMore ? 1 : 0.6,
                transition: "opacity 0.3s ease",
              }}
            >
              {chatLoadingMore ? (
                <Spin
                  size="small"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                />
              ) : (
                <span>{t("common.noMore")}</span>
              )}
            </div>
          )}
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
                <Option value="ja">{t("common.Jap")}</Option>
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
