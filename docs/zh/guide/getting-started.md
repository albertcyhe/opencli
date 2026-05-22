# 快速开始

OpenCLI 给人和 AI Agent 提供一套确定性的命令接口，用来调用网站、Browserbase 云端浏览器、Electron 应用和外部 CLI。

## 安装

当前 fork 还没有单独发布 npm 包，请从源码安装：

```bash
node --version
git clone git@github.com:albertcyhe/opencli.git
cd opencli
npm install
npm run build
npm link
opencli doctor
opencli list
```

## 发现命令

先用运行时发现能力，不要凭文档猜命令：

```bash
opencli list -f json
opencli <site> --help
opencli <site> <command> --help
```

Agent 默认应使用 JSON：

```bash
opencli hackernews top --limit 5 -f json
opencli reddit get-comments "https://www.reddit.com/r/example/comments/1abc123/title/" --limit 100 -f json
```

## 选择浏览器运行环境

| 运行环境 | 适用场景 |
| --- | --- |
| Public/API adapter | 命令不需要登录态或浏览器状态。 |
| 本地 Browser Bridge | 任务需要复用这台机器上的 Chrome 登录态。 |
| Browserbase account | 任务需要云端 browser、持久登录态、账号绑定 proxy，或多身份并发。 |
| 显式 Browserbase session | 你已经创建了 Browserbase session，只需要 OpenCLI 接入。 |

本地 Chrome 设置见 [Browser Bridge](./browser-bridge.md)。

Browserbase 设置见 [Browserbase 账号、Proxy 与并发 Session](../advanced/browserbase.md)。

## 第一个 Browserbase 任务

```bash
export BROWSERBASE_API_KEY=...
export BROWSERBASE_PROJECT_ID=...
export PROXY_REDDIT1_PASS=...

opencli browserbase proxy add reddit1-proxy \
  --type external \
  --server http://host:port \
  --username user \
  --password-env PROXY_REDDIT1_PASS

opencli browserbase account bootstrap \
  --site reddit \
  --count 1 \
  --name-prefix reddit-main \
  --proxy reddit1-proxy \
  --open

opencli --browserbase-account reddit-main-1 \
  reddit get-comments "https://www.reddit.com/r/example/comments/1abc123/title/" \
  --limit 100 \
  -f json
```

## 第一个并发任务

创建 `jobs.jsonl`，每行一个命令：

```json
{"id":"reddit-1","command":"reddit get-comments","args":{"post-id":"https://www.reddit.com/r/example/comments/1abc123/title/","limit":100}}
{"id":"reddit-2","command":"reddit get-comments","args":{"post-id":"https://www.reddit.com/r/example/comments/1def456/title/","limit":100}}
```

用指定 Browserbase 账号池执行：

```bash
opencli run --browserbase \
  --accounts reddit-main-1,reddit-main-2,reddit-main-3 \
  --parallel 3 \
  jobs.jsonl
```

任务池保证同一个 account/context 同时只有一个自动化 session，不同账号可以并发。

## 下一步

- [AI Agent 操作指南](./ai-agent-operations.md)
- [给 AI Agent 的 Skills](./skills.md)
- [社交平台 Comments](../adapters/social-comments.md)
- [所有适配器](../adapters/index.md)
- [扩展 OpenCLI](./extending-opencli.md)
