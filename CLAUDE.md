# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenCLI turns websites, Electron apps, and local CLIs into deterministic, scriptable command-line interfaces. It reuses Chrome/Chromium login sessions via a Browser Bridge extension + micro-daemon, with 79+ pre-built adapters. No LLM tokens at runtime.

- **Package**: `@jackwener/opencli` (npm)
- **Runtime**: Node.js >= 20 (ESM), also supports Bun
- **Language**: TypeScript 6 with strict mode

## Build & Development Commands

```bash
npm run build            # Clean dist -> tsc -> manifest -> copy YAML
npm run dev              # Run via tsx (no build needed)
npm run typecheck        # tsc --noEmit (also aliased as `npm run lint`)

# Testing (vitest with 4 project configs: unit, adapter, e2e, smoke)
npm test                 # Unit tests only (src/**/*.test.ts)
npm run test:adapter     # Adapter tests (clis/**/*.test.ts)
npm run test:e2e         # E2E tests (real CLI invocation via subprocess)
npm run test:all         # All test projects
OPENCLI_E2E=1 npm run test:all  # Include extended browser E2E tests

# Run a single test file
npx vitest run src/pipeline/template.test.ts
npx vitest run clis/hackernews/hackernews.test.ts

# Docs (VitePress)
npm run docs:dev
```

## Architecture

### Command Registration & Execution Flow

All commands register via `cli()` (src/registry.ts) into a global `Map<string, CliCommand>`. The key is `site/name` (e.g., `hackernews/top`). Two implementation styles:

1. **YAML Pipeline** (declarative, preferred): Sequential steps — `fetch`, `map`, `filter`, `limit`, `browser`, `intercept`, `download`, `tap`. Templates use `${{ expr }}` syntax. See `clis/hackernews/top.yaml`.
2. **TypeScript func** (imperative): For complex browser interactions. Receives `(page: IPage, kwargs)`. See `clis/bilibili/search.ts`.

Execution path: `commanderAdapter.ts` -> `execution.ts` (validate args, create browser session, navigate) -> `engine.ts` (dispatch to func or pipeline executor).

### Discovery

Fast path loads pre-compiled `cli-manifest.json` for instant YAML registration with lazy TS loading. Fallback scans `clis/` filesystem. User adapters live in `~/.opencli/clis/`.

### Browser Layer

`IPage` interface (src/types.ts) abstracts browser interaction. Two implementations:
- **BrowserBridge**: Chrome extension + local daemon (WebSocket on port 19825) for logged-in sessions
- **CDPBridge**: Direct Chrome DevTools Protocol for Electron apps

Anti-detection stealth patches in `src/browser/stealth.ts`.

### Strategy Enum

`PUBLIC` (no auth) | `COOKIE` (browser cookies) | `HEADER` (custom headers) | `INTERCEPT` (network interception) | `UI` (direct DOM automation)

### Key Directories

- `src/` — Core framework (registry, execution, pipeline engine, browser, output formatting)
- `src/pipeline/` — Pipeline executor, template evaluation, step implementations
- `src/browser/` — CDP client, bridge protocol, stealth, DOM utilities
- `clis/<site>/` — Site adapters (YAML or TS), co-located tests
- `skills/` — AI agent integration skills (Claude Code, Cursor)
- `extension/` — Browser Bridge Chrome extension (MV3)
- `tests/e2e/` — End-to-end tests (subprocess CLI invocation)

### Error Handling

Unified `CliError` subclasses in `src/errors.ts` with Unix exit codes (66=empty result, 69=browser unavailable, 75=timeout, 77=auth required, 78=config error).

## Code Conventions

- **ESM only** with `.js` extensions in imports (`import { cli } from './registry.js'`)
- **Named exports only** — no default exports
- **Files**: `kebab-case.ts` | **Variables/Functions**: `camelCase` | **Types**: `PascalCase`
- **Commits**: Conventional Commits — `feat(twitter): add thread command`, `fix(browser): handle timeout`
- Scope is site name or module name (`browser`, `pipeline`, `engine`)

## Creating Adapters

