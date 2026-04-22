import { Spin } from "antd";

export default function Loading() {
  return (
    <div
      style={{
        height: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(255, 255, 255, 0.8)",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 9999,
      }}
    >
      <Spin size="large" />
      <div style={{ marginTop: 16, color: "#1890ff", fontWeight: 500 }}>
        正在加载页面，请稍候...
      </div>
    </div>
  );
}
