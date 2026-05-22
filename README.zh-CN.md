# OpenCLI

> 把网站、已登录浏览器、Browserbase 云端浏览器、Electron 应用和本地 CLI 变成稳定的命令接口，给人和 AI Agent 调用。

[![English](https://img.shields.io/badge/docs-English-1D4ED8?style=flat-square)](./README.md)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-339933?style=flat-square)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square)](./LICENSE)

OpenCLI 是面向 agent 的 CLI 入口。它可以：

- 用稳定的 JSON/table/CSV 输出调用 100+ 网站和桌面应用 adapter
- 通过 Browser Bridge 复用本地 Chrome 登录态
- 通过 Browserbase 管理持久 Context、账号登录态、账号绑定 proxy，以及最多 10 个并发云端 browser session
- 对 Reddit、Twitter/X、YouTube、Instagram、TikTok、小红书等平台执行 comments 相关原子操作
- 提供 Codex/Claude/Cursor 等 agent 可安装的 skills，让 agent 知道该调用哪些 `opencli` 命令

当前 fork 的文档和仓库地址是 [`albertcyhe/opencli`](https://github.com/albertcyhe/opencli)。这个 fork 还没有单独发布 npm 包，请从源码安装；adapter/plugin import 名暂时仍是 `@jackwener/opencli`。

## 快速开始

OpenCLI 要求 Node.js 20 或更高版本。当前 fork 从源码安装：

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

如果要复用本地 Chrome 登录态，请从 [Chrome Web Store](https://chromewebstore.google.com/detail/opencli/ildkmabpimmkaediidaifkhjpohdnifk) 安装 OpenCLI Browser Bridge 扩展，或从 [albertcyhe/opencli releases](https://github.com/albertcyhe/opencli/releases) 下载扩展 zip。

## Agent 能做什么

不要猜命令，先实时发现：

```bash
opencli list -f json
opencli reddit --help
opencli reddit get-comments --help
```

执行原子化 adapter 命令，给下游 agent 或程序读取时默认用 JSON：

```bash
opencli hackernews top --limit 5 -f json
opencli reddit get-comments "https://www.reddit.com/r/example/comments/1abc123/title/" --limit 100 -f json
opencli twitter get-comments "https://x.com/user/status/123" --limit 50 -f json
opencli youtube comments "https://www.youtube.com/watch?v=VIDEO_ID" --limit 100 -f json
opencli xiaohongshu comments "https://www.xiaohongshu.com/search_result/<id>?xsec_token=..." --with-replies -f json
```

## Browserbase 多账号多 Proxy

先设置 Browserbase 凭证：

```bash
export BROWSERBASE_API_KEY=...
export BROWSERBASE_PROJECT_ID=...
```

创建 proxy profile。外部 proxy 的密码推荐放在环境变量：

```bash
export PROXY_REDDIT1_PASS=...

opencli browserbase proxy add reddit1-proxy \
  --type external \
  --server http://133.169.0.110:60088 \
  --username p9SIbn0S6AoC \
  --password-env PROXY_REDDIT1_PASS
```

创建 10 个持久登录账号，并打开 Live View URL 给人工登录：

```bash
opencli browserbase account bootstrap \
  --site reddit \
  --count 10 \
  --name-prefix reddit-main \
  --proxy reddit1-proxy \
  --open
```

每个账号对应一个 Browserbase Context。cookies、localStorage、IndexedDB 保存在 Browserbase；OpenCLI 本地只保存 `~/.opencli/browserbase.json` 元数据。

用指定账号跑一个任务：

```bash
opencli --browserbase-account reddit-main-1 \
  reddit get-comments "https://www.reddit.com/r/example/comments/1abc123/title/" \
  --limit 100 \
  -f json
```

用最多 10 个账号并发跑 JSONL 任务：

```bash
opencli run --browserbase \
  --accounts reddit-main-1,reddit-main-2,reddit-main-3,reddit-main-4,reddit-main-5,reddit-main-6,reddit-main-7,reddit-main-8,reddit-main-9,reddit-main-10 \
  --parallel 10 \
  --pool-size 10 \
  jobs.jsonl
```

常用账号和 proxy 管理命令：

```bash
opencli browserbase account list
opencli browserbase account login reddit-main-1 --open --wait
opencli browserbase account check reddit-main-1 --command "reddit whoami"
opencli browserbase account set-proxy reddit-main-1 reddit1-proxy
opencli browserbase account clear-proxy reddit-main-1
opencli browserbase account clear-login reddit-main-1 --recreate-context --delete-old-context
opencli browserbase account delete reddit-main-1 --delete-context

opencli browserbase proxy list
opencli browserbase proxy get reddit1-proxy
opencli browserbase proxy update reddit1-proxy --server http://new-host:port
opencli browserbase proxy test reddit1-proxy
opencli browserbase proxy delete reddit1-proxy
```

完整说明见 [Browserbase 账号、Proxy 与并发 Session](./docs/zh/advanced/browserbase.md)。

## 社交平台 Comments

| 平台 | 读取评论 | 写入支持 |
| --- | --- | --- |
| Reddit | `reddit read`, `reddit get-comments` | `reddit comment`, `reddit reply` |
| Twitter/X | `twitter get-comments`, `twitter thread` | `twitter reply`, `twitter post` |
| YouTube | `youtube comments` | `youtube reply`, `youtube reply-comment` |
| Instagram | `instagram get-comments` | `instagram comment`, `instagram reply` |
| TikTok | `tiktok get-comments` | `tiktok comment`, `tiktok reply` |
| 小红书 | `xiaohongshu comments` | `xiaohongshu reply` |
| LinkedIn | `linkedin timeline` 评论数量 | 暂未暴露评论 thread 读写 |

平台参数、ID 和安全说明见 [Social Comment Support](./docs/zh/adapters/social-comments.md)。

## 给 AI Agent 安装 Skills

安装或刷新当前 fork 的所有 OpenCLI skills：

```bash
npx skills add albertcyhe/opencli
```

只安装需要的 skill：

```bash
npx skills add albertcyhe/opencli --skill opencli-usage
npx skills add albertcyhe/opencli --skill opencli-browserbase
npx skills add albertcyhe/opencli --skill opencli-social-comments
npx skills add albertcyhe/opencli --skill opencli-browser
npx skills add albertcyhe/opencli --skill opencli-adapter-author
npx skills add albertcyhe/opencli --skill opencli-autofix
```

| Skill | 适合场景 |
| --- | --- |
| `opencli-usage` | 总入口：发现能力并选择下一步 skill |
| `opencli-browserbase` | 管理 Browserbase account/context/session/proxy/并发任务 |
| `opencli-social-comments` | 读取或写入社交平台评论 |
| `opencli-browser` | 通过本地 Browser Bridge 临时操作 Chrome 页面 |
| `opencli-adapter-author` | 新增或扩展可复用 adapter |
| `opencli-autofix` | 基于 trace 修复失效 adapter |

Skill 源码在 [`skills/`](./skills/)，文档入口见 [给 AI Agent 的 Skills](./docs/zh/guide/skills.md)。

## 更多文档

- [快速开始](./docs/zh/guide/getting-started.md)
- [AI Agent 操作指南](./docs/zh/guide/ai-agent-operations.md)
- [安装](./docs/zh/guide/installation.md)
- [Browser Bridge](./docs/zh/guide/browser-bridge.md)
- [所有适配器](./docs/zh/adapters/index.md)
- [Browserbase](./docs/zh/advanced/browserbase.md)
- [社交平台 comments](./docs/zh/adapters/social-comments.md)
