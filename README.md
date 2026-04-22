This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

```
问题:
1.需要往ai接入工具，其现在的知识库只更新到2023年
3.数据库create_at时间不正确   ---ok
4.程序只能保存文字，如果web端上传图片，也需要保存到数据库
5.ai对话输出特别卡顿      ---ok  在ai输出时使用普通样式，输出完成后转md
6.并且跳转其他对话组的时候上一个对话组内容会消失
7.断网时错误监控无法上报
8.创建新对话时用户的第一句问题可能会被吞掉
```

```
优化：
1.加多几种ai模型
2.优化样式
3.考虑接入rag
4.性能埋点监控
5.react-query
6.新增修改对话名字的api   ---ok
7.记住密码功能  --ok
8.把更改对话组标题的放到存数据库之前  ---ok
9.增加退出登录按钮  ---ok
10.加一个中断回答和删除回答按钮 ---ok
11.监控线上bug
12.性能埋点
13.给代码加一个loading遮罩层，相应太慢了
14.监控页面侧边栏需要能够收缩

```
