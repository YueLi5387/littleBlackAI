## 简介

基于supabase和 ai-sdk 全栈开发的AI 对话平台，支持文件上传与流式交互体验，并自主实现了一套集错误回放与性能指标监控于一体的运维看板逻辑。

## 特点

1. **流式输出解析**：对接Vercel AI SDK模型，基于 ReadableStream 与 TextDecoder 构建SSE 数据流解析器，实现 AI 响应内容的实时渲染与打字机效果。
2. **混合检索 RAG 架构**：基于 Supabase Vector 实现混合检索功能，利用 RRF 算法 融合多路召回结果，并集成 BGE-Reranker 二次精排以提升召回精度；同步引入 递归分块 与 Overlap 技术攻克长文档语义断层，确保了复杂文档问答的准确性与上下文连贯性。
3. **动态虚拟列表优化**：自研支持动态高度的虚拟列表，利用 ResizeObserver 实时感知内容高度跳动，并结合 rAF 进行节流调度，保障海量消息场景下 FPS 稳定在 60 帧，减轻 DOM 渲染压力。
4. **故障回溯系统**：集成 rrweb 实现异常场景的“时空回溯”，通过全局异常监听捕获故障快照，将 Bug 复现排查时间从小时级缩短至分钟级 。
5. **性能监控体系**：基于浏览器原生 Performance API 自研轻量级性能监控系统 ，通过监听路由变化与 2 秒延迟避让策略，实现全站核心 Web 指标（FCP、Load Time）的无感上报，为性能调优提供数据支撑。
6. **国际化配置**：通过react-i18next完成项目国际化配置 ，实现中、英、日三语无缝切换，提升了项目的全球化扩展能力。

## 说明

> 如果对您对此项目有兴趣，可以点 "Star" 支持一下，十分感谢！

> 传送门：[github](https://github.com/YueLi5387/littleBlackAI) 、 [gitee](https://gitee.com/duo-ke-yue-li/xiao-hei-ai)

## 效果演示

示例网站：http://little-black-ai-zgli.vercel.app/
PS:
1.需要开vpn使用,网站不太稳定
2.为保证隐私，监控页面仅对管理员开发，因此在线网站不会显示监控按钮，感兴趣可以自己clone仓库配置.env文件体验完整功能

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


# 硅基流动api秘钥
SILICONFLOW_API_KEY = "硅基流动api秘钥"

```

```
pnpm dev
```

