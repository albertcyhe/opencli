# Browserbase Security

- `~/.opencli/browserbase.json` stores only metadata: account names, site tags, context ids, proxy names, and timestamps.
- Cookies, localStorage, IndexedDB, and login state remain inside Browserbase Contexts.
- Prefer `--password-env` for external proxy passwords.
- Plaintext proxy password storage requires an explicit plaintext flag when supported; do not suggest it by default.
- Output redacts proxy passwords, Browserbase API keys, connect URLs, and other sensitive fields by default.
- Only use `--show-sensitive` when the user explicitly needs sensitive JSON and understands the exposure.
- Never echo secrets in final answers or commit them to docs, fixtures, traces, or examples.
