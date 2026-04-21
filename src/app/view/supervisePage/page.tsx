"use client";
import React, { useEffect, useRef, useState } from "react";
import { Layout, Button, message, Empty, Spin, Tooltip } from "antd";
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlayCircleOutlined,
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
  const playerRef = useRef<any>(null);

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

  // 当选择变化时，重新渲染播放器
  useEffect(() => {
    if (selectedEvent && replayerContainer.current) {
      // 清空容器
      replayerContainer.current.innerHTML = "";

      const events =
        typeof selectedEvent.events === "string"
          ? JSON.parse(selectedEvent.events)
          : selectedEvent.events;

      if (events && events.length > 2) {
        playerRef.current = new rrwebPlayer({
          target: replayerContainer.current,
          props: {
            events,
            width: replayerContainer.current.offsetWidth || 800,
            height: 600,
            autoPlay: false,
          },
        });
      }
    }

    return () => {
      if (playerRef.current) {
        playerRef.current = null;
      }
    };
  }, [selectedEvent]);

  const selectEvent = (event: ErrorEvent) => {
    setSelectedEvent(event);
  };

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

  const handleBack = () => {
    router.back();
  };

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
        width={300}
        collapsedWidth={0}
        collapsible
        collapsed={collapsed}
        trigger={null}
        className={styles.left}
      >
        <div
          style={{
            padding: "16px",
            color: "#fff",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ fontSize: "16px", fontWeight: "bold" }}>
            错误监控列表
          </span>
          <Button
            type="text"
            icon={<ReloadOutlined style={{ color: "#fff" }} />}
            onClick={fetchErrorEvents}
            loading={loading}
          />
        </div>
        <div className={styles.listContainer}>
          {errorEvents.map((item) => {
            const itemError =
              typeof item.error === "string"
                ? JSON.parse(item.error)
                : item.error;
            return (
              <div
                key={item.id}
                className={`${styles.errorItem} ${selectedEvent?.id === item.id ? styles.active : ""}`}
                onClick={() => selectEvent(item)}
              >
                <div className={styles.errorTitle}>
                  {itemError?.message || "未知错误"}
                </div>
                <div className={styles.errorTime}>
                  {dayjs(item.createdAt).format("YYYY-MM-DD HH:mm:ss")}
                </div>
              </div>
            );
          })}
          {errorEvents.length === 0 && !loading && (
            <div
              style={{
                padding: "20px",
                textAlign: "center",
                color: "rgba(255,255,255,0.45)",
              }}
            >
              暂无错误记录
            </div>
          )}
        </div>
      </Sider>

      <Layout className={styles.right}>
        <Header className={styles.header}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ marginRight: "8px" }}
            />
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={handleBack}
              style={{ marginRight: "16px" }}
            />
            <h1 className={styles.title}>错误详情</h1>
          </div>
          <div style={{ color: "#999" }}>
            {selectedEvent ? `ID: ${selectedEvent.id}` : ""}
          </div>
        </Header>

        <Content className={styles.content}>
          {selectedEvent ? (
            <div className={styles.detailContainer}>
              <div className={styles.infoCard}>
                <h3>错误概览</h3>
                <div className={styles.errorBrief}>
                  <p>
                    <strong>类型:</strong> {errorInfo?.name || "Error"}
                  </p>
                  <p>
                    <strong>消息:</strong> {errorInfo?.message}
                  </p>
                  <p>
                    <strong>时间:</strong>{" "}
                    {dayjs(selectedEvent.createdAt).format(
                      "YYYY-MM-DD HH:mm:ss",
                    )}
                  </p>
                </div>
                {errorInfo?.stack && (
                  <div className={styles.stackTrace}>
                    <h4>堆栈详情:</h4>
                    <pre>{errorInfo.stack}</pre>
                  </div>
                )}
              </div>

              <div className={styles.playerCard}>
                <div className={styles.playerHeader}>
                  <h3>行为回放</h3>
                  <Tooltip title="播放用户出错前的操作轨迹">
                    <PlayCircleOutlined style={{ color: "#1890ff" }} />
                  </Tooltip>
                </div>
                <div className={styles.playerWrapper}>
                  <div
                    ref={replayerContainer}
                    className={styles.rrwebPlayer}
                  ></div>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.empty}>
              <Empty description="请从左侧选择一个错误事件查看详情" />
            </div>
          )}
        </Content>
      </Layout>
    </Layout>
  );
}
