# Remote Chrome

Run OpenCLI on a server or headless environment by connecting to a remote Chrome instance.

## Use Cases

- Running CLI commands on a remote server
- CI/CD automation with headed browser
- Shared team browser sessions

## Setup

### 1. Start Chrome on the Remote Machine

```bash
# On the remote machine (or your Mac)
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222
```

### 2. SSH Tunnel (If Needed)

If the remote Chrome is on a different machine, create an SSH tunnel:

```bash
# On your local machine or server
ssh -L 9222:127.0.0.1:9222 user@remote-host
```

::: warning
Use `127.0.0.1` instead of `localhost` in the SSH command to avoid IPv6 resolution issues that can cause timeouts.
:::

### 3. Configure OpenCLI

```bash
export OPENCLI_CDP_ENDPOINT="http://127.0.0.1:9222"
```

### 4. Verify

```bash
# Test the connection
curl http://127.0.0.1:9222/json/version

# Run a diagnostic
opencli doctor
```

## Browserbase (Cloud Browser)

[Browserbase](https://browserbase.com) provides managed cloud browsers with proxy support, persistent login contexts, and stealth mode.

### Setup

```bash
# Install bb CLI and configure API key
export BROWSERBASE_API_KEY=your_key
export BROWSERBASE_PROJECT_ID=your_project_id
```

### Create a Session

Use `bb` CLI to create sessions with the configuration you need:

```bash
# Basic session
bb sessions create --json

# With US proxy
bb sessions create --proxy us --json

# With persistent login context (preserves cookies across sessions)
bb contexts create --json          # One-time: create a context
bb sessions create --context <context-id> --json  # Use the context
```

### Run OpenCLI Commands

```bash
# Via --session flag
opencli --session <session-id> reddit get-comments <post-id> --limit 5

# Or via environment variable
export BROWSERBASE_SESSION_ID=<session-id>
opencli bilibili comments BV1xxx --limit 5
```

### Multi-Session Parallel Execution

```bash
# Create sessions with different proxies/accounts
S1=$(bb sessions create --proxy us --context ctx-reddit --json | jq -r .id)
S2=$(bb sessions create --proxy jp --context ctx-bilibili --json | jq -r .id)

# Run in parallel
opencli --session $S1 reddit get-comments <post> &
opencli --session $S2 bilibili comments BV1xxx &
wait

# Release sessions when done
bb sessions release $S1
bb sessions release $S2
```

### Error Handling

OpenCLI validates sessions before connecting. If a session is missing or expired, it provides actionable guidance:

```
Browserbase session "abc123" not found.
  Create one with: bb sessions create
```

### Notes

- OpenCLI only consumes sessions — all session/proxy/context management is done via `bb` CLI
- Priority: `--session` > `BROWSERBASE_SESSION_ID` > `OPENCLI_CDP_ENDPOINT` > local BrowserBridge
- Without `--session` or `BROWSERBASE_SESSION_ID`, behavior is unchanged (uses local browser)
- Persistent contexts save cookies/localStorage — log in once, reuse across sessions

## CI/CD Integration

For CI/CD environments, use a real Chrome instance with `xvfb`:

::: v-pre
```yaml
steps:
  - uses: browser-actions/setup-chrome@latest
    id: setup-chrome
  - run: |
      xvfb-run --auto-servernum \
        ${{ steps.setup-chrome.outputs.chrome-path }} \
        --remote-debugging-port=9222 &
```
:::

Set the browser executable path:
::: v-pre
```yaml
env:
  OPENCLI_BROWSER_EXECUTABLE_PATH: ${{ steps.setup-chrome.outputs.chrome-path }}
```
:::
