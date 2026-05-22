# 给 AI Agent 的 Skills

OpenCLI 提供 Codex/Claude/Cursor 风格的 skills，让 agent 不需要读完整文档，也能加载正确工作流。

## 安装

安装或刷新当前 fork 的全部 skills：

```bash
npx skills add albertcyhe/opencli
```

只安装一个 skill：

```bash
npx skills add albertcyhe/opencli --skill opencli-browserbase
```

## Skill 分流

| Skill | 什么时候加载 |
| --- | --- |
| `opencli-usage` | 需要 OpenCLI 总地图：命令发现、输出格式、通用规则、下一步该用哪个 skill。 |
| `opencli-browserbase` | 需要 Browserbase Context、账号配置、Live View URL、proxy CRUD、账号绑定 proxy，或 `opencli run --browserbase`。 |
| `opencli-social-comments` | 需要 Reddit、Twitter/X、YouTube、Instagram、TikTok、小红书 comments 读取、评论或回复，或 LinkedIn timeline 评论数量。 |
| `opencli-browser` | 需要通过 Browser Bridge 临时操作本地 Chrome 页面。 |
| `opencli-adapter-author` | 需要写可复用 adapter 或给已有站点加命令。 |
| `opencli-autofix` | adapter 命令失败，需要基于 trace 修复。 |

## Agent 默认规则

- 选择 adapter 前先跑 `opencli list -f json`。
- 有 adapter 时优先用 adapter，不要直接驱动浏览器。
- 下游要读取时使用 `-f json`。
- 身份、登录态或 proxy 重要时使用 `--browserbase-account <name>`。
- 最终输出不要泄露 Browserbase API key、proxy password、cookies 或 session connect URL。

Skill 文件位于仓库的 `skills/` 目录。详细命令放在各 skill 的 references 中，agent 需要时再加载。
