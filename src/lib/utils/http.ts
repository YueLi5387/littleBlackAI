import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { message } from "antd";
import { ROUTES } from "@/lib/constants/routes";
import { reportEvents } from "./recordEvents";
import nprogress from "nprogress";
import "nprogress/nprogress.css";

// 配置 nprogress
nprogress.configure({ showSpinner: false, speed: 500 });

// 基地址
const baseURL: string = process.env.AXIOS_BASE_URL!;

const http: AxiosInstance = axios.create({
  baseURL,
  timeout: 1000000,
});

let requestCount = 0;

const showLoading = () => {
  if (requestCount === 0) {
    nprogress.start();
  }
  requestCount++;
};

const hideLoading = () => {
  requestCount--;
  if (requestCount === 0) {
    nprogress.done();
  }
};

// 请求拦截器
http.interceptors.request.use(
  (config: InternalAxiosRequestConfig & { _isRefresh?: boolean }) => {
    showLoading();
    return config;
  },
  (error: AxiosError) => {
    hideLoading();
    return Promise.reject(error);
  },
);

// 响应拦截器
http.interceptors.response.use(
  (response: AxiosResponse) => {
    hideLoading();
    if (response.data.code === 0) {
      return response.data;
    } else {
      message.error(response.data.message || "请求失败");
      return Promise.reject(response.data);
    }
  },
  async (error: AxiosError) => {
    hideLoading();
    // const userStore = useUserStore();
    reportEvents(error);
    // ... rest of file
    const errorMessage =
      (error.response?.data as { message?: string })?.message || "服务器错误";

    // 401 跳转登录
    if (error.response?.status === 401) {
      message.error("登录过期，请重新登录!");
      window.location.href = ROUTES.login;
    }
    message.error(errorMessage);
    return Promise.reject(error);
  },
);

export default http;
export { baseURL };
