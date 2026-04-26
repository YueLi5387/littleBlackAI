## 简介

基于supabase和 ai-sdk 全栈开发的AI 对话平台，提供极速的流式交互体验，并自主实现了一套集错误回放与性能指标监控于
一体的运维看板逻辑。

## 特点

1. **ai-sdk接入**: 基于 Vercel AI SDK 接入模型，实现大模型流式输出 ，提升 AI 对话的即时交互体验。
2. **错误回放监控**: 利用rrweb录制技术结合全局异常监听，实现线上故障的“时空回溯”回放，将复杂交互场景下的Bug复现时间从小时级缩短至分钟级，极大地提升了运维效率。
3. **性能监控**: 基于浏览器原生Performance API 自研轻量级性能监控系统，通过监听路由变化与2 秒延迟避让策略，实现全站核心Web指标（FCP、LoadTime）的无感上报，为性能调优提供数据支撑。
4. **国际化**: 通过react-i18next完成项目国际化配置，实现中、英、日三语无缝切换，提升了项目的全球化扩展能力。

## 说明

> 如果对您对此项目有兴趣，可以点 "Star" 支持一下，十分感谢！

> 传送门：[github](https://github.com/YueLi5387/littleBlackAI) 、 [gitee](https://gitee.com/duo-ke-yue-li/xiao-hei-ai)

## 效果演示
示例网站：http://little-black-ai-zgli.vercel.app/
（需要开vpn使用）（网站不太稳定）

## 技术栈

Next.js + Typescript + Ant Design + ai-sdk + react-i18next + react-markdown + rrweb + Drizzle ORM + Supabase

## 项目运行

```
git clone https://github.com/YueLi5387/littleBlackAI.git
```

```
pnpm i
```

新增.env文件，自行配置以下信息

```

NEXT_PUBLIC_SUPABASE_URL='supabase地址'
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='supabase秘钥'


# ai相关
DEEPSEEK_API_KEY = 'deepseek-api秘钥'


# 数据库
DATABASE_URL="数据库地址"


# 我的邮箱
MY_QQ_EMAIL = "自己的邮箱"
# 我的邮箱SMTP授权码
MY_QQ_AUTH_CODE = "自己的邮箱SMTP授权码"

# axios请求基地址
AXIOS_BASE_URL = "自己的请求地址"

```

```
pnpm dev
```

