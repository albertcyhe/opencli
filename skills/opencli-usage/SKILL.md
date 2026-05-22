---
name: opencli-usage
description: Use at the start of any OpenCLI session. This is the top-level map for command discovery, install/update, output formats, Browser Bridge vs Browserbase runtime choice, and which specialized OpenCLI skill to load next.
allowed-tools: Bash(opencli:*), Read
---

# opencli-usage

OpenCLI turns websites, Browserbase cloud browser accounts, Electron apps, and external CLIs into a uniform `opencli <site> <command>` surface. Use this skill to orient, then load a specialized skill when the task is clear.

## Install

```bash
git clone git@github.com:albertcyhe/opencli.git
cd opencli
npm install
npm run build
npm link
opencli doctor
opencli list
```

The active fork is not published as a separate npm package yet. Install from source, and install skills from the fork:

```bash
npx skills add albertcyhe/opencli
```

## Discover Commands

Always discover the live registry instead of copying stale command lists:

```bash
opencli list -f json
opencli <site> --help
opencli <site> <command> --help
```

`opencli list -f json` is the source of truth for `{site, name, aliases, description, strategy, browser, args, columns}`.

## Runtime Choice

| Use | Command shape |
| --- | --- |
| Public or local adapter | `opencli <site> <command> ... -f json` |
| Local Chrome login via Browser Bridge | `opencli <site> <command> ... -f json` after `opencli doctor` |
| Browserbase account/context/proxy | `opencli --browserbase-account <name> <site> <command> ... -f json` |
| Existing Browserbase session | `opencli --browserbase-session <id> <site> <command> ... -f json` |
| Parallel Browserbase jobs | `opencli run --browserbase --accounts ... --parallel ... jobs.jsonl` |

Browser-backed adapters resolve in this priority: `--browserbase-account`, `--browserbase-session`, legacy `--session`, `BROWSERBASE_SESSION_ID`, `OPENCLI_CDP_ENDPOINT`, local Browser Bridge.

## Universal Output

Agents should pass `-f json` unless the user asks for a human table or markdown:

```bash
opencli reddit get-comments <url> --limit 100 -f json
```

Formats: `table`, `json`, `yaml`, `plain`, `md`, `csv`. Use `-v` for verbose error detail.

## Skill Router

| If the task is about... | Load |
| --- | --- |
| Browserbase account profiles, Contexts, Live View login, proxy CRUD, account-bound proxy, pooled JSONL runs | `opencli-browserbase` |
| Reddit/X/YouTube/Instagram/TikTok/Xiaohongshu comments or LinkedIn timeline comment counts | `opencli-social-comments` |
| Ad-hoc local Chrome navigation, clicks, form filling, extraction, network capture | `opencli-browser` |
| Writing or extending a reusable adapter | `opencli-adapter-author` |
| Repairing a failing adapter with trace artifacts | `opencli-autofix` |

## Environment Variables

| variable | purpose |
| --- | --- |
| `OPENCLI_DAEMON_PORT` | Browser Bridge daemon port, default `19825`. |
| `OPENCLI_PROFILE` | Local Browser Bridge profile alias/contextId. |
| `OPENCLI_WINDOW` | `foreground` or `background` browser window mode. |
| `OPENCLI_CDP_ENDPOINT` | Manual CDP endpoint for remote Chrome or Electron apps. |
| `BROWSERBASE_API_KEY` | Browserbase API key. |
| `BROWSERBASE_PROJECT_ID` | Browserbase project id for Context/account operations. |
| `BROWSERBASE_SESSION_ID` | Existing Browserbase session id fallback. |

## Rules

- Prefer adapter commands over raw browser driving.
- Use Browserbase account profiles when login state, account identity, or proxy exit path matters.
- Do not expose Browserbase API keys, proxy passwords, cookies, or session connect URLs in final output.
- Adapter imports still use `@jackwener/opencli/registry` and `@jackwener/opencli/errors` unless the package name is migrated later.
