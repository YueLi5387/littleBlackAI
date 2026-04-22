import axios from "axios";

// 最简单纯粹的事件数组
let events = [];

export const recordEvents = (event) => {
  events.push(event);
  // 限制长度，防止内存溢出
  if (events.length > 1000) {
    events.shift();
  }
};

export const reportEvents = (err) => {
  // 格式化错误对象
  const errorDetail = {
    message: err.message || "未知错误",
    stack: err.error?.stack || err.stack || "无堆栈信息",
    name: err.error?.name || err.name || "Error",
    time: new Date().toLocaleString(),
  };

  // 直接上报整个 events 数组
  axios
    .post("/api/errorEvents", {
      error: errorDetail,
      events: [...events],
    })
    .then(() => {
      console.log("错误日志上报成功!");
    })
    .catch((e) => {
      console.error("日志上传失败", e);
    });
};
