import http from "./http";

// 上报页面性能指标
export const reportPerformance = async () => {
  if (typeof window === "undefined") return;

  // 页面加载完成后收集性能数据上报后端
  const sendMetrics = async () => {
    const metrics: any = {}; //存放最终上报的所有性能指标

    // 获取页面加载耗时
    const navEntries = performance.getEntriesByType("navigation"); //获取当前整个页面从打开 → 加载完成的完整生命周期时间报告，获得一个里面只有一条数据的数组
    if (navEntries.length > 0) {
      const nav = navEntries[0] as any;
      metrics.loadTime = nav.loadEventEnd - nav.startTime; //获取页面总加载时间
      metrics.ttfb = nav.responseStart - nav.startTime; //获取到响应第一个字节的时间
      metrics.domReady = nav.domContentLoadedEventEnd - nav.startTime; // 获取DOM 加载完成的时间
    }

    // 获取首屏渲染时间
    const paint = performance.getEntriesByType("paint"); //获取绘制报告，得到数组[fp报告，fcp报告]
    paint.forEach((p) => {
      if (p.name === "first-paint") {
        metrics.fp = p.startTime;
      } else if (p.name === "first-contentful-paint") {
        metrics.fcp = p.startTime;
      }
    });

    // 仅在有意义时上报
    if (Object.keys(metrics).length > 0 && metrics.loadTime > 0) {
      try {
        await http.post("/api/performanceEvents", {
          path: window.location.pathname, // 当前页面路径
          metrics,
        });
      } catch (e) {
        console.warn("Performance report failed", e);
      }
    }
  };

  // 如果页面已经加载完成，直接执行；否则等待 load 事件
  if (document.readyState === "complete") {
    setTimeout(sendMetrics, 2000);
  } else {
    window.addEventListener("load", () => {
      setTimeout(sendMetrics, 2000);
    });
  }
};

// 上报接口耗时（传入接口地址和耗时）
export const trackApiLatency = async (path: string, duration: number) => {
  try {
    await http.post("/api/performanceEvents", {
      path,
      metrics: { apiLatency: duration },
    });
  } catch (e) {
    console.warn("API Latency report failed", e);
  }
};
