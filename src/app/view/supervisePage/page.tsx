"use client";
import React, { useEffect, useRef, useState } from "react";
import { Layout, Button, message, Empty, Spin } from "antd";
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import styles from "./supervise.module.scss";
import http from "@/lib/utils/http";
import { ROUTES } from "@/lib/constants/routes";
import dayjs from "dayjs";
import rrwebPlayer from "rrweb-player";
import "rrweb-player/dist/style.css";

const { Header, Sider, Content } = Layout;

type ErrorEvent = {
  id: number;
  error: any;
  events: any;
  createdAt: string;
};

export default function SupervisePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [errorEvents, setErrorEvents] = useState<ErrorEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<ErrorEvent | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const replayerContainer = useRef<HTMLDivElement>(null);
  const playerInstance = useRef<any>(null);

  // 检查权限并获取数据
  useEffect(() => {
    const init = async () => {
      try {
        //检查管理员权限
        const adminRes = (await http.get("/api/admin/check")) as {
          code: number;
          data: { isAdmin: boolean };
        };
        if (adminRes.code !== 0 || !adminRes.data.isAdmin) {
          message.error("您没有权限访问此页面");
          router.replace(ROUTES.chatHome);
          return;
        }
        setIsAdmin(true);

        //获取错误列表
        fetchErrorEvents();
      } catch (error) {
        console.error("初始化监控页面失败:", error);
        router.replace(ROUTES.chatHome);
      }
    };
    init();
  }, [router]);
  // 拉取所有错误日志
  const fetchErrorEvents = async () => {
    setLoading(true);
    try {
      const res = (await http.get("/api/errorEvents")) as {
        code: number;
        data: ErrorEvent[];
      };
      if (res.code === 0) {
        setErrorEvents(res.data);
      }
    } catch (error) {
      console.error("获取错误列表失败:", error);
      message.error("获取错误列表失败");
    } finally {
      setLoading(false);
    }
  };

  // 当选择变化时，重新渲染播放器
  useEffect(() => {
    if (selectedEvent && replayerContainer.current) {
      // 清空容器
      replayerContainer.current.innerHTML = "";

      // 2. 解析事件数据
      const events =
        typeof selectedEvent.events === "string"
          ? JSON.parse(selectedEvent.events)
          : selectedEvent.events;

      // 3. 校验数据完整性（至少要有 Meta(4) 或 FullSnapshot(2) 之一）
      const hasInitEvent = events.some(
        (e: any) => e.type === 2 || e.type === 4,
      );

      if (events && events.length > 2 && hasInitEvent) {
        try {
          playerInstance.current = new rrwebPlayer({
            target: replayerContainer.current,
            props: {
              events,
              width: replayerContainer.current.offsetWidth || 800,
              height: 500,
              autoPlay: false,
            },
          });
        } catch (e) {
          console.error("rrweb-player 初始化失败:", e);
        }
      } else {
        replayerContainer.current.innerHTML =
          '<div style="color: #999; text-align: center; padding: 20px;">回放数据不完整（缺少页面初始化信息）</div>';
      }
    }

    return () => {
      if (playerInstance.current) {
        playerInstance.current = null;
      }
    };
  }, [selectedEvent]);

  const handleBack = () => router.back();

  if (!isAdmin) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spin size="large" tip="正在校验权限..." />
      </div>
    );
  }

  const errorInfo = selectedEvent?.error
    ? typeof selectedEvent.error === "string"
      ? JSON.parse(selectedEvent.error)
      : selectedEvent.error
    : null;

  return (
    <Layout className={styles.layout}>
      <Sider
        width={320}
        collapsedWidth={0}
        collapsible
        collapsed={collapsed}
        trigger={null}
        className={styles.left}
      >
        <div className={styles.siderHeader}>
          <h2>错误监控列表</h2>
          <Button
            type="text"
            icon={<ReloadOutlined />}
            onClick={fetchErrorEvents}
            loading={loading}
          />
        </div>
        <div className={styles.eventList}>
          {errorEvents.map((item) => {
            const itemError =
              typeof item.error === "string"
                ? JSON.parse(item.error)
                : item.error;
            return (
              <div
                key={item.id}
                className={`${styles.eventItem} ${selectedEvent?.id === item.id ? styles.active : ""}`}
                onClick={() => setSelectedEvent(item)}
              >
                <span className={styles.errorName}>
                  {itemError?.message || "未知错误"}
                </span>
                <span className={styles.errorTime}>
                  {dayjs(item.createdAt).format("MM-DD HH:mm:ss")}
                </span>
              </div>
            );
          })}
          {errorEvents.length === 0 && !loading && (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无错误记录"
              style={{ marginTop: 40 }}
            />
          )}
        </div>
      </Sider>

      <Layout className={styles.right}>
        <Header className={styles.header}>
          <div className={styles.headerLeft}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
            />
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={handleBack}
            />
            <h1 className={styles.title}>错误详情</h1>
          </div>
          <div style={{ color: "#bfbfbf" }}>
            {selectedEvent ? `Event ID: ${selectedEvent.id}` : ""}
          </div>
        </Header>

        <Content className={styles.content}>
          {selectedEvent ? (
            <div className={styles.detailWrapper}>
              <div className={styles.detailCard}>
                <div className={styles.sectionTitle}>错误堆栈</div>
                <div className={styles.errorInfo}>
                  <div
                    style={{
                      marginBottom: 12,
                      color: "#cf1322",
                      fontWeight: "bold",
                    }}
                  >
                    {errorInfo?.name}: {errorInfo?.message}
                  </div>
                  <div
                    style={{ color: "#8c8c8c", fontSize: 12, marginBottom: 8 }}
                  >
                    时间:{" "}
                    {errorInfo?.time ||
                      dayjs(selectedEvent.createdAt).format(
                        "YYYY-MM-DD HH:mm:ss",
                      )}
                  </div>
                  {errorInfo?.stack}
                </div>
              </div>
              <div className={styles.detailCard}>
                <div className={styles.sectionTitle}>行为回放</div>
                <div className={styles.playerContainer}>
                  <div
                    ref={replayerContainer}
                    className={styles.rrwebPlayer}
                  ></div>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.empty}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="请从左侧选择一个错误事件查看详情"
              />
            </div>
          )}
        </Content>
      </Layout>
    </Layout>
  );
}
