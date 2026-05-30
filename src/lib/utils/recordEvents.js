// 用来存储操作内容，和上报错误内容
import axios from "axios";
import localforage from "localforage";

const errorQueue = localforage.createInstance({ name: "errorQueue" });

// 存报错事件的数组
let events = [];

// 记录快照
export const recordEvents = (event) => {
  events.push(event);
  // 限制长度，防止内存溢出
  if (events.length > 500) {
    events.shift();
  }
};

// 重试积压的失败上报
async function flushPending() {
  const keys = await errorQueue.keys();
  if (keys.length === 0) return;
  for (const key of keys) {
    const data = await errorQueue.getItem(key);
    try {
      await axios.post("/api/errorEvents", data);
      await errorQueue.removeItem(key);
    } catch {
      // 失败项保留，下次再试
    }
  }
}

// 上报失败时存入离线队列
async function saveToQueue(data) {
  try {
    await errorQueue.setItem(String(Date.now()), data);
  } catch (e) {
    console.error("localForage 写入失败", e);
  }
}

// 页面初始化时先清积压
flushPending();

// 上报快照
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
      console.error("日志上传失败，已存入离线队列", e);
      saveToQueue({ error: errorDetail, events: [...events] });
    });
};
