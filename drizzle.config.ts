import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle", //输出路径
  schema: "./src/db/schema.ts", //表的存放路径
  dialect: "postgresql", //数据库类型
  dbCredentials: {
    url: process.env.DATABASE_URL!, //数据库连接字符串
  },
});
