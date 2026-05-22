# OpenCLI

> Turn websites, logged-in browser profiles, Browserbase cloud browsers, Electron apps, and local CLIs into deterministic commands for humans and AI agents.

[![中文文档](https://img.shields.io/badge/docs-%E4%B8%AD%E6%96%87-0F766E?style=flat-square)](./README.zh-CN.md)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-339933?style=flat-square)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square)](./LICENSE)

OpenCLI is an agent-facing CLI surface. It can:

- run 100+ built-in website and desktop adapters with stable JSON/table/CSV output
- reuse a local Chrome login through Browser Bridge
- run Browserbase sessions with persistent account Contexts, per-account proxy binding, and up to 10 concurrent cloud browsers
- execute social comment workflows for Reddit, Twitter/X, YouTube, Instagram, TikTok, Xiaohongshu, and supported LinkedIn timeline metadata
- expose skills that tell an AI agent which `opencli` command to call

This fork is documented and maintained at [`albertcyhe/opencli`](https://github.com/albertcyhe/opencli). It is not published as a separate npm package yet; install it from source. Adapter/plugin import names still use `@jackwener/opencli`.

## Quick Start

OpenCLI requires Node.js 20 or newer. Install the current fork from source:

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

For local Chrome login reuse, install the OpenCLI Browser Bridge extension from the [Chrome Web Store](https://chromewebstore.google.com/detail/opencli/ildkmabpimmkaediidaifkhjpohdnifk), or download the extension zip from [albertcyhe/opencli releases](https://github.com/albertcyhe/opencli/releases).

## What An Agent Can Do

Discover commands at runtime instead of guessing:

```bash
opencli list -f json
opencli reddit --help
opencli reddit get-comments --help
```

Run atomic adapter commands with machine-readable output:

```bash
opencli hackernews top --limit 5 -f json
opencli reddit get-comments "https://www.reddit.com/r/example/comments/1abc123/title/" --limit 100 -f json
opencli twitter get-comments "https://x.com/user/status/123" --limit 50 -f json
opencli youtube comments "https://www.youtube.com/watch?v=VIDEO_ID" --limit 100 -f json
opencli xiaohongshu comments "https://www.xiaohongshu.com/search_result/<id>?xsec_token=..." --with-replies -f json
```

Use `-f json` by default when another agent or program will consume the result.

## Browserbase Multi-Account Setup

Set Browserbase credentials:

```bash
export BROWSERBASE_API_KEY=...
export BROWSERBASE_PROJECT_ID=...
```

Create a proxy profile. External proxy passwords should live in environment variables:

```bash
export PROXY_REDDIT1_PASS=...

opencli browserbase proxy add reddit1-proxy \
  --type external \
  --server http://133.169.0.110:60088 \
  --username p9SIbn0S6AoC \
  --password-env PROXY_REDDIT1_PASS
```

Create ten persistent login profiles and open Live View URLs for manual login:

```bash
opencli browserbase account bootstrap \
  --site reddit \
  --count 10 \
  --name-prefix reddit-main \
  --proxy reddit1-proxy \
  --open
```

Each account maps to one Browserbase Context. Cookies, localStorage, and IndexedDB stay in Browserbase; OpenCLI stores only metadata in `~/.opencli/browserbase.json`.

After login, run one task through a named account:

```bash
opencli --browserbase-account reddit-main-1 \
  reddit get-comments "https://www.reddit.com/r/example/comments/1abc123/title/" \
  --limit 100 \
  -f json
```

Run a JSONL job file across up to ten accounts:

```bash
opencli run --browserbase \
  --accounts reddit-main-1,reddit-main-2,reddit-main-3,reddit-main-4,reddit-main-5,reddit-main-6,reddit-main-7,reddit-main-8,reddit-main-9,reddit-main-10 \
  --parallel 10 \
  --pool-size 10 \
  jobs.jsonl
```

Useful account and proxy operations:

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

Details: [Browserbase accounts, proxies, and parallel sessions](./docs/advanced/browserbase.md).

## Social Comments

| Platform | Read comments | Write support |
| --- | --- | --- |
| Reddit | `reddit read`, `reddit get-comments` | `reddit comment`, `reddit reply` |
| Twitter/X | `twitter get-comments`, `twitter thread` | `twitter reply`, `twitter post` |
| YouTube | `youtube comments` | `youtube reply`, `youtube reply-comment` |
| Instagram | `instagram get-comments` | `instagram comment`, `instagram reply` |
| TikTok | `tiktok get-comments` | `tiktok comment`, `tiktok reply` |
| Xiaohongshu | `xiaohongshu comments` | `xiaohongshu reply` |
| LinkedIn | `linkedin timeline` comment counts | comment threads are not exposed yet |

See [Social Comment Support](./docs/adapters/social-comments.md) for platform-specific arguments, IDs, and safety notes.

## Skills For AI Agents

Install or refresh all OpenCLI skills from this fork:

```bash
npx skills add albertcyhe/opencli
```

Install only the skill you need:

```bash
npx skills add albertcyhe/opencli --skill opencli-usage
npx skills add albertcyhe/opencli --skill opencli-browserbase
npx skills add albertcyhe/opencli --skill opencli-social-comments
npx skills add albertcyhe/opencli --skill opencli-browser
npx skills add albertcyhe/opencli --skill opencli-adapter-author
npx skills add albertcyhe/opencli --skill opencli-autofix
```

| Skill | Use it when the agent needs to |
| --- | --- |
| `opencli-usage` | discover OpenCLI capabilities and choose the next skill |
| `opencli-browserbase` | manage Browserbase accounts, contexts, sessions, proxies, or pooled runs |
| `opencli-social-comments` | read or write comments across supported social adapters |
| `opencli-browser` | drive a local Chrome page ad hoc through Browser Bridge |
| `opencli-adapter-author` | create or extend a reusable adapter |
| `opencli-autofix` | repair a broken adapter after a traced failure |

Skill source files live in [`skills/`](./skills/). The docs entry point is [Skills for AI agents](./docs/guide/skills.md).

## More Docs

- [Getting Started](./docs/guide/getting-started.md)
- [AI Agent Operations](./docs/guide/ai-agent-operations.md)
- [Installation](./docs/guide/installation.md)
- [Browser Bridge](./docs/guide/browser-bridge.md)
- [All adapters](./docs/adapters/index.md)
- [Browserbase](./docs/advanced/browserbase.md)
- [Social comments](./docs/adapters/social-comments.md)
