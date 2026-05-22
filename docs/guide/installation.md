# Installation

## Requirements

- Node.js 20 or newer, or Bun 1.0 or newer
- Chrome/Chromium plus the OpenCLI Browser Bridge extension for local browser-backed commands
- Browserbase credentials for cloud browser account/session workflows

## Install This Fork From Source

The current `albertcyhe/opencli` fork is not published as a separate npm package yet. Use the source install path:

```bash
node --version
git clone git@github.com:albertcyhe/opencli.git
cd opencli
npm install
npm run build
npm link
opencli --version
opencli list
```

## Browser Bridge

Install the extension from the [Chrome Web Store](https://chromewebstore.google.com/detail/opencli/ildkmabpimmkaediidaifkhjpohdnifk), or download the release zip from [albertcyhe/opencli releases](https://github.com/albertcyhe/opencli/releases).

Verify local browser connectivity:

```bash
opencli doctor
```

## Browserbase

```bash
export BROWSERBASE_API_KEY=...
export BROWSERBASE_PROJECT_ID=...
opencli browserbase account list
opencli browserbase proxy list
```

See [Browserbase accounts, proxies, and parallel sessions](../advanced/browserbase.md) for account bootstrap, Live View login, proxy CRUD, and pooled runs.

## Skills

Install or refresh all OpenCLI skills from this fork:

```bash
npx skills add albertcyhe/opencli
```

Or install only the skills you need:

```bash
npx skills add albertcyhe/opencli --skill opencli-usage
npx skills add albertcyhe/opencli --skill opencli-browserbase
npx skills add albertcyhe/opencli --skill opencli-social-comments
npx skills add albertcyhe/opencli --skill opencli-browser
npx skills add albertcyhe/opencli --skill opencli-adapter-author
npx skills add albertcyhe/opencli --skill opencli-autofix
```

See [Skills for AI agents](./skills.md).

## Update

```bash
git pull
npm install
npm run build
npm link
npx skills add albertcyhe/opencli
```