YAML adapters go in `clis/<site>/<command>.yaml`, TS adapters in `clis/<site>/<command>.ts`. Use `cli()` from `@jackwener/opencli/registry` for TS. Positional args for the primary target (query, id, username); named `--flags` for config (limit, format, sort). Validate with `opencli validate`.

## Comment & Reply System

Unified `search` → `get-comments` → `reply` pipeline across 8 platforms, designed as scaffolding for an upper-level AI agent orchestrator.

### Supported Platforms

| Platform | get-comments | reply | Strategy | comment_id format |
|----------|-------------|-------|----------|-------------------|
| Reddit | `reddit get-comments <post-id>` | `reddit reply <comment-id> <text>` | API (`/api/comment`) | `t1_xxxxx` |
| Twitter/X | `twitter get-comments <tweet-id>` | `twitter reply <tweet-url> <text>` | GraphQL + UI | numeric tweet ID |
| YouTube | `youtube comments <url>` | `youtube reply-comment <comment-id> <text> --url <url>` | InnerTube API + protobuf | `Ugxxx` |
| Instagram | `instagram get-comments <username> --index N` | `instagram reply <username> <comment-id> <text> --index N` | Private API + CSRF | numeric pk |
| TikTok | `tiktok get-comments <video-url>` | `tiktok reply <video-url> <comment-id> <text>` | API + UI (Enter key) | numeric cid |
| Bilibili | `bilibili comments <bvid>` | `bilibili reply <comment-id> <text> --bvid <bvid>` | API (WBI signing + CSRF) | numeric rpid |
| Douyin | `douyin get-comments <video-url>` | `douyin reply <video-url> <comment-id> <text>` | API (browserFetch + a_bogus) | numeric cid |
| Xiaohongshu | `xiaohongshu comments <note-id>` | `xiaohongshu reply <note-id> <comment-id> <text>` | DOM + UI | 24-char hex |

### Design Principles

- **API-first, UI-second**: Reddit/YouTube/Instagram/Bilibili/Douyin use internal APIs directly; Twitter/TikTok/Xiaohongshu fall back to UI automation.
- **comment_id contract**: `get-comments` returns a `comment_id` that is directly passable to `reply`. Output includes `rank` (1-indexed) for human review.
- **Fuzzy matching fallback**: TikTok/Xiaohongshu reply supports `--comment-text` and `--comment-author` for DOM-based matching when comment ID doesn't match.
- **Shared helpers**: `clis/_shared/reply-helpers.ts` provides `findCommentJs()`, `insertTextJs()`, `findAndClickButtonJs()` for UI-based reply adapters.

### Key Implementation Notes

- **YouTube ViewModel (2025+)**: Comment IDs come from `commentThreadRenderer.commentViewModel.commentViewModel.commentId`, not the legacy `commentRenderer`. Reply uses `create_comment` endpoint with protobuf-encoded `createCommentParams` (field 3 = parentCommentId).
- **TikTok DOM**: `[data-e2e="comment-level-1"]` is the text span, not the container. The comment container is its `parentElement`. Reply button is `[data-e2e="comment-reply-1"]`. Submit via Enter key, not a button.
- **Instagram**: Uses `username` + `--index` (post position) instead of post URL, because shortcode-to-media-pk conversion is unreliable.
- **Bilibili**: Uses WBI signing for API authentication + `bili_jct` cookie as CSRF token for write operations. Reply endpoint is `/x/v2/reply/add`.
- **Douyin**: Uses `browserFetch()` which auto-handles `a_bogus` signing in the browser context. Comment API: `/aweme/v1/web/comment/list/`, Reply API: `/aweme/v1/web/comment/publish/`.
- **Xiaohongshu**: API requires signed requests, so comments use DOM extraction (`.parent-comment` selectors). Reply uses UI automation. Supports nested replies (楼中楼) via `--with-replies`.
- **~/.opencli/clis/**: User-level adapter copies take priority over `dist/clis/`. After modifying adapters, sync with `cp -r dist/clis/<site>/* ~/.opencli/clis/<site>/`.
- **Facebook/LinkedIn**: Removed — these platforms block post detail rendering in automation windows.
