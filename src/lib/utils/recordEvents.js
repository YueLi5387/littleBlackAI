// 上报性能埋点
// import { record } from "@rrweb/record";
import axios from "axios";
let events = [];
export const recordEvents = (event) => {
  if (events.length > 50) events = events.slice(-25);
  events.push(event);
};

export const reportEvents = (err) => {
  axios
    .post("/api/errorEvents", {
      error: err,
      events,
    })
    .then((res) => {
      events = [];
      console.log("日志上传成功!");
    });
};
