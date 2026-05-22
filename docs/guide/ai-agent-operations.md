# AI Agent Operations

This page is the command map for a background-free AI agent. Start here when the user asks for an OpenCLI task and you need to choose the right command.

## 1. Discover The Surface

```bash
opencli list -f json
opencli <site> --help
opencli <site> <command> --help
```

Use `opencli list -f json` as the source of truth. It returns command names, aliases, strategy, browser requirements, arguments, and output columns.

## 2. Pick The Runtime

| Runtime | Command shape | When to use |
| --- | --- | --- |
| Public adapter | `opencli <site> <command> ... -f json` | No login or browser state needed. |
| Local Chrome | `opencli <site> <command> ... -f json` | The user's local Chrome is logged in and Browser Bridge is healthy. |
| Browserbase account | `opencli --browserbase-account <name> <site> <command> ... -f json` | Need durable cloud login state, account identity, or account-bound proxy. |
| Existing Browserbase session | `opencli --browserbase-session <id> <site> <command> ... -f json` | A session already exists and should be reused directly. |
| Pooled jobs | `opencli run --browserbase --accounts ... --parallel ... jobs.jsonl` | Many independent atomic jobs should run across accounts. |

Session priority for browser-backed adapters is: `--browserbase-account`, `--browserbase-session`, legacy `--session`, `BROWSERBASE_SESSION_ID`, `OPENCLI_CDP_ENDPOINT`, then local Browser Bridge.

## 3. Configure Browserbase Identity

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

The Live View URLs are for manual login. OpenCLI stores account metadata locally; Browserbase Context stores cookies, localStorage, IndexedDB, and other login state.

Daily operations:

```bash
opencli browserbase account list
opencli browserbase account get reddit-main-1
opencli browserbase account login reddit-main-1 --open --wait
opencli browserbase account check reddit-main-1 --command "reddit whoami"
opencli browserbase account set-proxy reddit-main-1 us-ny
opencli browserbase account clear-proxy reddit-main-1
opencli browserbase account mark reddit-main-1 --state invalidated
```

## 4. Run Atomic Commands

Always prefer adapter commands over raw browser driving when a command exists.

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

Only use `opencli browser <session> ...` for ad-hoc UI work, debugging, or tasks that have no adapter.

## 5. Run Parallel JSONL Jobs

Each JSONL line is one independent job:

```json
{"id":"reddit-1","command":"reddit get-comments","args":{"post-id":"https://www.reddit.com/r/example/comments/1abc123/title/","limit":100}}
{"id":"reddit-2","account":"reddit-main-2","command":"reddit get-comments","args":{"post-id":"https://www.reddit.com/r/example/comments/1def456/title/","limit":100}}
```

Run through a Browserbase account pool:

```bash
opencli run --browserbase \
  --accounts reddit-main-1,reddit-main-2,reddit-main-3,reddit-main-4,reddit-main-5,reddit-main-6,reddit-main-7,reddit-main-8,reddit-main-9,reddit-main-10 \
  --parallel 10 \
  --pool-size 10 \
  jobs.jsonl
```

The pool does not reuse the same account/context concurrently. Proxy changes affect only sessions created after the change.

## 6. Choose The Right Skill

```bash
npx skills add albertcyhe/opencli
```

| Task | Skill |
| --- | --- |
| General command discovery | `opencli-usage` |
| Browserbase accounts, sessions, proxies, pooled jobs | `opencli-browserbase` |
| Reddit/X/YouTube/Instagram/TikTok/Xiaohongshu comments | `opencli-social-comments` |
| Ad-hoc local Chrome operation | `opencli-browser` |
| Build a reusable adapter | `opencli-adapter-author` |
| Fix a broken adapter | `opencli-autofix` |

Detailed skill install and routing: [Skills for AI agents](./skills.md).
