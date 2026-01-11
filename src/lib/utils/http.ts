import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { message } from "antd";
import { useUserStore } from "../../store/userStore";

// 基地址
const baseURL: string = "http://localhost:3000";

const instance: AxiosInstance = axios.create({
  baseURL,
  timeout: 1000000,
});
// 请求拦截器
instance.interceptors.request.use(
  (config: InternalAxiosRequestConfig & { _isRefresh?: boolean }) => {
    const token = useUserStore.getState().token;

    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: token,
      } as AxiosRequestHeaders;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
instance.interceptors.response.use(
  (response: AxiosResponse) => {
    if (response.data.status === 0) {
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
      window.location.href = "/view/loginPage";
    }
    message.error(errorMessage);
    return Promise.reject(error);
  }
);

export default instance;
export { baseURL };
