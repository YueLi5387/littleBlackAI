"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  Layout,
  Button,
  message,
  Empty,
  Spin,
  Tabs,
  Tag,
  List,
  Card,
  Statistic,
  Row,
  Col,
} from "antd";
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BugOutlined,
  DashboardOutlined,
  RightOutlined,
  DownOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import styles from "./supervise.module.scss";
import http from "@/lib/utils/http";
import { ROUTES } from "@/lib/constants/routes";
import dayjs from "dayjs";
import rrwebPlayer from "rrweb-player";
import "rrweb-player/dist/style.css";
import { useTranslation } from "react-i18next";

const { Header, Sider, Content } = Layout;

type ErrorEvent = {
  id: number;
  error: any;
  events: any;
  createdAt: string;
};

type PerformanceEvent = {
  id: number;
  userId: string | null;
  path: string;
  metrics: {
    loadTime?: number;
    ttfb?: number;
    domReady?: number;
    fp?: number;
    fcp?: number;
    apiLatency?: number;
  };
  createdAt: string;
};

export default function SupervisePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mode, setMode] = useState<"error" | "performance">("error");
  const [errorEvents, setErrorEvents] = useState<ErrorEvent[]>([]);
  const [performanceEvents, setPerformanceEvents] = useState<
    PerformanceEvent[]
  >([]);
  const [selectedEvent, setSelectedEvent] = useState<ErrorEvent | null>(null);
  const [isErrorListExpanded, setIsErrorListExpanded] = useState(false);
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
          message.error(t("common.noPermission"));
          router.replace(ROUTES.chatHome);
          return;
        }
        setIsAdmin(true);

        //获取数据
        fetchData();
      } catch (error) {
        console.error("初始化监控页面失败:", error);
        router.replace(ROUTES.chatHome);
      }
    };
    init();
  }, [router]);

  const fetchData = () => {
    fetchErrorEvents();
    fetchPerformanceEvents();
  };

  // 拉取所有错误日志
  const fetchErrorEvents = async () => {
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
    } finally {
      setLoading(false);
    }
  };

  // 拉取性能日志
  const fetchPerformanceEvents = async () => {
    try {
      const res = (await http.get("/api/performanceEvents")) as {
        code: number;
        data: PerformanceEvent[];
      };
      if (res.code === 0) {
        setPerformanceEvents(res.data);
      } else {
        message.error(t("common.getPerfFailed"));
      }
    } catch (error) {
      console.error("获取性能列表失败:", error);
      message.error(t("common.perfConnectFailed"));
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
        <Spin size="large" />
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
          <h2 style={{ margin: 0, fontSize: 16 }}>{t("common.monitor")}</h2>
          <Button
            type="text"
            icon={<ReloadOutlined />}
            onClick={fetchData}
            loading={loading}
          />
        </div>

        <div className={styles.menuArea}>
          <div
            className={`${styles.menuItem} ${mode === "performance" ? styles.active : ""}`}
            onClick={() => {
              setMode("performance");
              setSelectedEvent(null);
            }}
          >
            <div className={styles.menuItemLeft}>
              <DashboardOutlined />
              <span>{t("common.performanceMonitor")}</span>
            </div>
          </div>

          <div
            className={`${styles.menuItem} ${mode === "error" ? styles.active : ""}`}
            onClick={() => {
              setMode("error");
              setIsErrorListExpanded(!isErrorListExpanded);
            }}
          >
            <div className={styles.menuItemLeft}>
              <BugOutlined />
              <span>{t("common.errorMonitor")}</span>
            </div>
            {isErrorListExpanded ? (
              <DownOutlined style={{ fontSize: 10 }} />
            ) : (
              <RightOutlined style={{ fontSize: 10 }} />
            )}
          </div>
        </div>

        {isErrorListExpanded && (
          <div className={styles.eventList}>
            {errorEvents.map((item) => {
              const itemError =
                typeof item.error === "string"
                  ? JSON.parse(item.error)
                  : item.error;
              return (
                <div
                  key={item.id}
                  className={`${styles.eventItem} ${mode === "error" && selectedEvent?.id === item.id ? styles.active : ""}`}
                  onClick={() => {
                    setMode("error");
                    setSelectedEvent(item);
                  }}
                >
                  <span className={styles.errorName}>
                    {itemError?.message || t("common.noRecord")}
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
                description={t("common.noRecord")}
                style={{ marginTop: 20 }}
              />
            )}
          </div>
        )}
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
            <h1 className={styles.title}>
              {mode === "error"
                ? t("common.errorMonitor")
                : t("common.performanceMonitor")}
            </h1>
          </div>
          <div style={{ color: "#bfbfbf" }}>
            {mode === "error" && selectedEvent
              ? `Event ID: ${selectedEvent.id}`
              : ""}
          </div>
        </Header>

        <Content className={styles.content}>
          {mode === "error" ? (
            selectedEvent ? (
              <div className={styles.detailWrapper}>
                <div className={styles.detailCard}>
                  <div className={styles.sectionTitle}>
                    {t("common.errorStack")}
                  </div>
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
                      style={{
                        color: "#8c8c8c",
                        fontSize: 12,
                        marginBottom: 8,
                      }}
                    >
                      {t("common.time")}:{" "}
                      {errorInfo?.time ||
                        dayjs(selectedEvent.createdAt).format(
                          "YYYY-MM-DD HH:mm:ss",
                        )}
                    </div>
                    {errorInfo?.stack}
                  </div>
                </div>
                <div className={styles.detailCard}>
                  <div className={styles.sectionTitle}>{t("common.behaviorReplay")}</div>
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
                  description={t("common.selectErrorHint")}
                />
              </div>
            )
          ) : (
            <div className={styles.perfDashboard}>
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <Card size="small">
                    <Statistic
                      title={t("common.avgLoadTime")}
                      value={
                        performanceEvents.reduce(
                          (acc, cur) => acc + (cur.metrics.loadTime || 0),
                          0,
                        ) /
                        (performanceEvents.filter((e) => e.metrics.loadTime)
                          .length || 1)
                      }
                      suffix="ms"
                      precision={0}
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small">
                    <Statistic
                      title={t("common.totalReports")}
                      value={performanceEvents.length}
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small">
                    <Statistic
                      title={t("common.activePaths")}
                      value={new Set(performanceEvents.map((e) => e.path)).size}
                    />
                  </Card>
                </Col>
              </Row>

              <div style={{ marginTop: 24 }}>
                <Card title={t("common.detailMetrics")} size="small">
                  <List
                    itemLayout="horizontal"
                    dataSource={performanceEvents}
                    pagination={{ pageSize: 10 }}
                    renderItem={(item) => (
                      <List.Item>
                        <List.Item.Meta
                          title={<span>{item.path}</span>}
                          description={
                            <Row gutter={16}>
                              <Col>
                                Load:{" "}
                                <Tag
                                  color={
                                    item.metrics.loadTime &&
                                    item.metrics.loadTime > 2000
                                      ? "red"
                                      : "green"
                                  }
                                >
                                  {item.metrics.loadTime?.toFixed(0) || "-"}ms
                                </Tag>
                              </Col>
                              <Col>
                                TTFB: {item.metrics.ttfb?.toFixed(0) || "-"}ms
                              </Col>
                              <Col>
                                {t("common.time")}:{" "}
                                {dayjs(item.createdAt).format(
                                  "YYYY-MM-DD HH:mm:ss",
                                )}
                              </Col>
                            </Row>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </Card>
              </div>
            </div>
          )}
        </Content>
      </Layout>
    </Layout>
  );
}
