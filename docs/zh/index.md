---
layout: home

hero:
  name: OpenCLI
  text: 面向 Agent 的 Browserbase-ready CLI 自动化
  tagline: 网站 · 社交评论 · 多账号 Browserbase · 多 Proxy Session · 桌面适配器
  actions:
    - theme: brand
      text: 快速开始
      link: /zh/guide/getting-started
    - theme: alt
      text: Agent 操作指南
      link: /zh/guide/ai-agent-operations
    - theme: alt
      text: 在 GitHub 查看
      link: https://github.com/albertcyhe/opencli

features:
  - icon: 🌐
    title: Browserbase 账号
    details: 用 Browserbase Context 持久保存登录态，创建 Live View 登录 session，之后按账号名执行任务。
  - icon: 🧭
    title: 多 Proxy 路由
    details: 账号绑定 proxy，支持查询、更新和删除 proxy profile，让登录态和出口 IP 一起管理。
  - icon: ⚙️
    title: 并发原子任务
    details: 通过 `opencli run --browserbase` 把 JSONL 任务分发到最多 10 个 Browserbase session。
  - icon: 💬
    title: 社交平台 Comments
    details: 支持 Reddit、Twitter/X、YouTube、Instagram、TikTok、小红书，以及 LinkedIn timeline 评论数量。
  - icon: 🧩
    title: Agent Skills
    details: 安装 OpenCLI skills 后，AI Agent 能判断该调用哪个命令、什么时候使用 Browserbase。
  - icon: 🖥️
    title: 本地 Browser Bridge
    details: 复用本地 Chrome 登录态，执行浏览器型 adapter 和临时浏览器操作。
---
