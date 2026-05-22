# Browserbase 账号、Proxy 与并发 Session

OpenCLI 把 Browserbase 拆成三个一等概念：

- **Account profile**：OpenCLI 本地账号元数据，包含账号名、站点标签、Browserbase `contextId`、默认 proxy 和登录状态时间戳。
- **Context**：Browserbase 持久浏览器 profile，保存 cookies、localStorage、IndexedDB 和其它登录态。
- **Session**：短生命周期 Browserbase 浏览器实例，用于 Live View 人工登录或自动化任务。

Proxy 是创建 session 时的参数。账号绑定 proxy 的含义是：以后这个账号新建 session 时默认使用同一个出口。已经运行的 session 不会被修改。

## 15 分钟上手

配置凭证：

```bash
export BROWSERBASE_API_KEY=...
export BROWSERBASE_PROJECT_ID=...
```

创建 proxy。外部 proxy 密码优先用 `--password-env`：

```bash
export PROXY_REDDIT1_PASS=...

opencli browserbase proxy add reddit1-proxy \
  --type external \
  --server http://host:port \
  --username user \
  --password-env PROXY_REDDIT1_PASS
```

创建账号并打开 Live View 登录 session：

```bash
opencli browserbase account bootstrap \
  --site reddit \
  --count 10 \
  --name-prefix reddit-main \
  --proxy reddit1-proxy \
  --open
```

在每个 Live View URL 中人工登录，然后标记账号 ready，或对单个账号使用 `login --wait`：

```bash
opencli browserbase account login reddit-main-1 --open --wait
opencli browserbase account mark reddit-main-1 --state ready
```

跑一个原子任务：

```bash
opencli --browserbase-account reddit-main-1 \
  reddit get-comments "https://www.reddit.com/r/example/comments/1abc123/title/" \
  --limit 100 \
  -f json
```

## 日常账号操作

```bash
opencli browserbase account list
opencli browserbase account get reddit-main-1
opencli browserbase account check reddit-main-1 --command "reddit whoami"
opencli browserbase account login reddit-main-1 --open --wait
opencli browserbase account mark reddit-main-1 --state invalidated
```

导入已有 Browserbase Context：

```bash
opencli browserbase account import reddit1 \
  --site reddit \
  --context-id <contextId> \
  --proxy reddit1-proxy
```

修改或移除未来 session 的默认 proxy：

```bash
opencli browserbase account set-proxy reddit-main-1 reddit1-proxy
opencli browserbase account clear-proxy reddit-main-1
```

清除登录态但保留账号名：

```bash
opencli browserbase account clear-login reddit-main-1 \
  --recreate-context \
  --delete-old-context
```

删除本地账号元数据，并可选删除远端 Context：

```bash
opencli browserbase account delete reddit-main-1 --delete-context
```

## Proxy CRUD

Browserbase 地理 proxy：

```bash
opencli browserbase proxy add us-ny \
  --type browserbase \
  --country US \
  --state NY \
  --city "New York"
```

外部 proxy：

```bash
export PROXY_DC1_PASS=...

opencli browserbase proxy add dc1 \
  --type external \
  --server http://host:port \
  --username user \
  --password-env PROXY_DC1_PASS
```

管理 proxy：

```bash
opencli browserbase proxy list
opencli browserbase proxy get dc1
opencli browserbase proxy update dc1 --server http://new-host:port
opencli browserbase proxy test dc1
opencli browserbase proxy delete dc1
```

`proxy delete` 默认拒绝删除仍被账号引用的 proxy。只有在你明确想让 OpenCLI 清空这些账号引用时才使用 `--force`。

## 并发任务

创建 `jobs.jsonl`，每行一个独立任务：

```json
{"id":"reddit-1","command":"reddit get-comments","args":{"post-id":"https://www.reddit.com/r/example/comments/1abc123/title/","limit":100}}
{"id":"reddit-2","account":"reddit-main-2","command":"reddit get-comments","args":{"post-id":"https://www.reddit.com/r/example/comments/1def456/title/","limit":100}}
```

跨账号执行：

```bash
opencli run --browserbase \
  --accounts reddit-main-1,reddit-main-2,reddit-main-3,reddit-main-4,reddit-main-5,reddit-main-6,reddit-main-7,reddit-main-8,reddit-main-9,reddit-main-10 \
  --parallel 10 \
  --pool-size 10 \
  jobs.jsonl
```

任务池保证同一个 account/context 同时只有一个 active automation session，不同账号可以并发。`--pool-size` 最高 10；Browserbase plan 或 API 仍可能给出更低的实际上限。

## Session 和 Context 命令

手动 session 生命周期：

```bash
opencli browserbase session create --account reddit-main-1 --keep-alive --print-live-url
opencli browserbase session live-url <sessionId>
opencli browserbase session get <sessionId>
opencli browserbase session list
opencli browserbase session release <sessionId>
opencli browserbase session delete <sessionId>
```

底层 Context 命令：

```bash
opencli browserbase context create
opencli browserbase context get <contextId>
opencli browserbase context list-local
opencli browserbase context delete <contextId>
```

已有 Browserbase session 仍可直接使用：

```bash
opencli --browserbase-session <sessionId> reddit get-comments <url> -f json
opencli --session <sessionId> reddit get-comments <url> -f json
```

## 安全与存储

- 本地元数据保存在 `~/.opencli/browserbase.json`，权限为 `0600`。
- cookies 和登录态保存在 Browserbase Context，不写入本地配置。
- proxy 明文密码和 Browserbase connect URL 默认 redacted。
- 只有明确需要查看敏感字段时才使用 `--show-sensitive`。
- 只读检查默认不持久化 context 写入；登录和普通任务 session 默认持久化。

## 选择优先级

浏览器型 adapter 按以下顺序解析浏览器配置：

1. `--browserbase-account <name>`
2. `--browserbase-session <sessionId>`
3. 兼容参数 `--session <sessionId>`
4. `BROWSERBASE_SESSION_ID`
5. `OPENCLI_CDP_ENDPOINT`
6. 本地 Browser Bridge
