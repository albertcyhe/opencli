# Getting Started

OpenCLI gives humans and AI agents one deterministic command surface for websites, Browserbase cloud browsers, Electron apps, and external CLIs.

## Install

The current fork is not published as a separate npm package yet. Install it from source:

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

## Discover Commands

Use runtime discovery first. Adapter support changes faster than docs.

```bash
opencli list -f json
opencli <site> --help
opencli <site> <command> --help
```

Agents should usually request JSON:

```bash
opencli hackernews top --limit 5 -f json
opencli reddit get-comments "https://www.reddit.com/r/example/comments/1abc123/title/" --limit 100 -f json
```

## Choose A Browser Runtime

| Runtime | Use when |
| --- | --- |
| Public/API adapter | The command does not need login or browser state. |
| Local Browser Bridge | The task should reuse a Chrome profile on this machine. |
| Browserbase account | The task needs a cloud browser, durable login state, account-to-proxy binding, or parallel identities. |
| Explicit Browserbase session | You already created a Browserbase session and only need OpenCLI to attach to it. |

Local Chrome setup: [Browser Bridge](./browser-bridge.md).

Browserbase setup: [Browserbase accounts, proxies, and parallel sessions](../advanced/browserbase.md).

## First Browserbase Task

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
  --count 1 \
  --name-prefix reddit-main \
  --proxy reddit1-proxy \
  --open

opencli --browserbase-account reddit-main-1 \
  reddit get-comments "https://www.reddit.com/r/example/comments/1abc123/title/" \
  --limit 100 \
  -f json
```

## First Parallel Run

Create `jobs.jsonl` with one command per line:

```json
{"id":"reddit-1","command":"reddit get-comments","args":{"post-id":"https://www.reddit.com/r/example/comments/1abc123/title/","limit":100}}
{"id":"reddit-2","command":"reddit get-comments","args":{"post-id":"https://www.reddit.com/r/example/comments/1def456/title/","limit":100}}
```

Run the jobs through named Browserbase accounts:

```bash
opencli run --browserbase \
  --accounts reddit-main-1,reddit-main-2,reddit-main-3 \
  --parallel 3 \
  jobs.jsonl
```

The pool keeps one active automation session per account/context, while different accounts can run concurrently.

## Next Steps

- [AI Agent Operations](./ai-agent-operations.md)
- [Skills for AI agents](./skills.md)
- [Social Comment Support](../adapters/social-comments.md)
- [All adapters](../adapters/index.md)
- [Extending OpenCLI](./extending-opencli.md)
