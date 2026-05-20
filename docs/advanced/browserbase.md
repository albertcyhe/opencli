# Browserbase Accounts, Login State, Proxies, and Parallel Sessions

OpenCLI can run browser-backed adapters through Browserbase in three ways:

- an explicit Browserbase session (`--browserbase-session` or legacy `--session`)
- an OpenCLI Browserbase account profile (`--browserbase-account`)
- a pooled JSONL run (`opencli run --browserbase`)

The durable login state is stored in Browserbase Contexts. Browserbase Sessions
are short-lived browser instances used for manual login or automation, and proxy
settings are applied when a session is created. Binding an account profile to a
proxy means every future session for that account uses the same exit path unless
you override it.

## Configure

```bash
export BROWSERBASE_API_KEY=...
export BROWSERBASE_PROJECT_ID=...
```

OpenCLI stores only local metadata at `~/.opencli/browserbase.json` with `0600`
permissions: account names, site tags, Browserbase `contextId` values, proxy
profile references, and login-state timestamps. Cookies, localStorage, and
IndexedDB stay inside Browserbase Contexts. Proxy passwords should be referenced
through environment variables.

Add a proxy profile:

```bash
opencli browserbase proxy add us-ny \
  --type browserbase \
  --country US \
  --state NY \
  --city "New York"
```

External proxies should use an environment variable for the password:

```bash
export PROXY_DC1_PASS=...

opencli browserbase proxy add dc1 \
  --type external \
  --server http://host:port \
  --username user \
  --password-env PROXY_DC1_PASS
```

Proxy CRUD:

```bash
opencli browserbase proxy list
opencli browserbase proxy get dc1
opencli browserbase proxy update dc1 --server http://new-host:port
opencli browserbase proxy test dc1
opencli browserbase proxy delete dc1
```

`proxy delete` refuses to remove a proxy that accounts still reference. Use
`--force` when you intentionally want OpenCLI to clear those account references.

## Create Login Profiles

Create ten account profiles, each with its own Browserbase Context, then open
Live View URLs for manual login:

```bash
opencli browserbase account bootstrap \
  --site x \
  --count 10 \
  --name-prefix x-main \
  --proxy us-ny \
  --open
```

After logging in, either keep the sessions open and mark accounts manually:

```bash
opencli browserbase account mark x-main-1 --state ready
```

or use `--wait` so OpenCLI waits for Enter, releases the login session, and
marks the account ready:

```bash
opencli browserbase account login x-main-1 --open --wait
```

Use the same account name later and OpenCLI will create a fresh Browserbase
Session attached to the saved Context, so the site should see the prior login
state. Site-side cookie expiry, password changes, or server-side logout can still
invalidate that state; mark or refresh the account when that happens.

```bash
opencli browserbase account check x-main-1 --command "reddit whoami"
opencli browserbase account mark x-main-1 --state invalidated
opencli browserbase account login x-main-1 --open --wait
```

To import an existing Browserbase Context as an OpenCLI account:

```bash
opencli browserbase account import reddit1 --site reddit --context-id <contextId> --proxy dc1
```

## Run Commands

Run one adapter command with a specific Browserbase account:

```bash
opencli --browserbase-account x-main-1 reddit get-comments https://reddit.com/r/...
```

Run a JSONL job file across up to ten Browserbase account sessions:

```bash
opencli run --browserbase \
  --accounts x-main-1,x-main-2,x-main-3,x-main-4,x-main-5,x-main-6,x-main-7,x-main-8,x-main-9,x-main-10 \
  --parallel 10 \
  --pool-size 10 \
  jobs.jsonl
```

Each line in `jobs.jsonl` is one job:

```json
{"id":"reddit-1","command":"reddit get-comments","args":{"post-id":"https://reddit.com/r/...","limit":100}}
```

Jobs can pin an account with `"account"` or `"accountName"`; otherwise OpenCLI
round-robins across `--accounts`. The pool guarantees one active automation
session per account/context while allowing different accounts to run in
parallel. `--pool-size` is capped at 10; the effective limit can still be lower
if your Browserbase plan or API response rejects more sessions.

## Manage State

```bash
opencli browserbase account list
opencli browserbase account get x-main-1
opencli browserbase account check x-main-1 --command "reddit whoami"
opencli browserbase account set-proxy x-main-1 us-ny
opencli browserbase account clear-proxy x-main-1
opencli browserbase account clear-login x-main-1 --recreate-context --delete-old-context
opencli browserbase account delete x-main-1 --delete-context
```

`clear-login --recreate-context` replaces the account's Context so the next
login starts from an empty browser profile. `delete --delete-context` removes
both the local account profile and the remote Context.

Session commands are available when you need a manual session:

```bash
opencli browserbase session create --account x-main-1 --keep-alive --print-live-url
opencli browserbase session live-url <sessionId>
opencli browserbase session get <sessionId>
opencli browserbase session list
opencli browserbase session release <sessionId>
opencli browserbase session delete <sessionId>
```

Context commands are lower-level tools for direct Browserbase Context work:

```bash
opencli browserbase context create
opencli browserbase context get <contextId>
opencli browserbase context list-local
opencli browserbase context delete <contextId>
```

Sensitive fields such as proxy plaintext passwords and Browserbase connect URLs
are redacted by default. Use `--show-sensitive` only when you need to inspect
them directly.

## Session Selection Priority

For browser-backed adapters, OpenCLI resolves remote browser settings in this
order:

1. `--browserbase-account <name>`
2. `--browserbase-session <sessionId>`
3. legacy `--session <sessionId>`
4. `BROWSERBASE_SESSION_ID`
5. `OPENCLI_CDP_ENDPOINT`
6. local Browser Bridge

Read-only checks run with `persistContext: false`; login and normal task
sessions persist by default. Pass `--no-persist-context` to `opencli run` or
`browserbase session create` when you intentionally do not want a session to
write back context changes.
