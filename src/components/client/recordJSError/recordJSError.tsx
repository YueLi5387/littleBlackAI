"use client";
import { useEffect } from "react";
import { record } from "@rrweb/record";
import { recordEvents, reportEvents } from "@/lib/utils/recordEvents";
import { reportPerformance } from "@/lib/utils/performance";
import { usePathname } from "next/navigation";

export default function Monitoring() {
  const pathname = usePathname(); //获取url路径

  // 监听性能变化
  useEffect(() => {
    // 每次路径变化时记录性能
    reportPerformance();
  }, [pathname]);

  // 录制错误事件
  useEffect(() => {
    // 开始录制
    const stopFn = record({
      emit(event) {
        recordEvents(event);
      },
      // 每一分钟重新拍摄一次快照，保证回放链路完整
      checkoutEveryNms: 60 * 1000,
    });

    const handleError = (event: ErrorEvent) => {
      reportEvents(event);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      reportEvents(event.reason);
    };

    //监听JS错误、资源加载错误（普通代码报错、图片 / JS/CSS 加载失败）
    window.addEventListener("error", handleError);
    // 监听未捕获的 Promise 报错
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      if (stopFn) stopFn();
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
