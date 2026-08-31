// 用来存储操作内容，和上报错误内容
import axios from "axios";
import localforage from "localforage";

// IndexedDB/localStorage are browser-only. Creating the store during SSR/static
// generation makes localForage throw because Vercel's build worker has neither.
const errorQueue =
  typeof window === "undefined"
    ? null
    : localforage.createInstance({ name: "errorQueue" });

// 存报错事件的数组
let events = [];
let isFlushing = false;
let hasRegisteredFlushListener = false;

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
  if (!errorQueue) return;
  if (isFlushing) return;
  isFlushing = true;
  try {
    const keys = await errorQueue.keys();
    for (const key of keys) {
      const data = await errorQueue.getItem(key);
      try {
        await axios.post("/api/errorEvents", data);
        await errorQueue.removeItem(key);
      } catch {
        // 失败项保留，下次再试
      }
    }
  } finally {
    isFlushing = false;
  }
}

// 上报失败时存入离线队列
async function saveToQueue(data) {
  if (!errorQueue) return;
  try {
    const key =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
    await errorQueue.setItem(key, data);
  } catch (e) {
    console.error("localForage 写入失败", e);
  }
}

function registerFlushListener() {
  if (hasRegisteredFlushListener || typeof window === "undefined") return;
  hasRegisteredFlushListener = true;

  // 网络恢复或页面重新回到前台时补刷离线队列，覆盖“断网后恢复但不刷新页面”的场景。
  window.addEventListener("online", () => {
    void flushPending();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && navigator.onLine) void flushPending();
  });
}

registerFlushListener();
void flushPending();

// 上报快照
export const reportEvents = (err) => {
  // 格式化错误对象
  const errorDetail = {
    message: err.message || "未知错误",
    stack: err.error?.stack || err.stack || "无堆栈信息",
    name: err.error?.name || err.name || "Error",
    time: new Date().toLocaleString(),
  };

  const payload = {
    error: errorDetail,
    events: [...events],
  };
  // navigator.onLine-浏览器内置的网络检测API,true代表有网
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    void saveToQueue(payload);
    return;
  }

  axios
    .post("/api/errorEvents", payload)
    .then(() => {
      console.log("错误日志上报成功!");
    })
    .catch((e) => {
      console.error("日志上传失败，已存入离线队列", e);
      void saveToQueue(payload);
    });
};
