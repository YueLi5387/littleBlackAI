"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
  Popconfirm,
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
  DeleteOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import styles from "./supervise.module.scss";
import http from "@/lib/utils/http";
import { ROUTES } from "@/lib/constants/routes";
import dayjs from "dayjs";
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
  const [errorPage, setErrorPage] = useState(1);
  const [errorHasMore, setErrorHasMore] = useState(true);
  const [errorLoadingMore, setErrorLoadingMore] = useState(false);
  const [performanceEvents, setPerformanceEvents] = useState<
    PerformanceEvent[]
  >([]);
  const [perfPage, setPerfPage] = useState(1);
  const [perfTotal, setPerfTotal] = useState(0);
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
        console.error(t("common.initSupervisePageFailed"), error);
        router.replace(ROUTES.chatHome);
      }
    };
    init();
  }, [router]);

  const fetchData = () => {
    fetchErrorEvents(1);
    fetchPerformanceEvents(1);
  };

  // 拉取错误日志
  const fetchErrorEvents = async (page: number, append = false) => {
    try {
      const res = (await http.get(
        `/api/errorEvents?page=${page}&pageSize=8`,
      )) as {
        code: number;
        data: ErrorEvent[];
        hasMore: boolean;
      };
      if (res.code === 0) {
        setErrorEvents((prev) => (append ? [...prev, ...res.data] : res.data));
        setErrorHasMore(res.hasMore);
        setErrorPage(page);
      }
    } catch (error) {
      console.error(t("common.getErrorEventsFailed"), error);
    } finally {
      if (!append) setLoading(false);
      setErrorLoadingMore(false);
    }
  };

  // 拉取性能日志
  const fetchPerformanceEvents = async (page: number) => {
    try {
      const res = (await http.get(
        `/api/performanceEvents?page=${page}&pageSize=10`,
      )) as {
        code: number;
        data: PerformanceEvent[];
        total: number;
      };
      if (res.code === 0) {
        setPerformanceEvents(res.data);
        setPerfTotal(res.total);
        setPerfPage(page);
      } else {
        message.error(t("common.getPerfFailed"));
      }
    } catch (error) {
      console.error(t("common.getPerfFailed"), error);
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
        // 动态异步加载播放器
        const initPlayer = async () => {
          try {
            const { default: rrwebPlayer } = await import("rrweb-player");
            playerInstance.current = new rrwebPlayer({
              target: replayerContainer.current!,
              props: {
                events,
                width: replayerContainer.current!.offsetWidth || 800,
                height: 500,
                autoPlay: false,
              },
            });
          } catch (e) {
            console.error("rrweb-player 加载失败:", e);
          }
        };
        initPlayer();
      } else {
        replayerContainer.current.innerHTML = `<div style="color: #999; text-align: center; padding: 20px;">${t("common.replayIncomplete")}</div>`;
      }
    }

    return () => {
      if (playerInstance.current) {
        playerInstance.current = null;
      }
    };
  }, [selectedEvent]);

  const handleBack = () => router.back();

  const handleDeleteErrorEvent = useCallback(
    async (eventId: number) => {
      try {
        const res = (await http.delete(`/api/errorEvents?id=${eventId}`)) as {
          code: number;
        };
        if (res.code === 0) {
          setErrorEvents((prev) => prev.filter((item) => item.id !== eventId));
          if (selectedEvent?.id === eventId) setSelectedEvent(null);
          message.success("已删除错误日志");
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "删除错误日志失败";
        message.error(errorMessage);
      }
    },
    [selectedEvent?.id],
  );

  const handleDeletePerformanceEvent = useCallback(async (eventId: number) => {
    try {
      const res = (await http.delete(`/api/performanceEvents?id=${eventId}`)) as {
        code: number;
      };
      if (res.code === 0) {
        setPerformanceEvents((prev) =>
          prev.filter((item) => item.id !== eventId),
        );
        setPerfTotal((prev) => Math.max(prev - 1, 0));
        message.success("已删除性能日志");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "删除性能日志失败";
      message.error(errorMessage);
    }
  }, []);

  const renderErrorEventItem = useCallback(
    (item: ErrorEvent) => {
      const itemError =
        typeof item.error === "string" ? JSON.parse(item.error) : item.error;

      return (
        <div
          key={item.id}
          className={`${styles.eventItem} ${mode === "error" && selectedEvent?.id === item.id ? styles.active : ""}`}
          onClick={() => {
            setMode("error");
            setSelectedEvent(item);
          }}
        >
          <div className={styles.eventItemMain}>
            <span className={styles.errorName}>
              {itemError?.message || t("common.noRecord")}
            </span>
            <span className={styles.errorTime}>
              {dayjs(item.createdAt).format("MM-DD HH:mm:ss")}
            </span>
          </div>
          <Popconfirm
            title="确认删除这条错误日志吗？"
            okText={t("common.confirm")}
            cancelText={t("common.cancel")}
            onConfirm={(event) => {
              event?.stopPropagation();
              void handleDeleteErrorEvent(item.id);
            }}
          >
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              className={styles.eventDeleteBtn}
              onClick={(event) => event.stopPropagation()}
            />
          </Popconfirm>
        </div>
      );
    },
    [handleDeleteErrorEvent, mode, selectedEvent?.id, t],
  );

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
          <div
            className={styles.eventList}
            onScroll={(e) => {
              if (errorLoadingMore || !errorHasMore) return;
              const el = e.currentTarget;
              if (el.scrollHeight - el.scrollTop - el.clientHeight < 50) {
                setErrorLoadingMore(true);
                fetchErrorEvents(errorPage + 1, true);
              }
            }}
          >
            {errorEvents.map(renderErrorEventItem)}
            {errorEvents.length > 0 && (errorLoadingMore || !errorHasMore) && (
              <div
                style={{
                  padding: "16px",
                  textAlign: "center",
                  color: "#8c8c8c",
                  fontSize: 12,
                  opacity: errorLoadingMore ? 1 : 0.6,
                  transition: "opacity 0.3s ease",
                }}
              >
                {errorLoadingMore ? (
                  <Spin size="small" />
                ) : (
                  <span>{t("common.noMore")}</span>
                )}
              </div>
            )}
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
                  {/* 错误信息 */}
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
                {/* 错误回放 */}
                <div className={styles.detailCard}>
                  <div className={styles.sectionTitle}>
                    {t("common.behaviorReplay")}
                  </div>
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
                <Col span={6}>
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
                <Col span={6}>
                  <Card size="small">
                    <Statistic
                      title={t("common.avgFP")}
                      value={
                        performanceEvents.reduce(
                          (acc, cur) => acc + (cur.metrics.fp || 0),
                          0,
                        ) /
                        (performanceEvents.filter((e) => e.metrics.fp).length ||
                          1)
                      }
                      suffix="ms"
                      precision={0}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small">
                    <Statistic
                      title={t("common.avgFCP")}
                      value={
                        performanceEvents.reduce(
                          (acc, cur) => acc + (cur.metrics.fcp || 0),
                          0,
                        ) /
                        (performanceEvents.filter((e) => e.metrics.fcp)
                          .length || 1)
                      }
                      suffix="ms"
                      precision={0}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small">
                    <Statistic
                      title={t("common.totalReports")}
                      value={performanceEvents.length}
                    />
                  </Card>
                </Col>
              </Row>

              <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col span={6}>
                  <Card size="small">
                    <Statistic
                      title={t("common.avgTTFB")}
                      value={
                        performanceEvents.reduce(
                          (acc, cur) => acc + (cur.metrics.ttfb || 0),
                          0,
                        ) /
                        (performanceEvents.filter((e) => e.metrics.ttfb)
                          .length || 1)
                      }
                      suffix="ms"
                      precision={0}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small">
                    <Statistic
                      title={t("common.avgDOMReady")}
                      value={
                        performanceEvents.reduce(
                          (acc, cur) => acc + (cur.metrics.domReady || 0),
                          0,
                        ) /
                        (performanceEvents.filter((e) => e.metrics.domReady)
                          .length || 1)
                      }
                      suffix="ms"
                      precision={0}
                    />
                  </Card>
                </Col>
                <Col span={6}>
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
                    pagination={{
                      current: perfPage,
                      total: perfTotal,
                      pageSize: 10,
                      onChange: (page) => fetchPerformanceEvents(page),
                      showSizeChanger: false,
                    }}
                    renderItem={(item) => (
                      <List.Item
                        actions={[
                          <Popconfirm
                            key="delete"
                            title="确认删除这条性能日志吗？"
                            okText={t("common.confirm")}
                            cancelText={t("common.cancel")}
                            onConfirm={() =>
                              void handleDeletePerformanceEvent(item.id)
                            }
                          >
                            <Button
                              type="text"
                              danger
                              size="small"
                              icon={<DeleteOutlined />}
                            />
                          </Popconfirm>,
                        ]}
                      >
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
                                FP: {item.metrics.fp?.toFixed(0) || "-"}ms
                              </Col>
                              <Col>
                                FCP: {item.metrics.fcp?.toFixed(0) || "-"}ms
                              </Col>
                              <Col>
                                DCL: {item.metrics.domReady?.toFixed(0) || "-"}
                                ms
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
