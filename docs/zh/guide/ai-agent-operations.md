# AI Agent 操作指南

这页是给没有背景的 AI Agent 用的命令地图。用户要求 OpenCLI 任务时，先按这里选择命令和运行环境。

## 1. 发现能力

```bash
opencli list -f json
opencli <site> --help
opencli <site> <command> --help
```

`opencli list -f json` 是事实来源。它会返回命令名、别名、策略、浏览器需求、参数和输出列。

## 2. 选择运行环境

| 运行环境 | 命令形状 | 适用场景 |
| --- | --- | --- |
| Public adapter | `opencli <site> <command> ... -f json` | 不需要登录态或浏览器状态。 |
| 本地 Chrome | `opencli <site> <command> ... -f json` | 用户本机 Chrome 已登录，Browser Bridge 正常。 |
| Browserbase account | `opencli --browserbase-account <name> <site> <command> ... -f json` | 需要持久云端登录态、账号身份或账号绑定 proxy。 |
| 已有 Browserbase session | `opencli --browserbase-session <id> <site> <command> ... -f json` | 已经有 session，只要直接接入。 |
| 并发任务池 | `opencli run --browserbase --accounts ... --parallel ... jobs.jsonl` | 多个独立原子任务要跨账号并发。 |

浏览器型 adapter 的 session 优先级是：`--browserbase-account`、`--browserbase-session`、兼容的 `--session`、`BROWSERBASE_SESSION_ID`、`OPENCLI_CDP_ENDPOINT`、本地 Browser Bridge。

## 3. 配置 Browserbase 身份

```bash
export BROWSERBASE_API_KEY=...
export BROWSERBASE_PROJECT_ID=...

opencli browserbase proxy add us-ny \
  --type browserbase \
  --country US \
  --state NY \
  --city "New York"

opencli browserbase account bootstrap \
  --site reddit \
  --count 10 \
  --name-prefix reddit-main \
  --proxy us-ny \
  --open
```

Live View URL 用于人工登录。OpenCLI 本地只保存账号元数据；Browserbase Context 保存 cookies、localStorage、IndexedDB 和其它登录态。

日常操作：

```bash
opencli browserbase account list
opencli browserbase account get reddit-main-1
opencli browserbase account login reddit-main-1 --open --wait
opencli browserbase account check reddit-main-1 --command "reddit whoami"
opencli browserbase account set-proxy reddit-main-1 us-ny
opencli browserbase account clear-proxy reddit-main-1
opencli browserbase account mark reddit-main-1 --state invalidated
```

## 4. 执行原子命令

有 adapter 时优先用 adapter，不要直接手写浏览器流程。

```bash
opencli --browserbase-account reddit-main-1 \
  reddit get-comments "https://www.reddit.com/r/example/comments/1abc123/title/" \
  --limit 100 \
  -f json

opencli --browserbase-account x-main-1 \
  twitter get-comments "https://x.com/user/status/123" \
  --limit 50 \
  -f json
```

只有在没有 adapter、需要调试或一次性 UI 操作时，才用 `opencli browser <session> ...`。

## 5. 并发 JSONL 任务

每行是一个独立任务：

```json
{"id":"reddit-1","command":"reddit get-comments","args":{"post-id":"https://www.reddit.com/r/example/comments/1abc123/title/","limit":100}}
{"id":"reddit-2","account":"reddit-main-2","command":"reddit get-comments","args":{"post-id":"https://www.reddit.com/r/example/comments/1def456/title/","limit":100}}
```

用 Browserbase 账号池执行：

```bash
opencli run --browserbase \
  --accounts reddit-main-1,reddit-main-2,reddit-main-3,reddit-main-4,reddit-main-5,reddit-main-6,reddit-main-7,reddit-main-8,reddit-main-9,reddit-main-10 \
  --parallel 10 \
  --pool-size 10 \
  jobs.jsonl
```

任务池不会并发复用同一个 account/context。修改 proxy 只影响之后新建的 session。

## 6. 选择对应 Skill

```bash
npx skills add albertcyhe/opencli
```

| 任务 | Skill |
| --- | --- |
| 总体命令发现 | `opencli-usage` |
| Browserbase account/session/proxy/并发任务 | `opencli-browserbase` |
| Reddit/X/YouTube/Instagram/TikTok/小红书 comments | `opencli-social-comments` |
| 临时操作本地 Chrome | `opencli-browser` |
| 写可复用 adapter | `opencli-adapter-author` |
| 修复失效 adapter | `opencli-autofix` |

详细安装和分流见 [给 AI Agent 的 Skills](./skills.md)。
