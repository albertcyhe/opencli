# 安装

## 系统要求

- Node.js 20 或更高版本，或 Bun 1.0 或更高版本
- 本地浏览器型命令需要 Chrome/Chromium 和 OpenCLI Browser Bridge 扩展
- Browserbase account/session 流程需要 Browserbase 凭证

## 从当前 fork 源码安装

当前 `albertcyhe/opencli` fork 还没有单独发布 npm 包，请使用源码安装路径：

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

从 [Chrome Web Store](https://chromewebstore.google.com/detail/opencli/ildkmabpimmkaediidaifkhjpohdnifk) 安装扩展，或从 [albertcyhe/opencli releases](https://github.com/albertcyhe/opencli/releases) 下载 release zip。

验证本地浏览器连接：

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

账号初始化、Live View 登录、proxy CRUD 和并发任务池见 [Browserbase 账号、Proxy 与并发 Session](../advanced/browserbase.md)。

## Skills

安装或刷新当前 fork 的所有 OpenCLI skills：

```bash
npx skills add albertcyhe/opencli
```

只安装需要的 skill：

```bash
npx skills add albertcyhe/opencli --skill opencli-usage
npx skills add albertcyhe/opencli --skill opencli-browserbase
npx skills add albertcyhe/opencli --skill opencli-social-comments
npx skills add albertcyhe/opencli --skill opencli-browser
npx skills add albertcyhe/opencli --skill opencli-adapter-author
npx skills add albertcyhe/opencli --skill opencli-autofix
```

见 [给 AI Agent 的 Skills](./skills.md)。

## 更新

```bash
git pull
npm install
npm run build
npm link
npx skills add albertcyhe/opencli
```
