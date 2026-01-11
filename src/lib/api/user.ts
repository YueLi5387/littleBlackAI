import instance from "../utils/http";
import type { User } from "../types/userStoreType";
// 注册
export const registerService = (data: User) => {
  return instance.post("/api/user/register", data);
};
// 登录
export const loginService = (data: User) => {
  return instance.post("/api/user/login", data);
};
