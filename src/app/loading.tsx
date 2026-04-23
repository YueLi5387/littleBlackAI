"use client";
import { Spin } from "antd";
import { useTranslation } from "react-i18next";

export default function Loading() {
  const { t } = useTranslation();
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
        {t("common.loading")}
      </div>
    </div>
  );
}
