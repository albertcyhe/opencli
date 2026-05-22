# Browserbase Command Reference

## Proxy

```bash
opencli browserbase proxy list
opencli browserbase proxy get <name>
opencli browserbase proxy add us-ny --type browserbase --country US --state NY --city "New York"
opencli browserbase proxy add dc1 --type external --server http://host:port --username user --password-env PROXY_DC1_PASS
opencli browserbase proxy update dc1 --server http://new-host:port
opencli browserbase proxy test dc1
opencli browserbase proxy delete dc1
```

`proxy delete` refuses active account references unless `--force` is intentional.

## Account

```bash
opencli browserbase account bootstrap --site reddit --count 10 --name-prefix reddit-main --proxy dc1 --open
opencli browserbase account list
opencli browserbase account get reddit-main-1
opencli browserbase account import reddit1 --site reddit --context-id <contextId> --proxy dc1
opencli browserbase account login reddit-main-1 --open --wait
opencli browserbase account check reddit-main-1 --command "reddit whoami"
opencli browserbase account mark reddit-main-1 --state ready
opencli browserbase account mark reddit-main-1 --state invalidated
opencli browserbase account set-proxy reddit-main-1 dc1
opencli browserbase account clear-proxy reddit-main-1
opencli browserbase account clear-login reddit-main-1 --recreate-context --delete-old-context
opencli browserbase account delete reddit-main-1 --delete-context
```

## Session

```bash
opencli browserbase session create --account reddit-main-1 --keep-alive --print-live-url
opencli browserbase session live-url <sessionId>
opencli browserbase session get <sessionId>
opencli browserbase session list
opencli browserbase session release <sessionId>
opencli browserbase session delete <sessionId>
```

## Context

```bash
opencli browserbase context create
opencli browserbase context get <contextId>
opencli browserbase context list-local
opencli browserbase context delete <contextId>
```

## Adapter Runtime

```bash
opencli --browserbase-account <account> <site> <command> ... -f json
opencli --browserbase-session <sessionId> <site> <command> ... -f json
opencli --session <sessionId> <site> <command> ... -f json
```
