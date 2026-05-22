# Browserbase Pooled Runs

Use pooled runs for independent atomic jobs that can be distributed across account profiles.

## Job File

Each line in `jobs.jsonl` is one job:

```json
{"id":"reddit-1","command":"reddit get-comments","args":{"post-id":"https://www.reddit.com/r/example/comments/1abc123/title/","limit":100}}
{"id":"reddit-2","account":"reddit-main-2","command":"reddit get-comments","args":{"post-id":"https://www.reddit.com/r/example/comments/1def456/title/","limit":100}}
```

Jobs can pin an account with `account` or `accountName`; otherwise OpenCLI rotates through the `--accounts` list.

## Run

```bash
opencli run --browserbase \
  --accounts reddit-main-1,reddit-main-2,reddit-main-3,reddit-main-4,reddit-main-5,reddit-main-6,reddit-main-7,reddit-main-8,reddit-main-9,reddit-main-10 \
  --parallel 10 \
  --pool-size 10 \
  jobs.jsonl
```

The pool keeps one active automation session per account/context. Different accounts can run concurrently. Browserbase plan limits can be lower than 10.

## Persistence

Task sessions persist context by default. Use `--no-persist-context` only when the job must not write back browser state.
