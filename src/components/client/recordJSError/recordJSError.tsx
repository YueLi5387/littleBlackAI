"use client"; // 必须是客户端组件才能使用 window 和 useEffect
import { useEffect } from "react";
import { record } from "@rrweb/record";
import { recordEvents, reportEvents } from "@/lib/utils/recordEvents";

export default function Monitoring() {
  useEffect(() => {
    const stopFn = record({
      emit(event) {
        recordEvents(event);
      },
    });
    window.addEventListener("error", (event) => {
      reportEvents(event);
    });

    // 当这个组件所在的 layout 真的被销毁时, 执行清理
    return () => {
      if (stopFn) stopFn();
      window.removeEventListener("error", (event) => {
        reportEvents(event);
      });
    };
  }, []);

  return null;
}
