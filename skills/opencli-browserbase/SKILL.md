---
name: opencli-browserbase
description: Use when an OpenCLI task needs Browserbase cloud browsers, persistent login Contexts, account profiles, Live View login URLs, account-bound proxies, external or Browserbase proxy CRUD, existing session attachment, or parallel `opencli run --browserbase` jobs.
allowed-tools: Bash(opencli:*), Read
---

# opencli-browserbase

Use this skill whenever identity, login state, cloud browser sessions, or proxy exit path matters. OpenCLI stores only account/proxy metadata locally; Browserbase Contexts store the actual login state.

## Mental Model

- **Account profile**: local name, site tag, Browserbase `contextId`, default proxy, and state metadata.
- **Context**: Browserbase persistent browser profile. Cookies/localStorage/IndexedDB live here.
- **Session**: short-lived browser instance for Live View login or automation.
- **Proxy**: applied when a session is created. Changing a proxy affects future sessions only.

## First Workflow

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
  --count 10 \
  --name-prefix reddit-main \
  --proxy reddit1-proxy \
  --open

opencli --browserbase-account reddit-main-1 \
  reddit get-comments <url> \
  --limit 100 \
  -f json
```

## Load References When Needed

- [commands.md](references/commands.md): account/proxy/session/context command catalog.
- [pooled-runs.md](references/pooled-runs.md): JSONL format and `opencli run --browserbase` usage.
- [security.md](references/security.md): storage, redaction, and sensitive-output rules.

## Defaults

- Use `--password-env` for proxy passwords; avoid plaintext storage.
- Use `--browserbase-account <name>` rather than an explicit session when login state should persist.
- Use `account check <name> --command "<site> whoami"` or an equivalent read command after suspected login expiry.
- For many independent tasks, use `opencli run --browserbase --accounts ... --parallel ...`.
- Do not print API keys, proxy passwords, cookies, or Browserbase connect URLs.
