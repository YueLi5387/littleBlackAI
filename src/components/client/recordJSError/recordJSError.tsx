"use client";
import { useEffect } from "react";
import { record } from "@rrweb/record";
import { recordEvents, reportEvents } from "@/lib/utils/recordEvents";

export default function Monitoring() {
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
