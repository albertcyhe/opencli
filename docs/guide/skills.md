# Skills For AI Agents

OpenCLI ships Codex/Claude/Cursor-style skills so an agent can load the right workflow instead of reading all docs.

## Install

Install or refresh all skills from this fork:

```bash
npx skills add albertcyhe/opencli
```

Install one skill:

```bash
npx skills add albertcyhe/opencli --skill opencli-browserbase
```

## Skill Router

| Skill | Load when |
| --- | --- |
| `opencli-usage` | You need the top-level map of OpenCLI commands, output formats, discovery commands, and which skill to load next. |
| `opencli-browserbase` | You need Browserbase Contexts, account profiles, session Live View URLs, proxy CRUD, account-bound proxies, or `opencli run --browserbase`. |
| `opencli-social-comments` | You need comment extraction, posting, or replies on Reddit, Twitter/X, YouTube, Instagram, TikTok, Xiaohongshu, or LinkedIn timeline counts. |
| `opencli-browser` | You need to drive a local Chrome page through Browser Bridge with `opencli browser <session> ...`. |
| `opencli-adapter-author` | You are writing a reusable adapter or adding a command to an existing site. |
| `opencli-autofix` | An adapter command failed and you need trace-driven repair. |

## Agent Defaults

- Use `opencli list -f json` before choosing an adapter.
- Prefer adapter commands over raw browser driving.
- Use `-f json` for machine-consumed output.
- Use `--browserbase-account <name>` when identity, login state, or proxy matters.
- Do not expose Browserbase API keys, proxy passwords, cookies, or session connect URLs in final output.

The skill files live under `skills/` in this repository. Detailed commands remain in each skill's references so agents only load what they need.
