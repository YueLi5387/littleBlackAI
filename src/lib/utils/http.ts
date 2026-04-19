import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { message } from "antd";
import { useUserStore } from "../../store/userStore";
import { ROUTES } from "@/lib/constants/routes";

// 基地址
const baseURL: string = "http://localhost:3000";

const http: AxiosInstance = axios.create({
  baseURL,
  timeout: 1000000,
});
// 请求拦截器
http.interceptors.request.use(
  (config: InternalAxiosRequestConfig & { _isRefresh?: boolean }) => {
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

// 响应拦截器
http.interceptors.response.use(
  (response: AxiosResponse) => {
    if (response.data.code === 0) {
      return response.data;
    } else {
      message.error(response.data.message || "请求失败");
      return Promise.reject(response.data);
    }
  },
  async (error: AxiosError) => {
    // const userStore = useUserStore();
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
