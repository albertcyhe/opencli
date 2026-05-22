---
name: opencli-social-comments
description: Use when an OpenCLI task needs to read, list, post, or reply to comments on Reddit, Twitter/X, YouTube, Instagram, TikTok, Xiaohongshu, or inspect LinkedIn timeline comment counts. Includes Browserbase account routing when login state or proxy identity matters.
allowed-tools: Bash(opencli:*), Read
---

# opencli-social-comments

Use adapter commands for social comment work. Prefer `-f json` so returned comment IDs can be reused for replies.

## Start

```bash
opencli list -f json
opencli <platform> <comment-command> --help
```

If identity, login state, or proxy matters, prefix commands with:

```bash
opencli --browserbase-account <account> <platform> <command> ... -f json
```

Load `opencli-browserbase` for account/proxy setup.

## Common Reads

```bash
opencli reddit get-comments <reddit-post-url> --limit 100 -f json
opencli twitter get-comments <tweet-url> --limit 50 -f json
opencli youtube comments <youtube-url> --limit 100 -f json
opencli instagram get-comments <post-or-reel-url> --limit 50 -f json
opencli tiktok get-comments <video-url> --limit 50 -f json
opencli xiaohongshu comments <note-url> --with-replies -f json
opencli linkedin timeline --limit 20 -f json
```

## Load References When Needed

- [matrix.md](references/matrix.md): current platform support.
- [recipes.md](references/recipes.md): read/write examples and ID handling.

## Safety

- Do not run comment/reply/post commands unless the user explicitly wants a write action.
- Treat comment IDs as platform-scoped.
- Use Browserbase account profiles when a post must come from a specific identity or proxy.
- Do not print cookies, API keys, proxy passwords, Browserbase connect URLs, or private account details.
