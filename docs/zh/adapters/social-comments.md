# 社交平台 Comments 支持

OpenCLI 把社交平台评论流程暴露成原子 adapter 命令。可以直接调用，也可以通过 Browserbase account 指定登录态、账号身份和 proxy 出口。

## 支持矩阵

| 平台 | 读取评论 | 一级评论/发帖 | 回复评论 | Browserbase 账号示例 |
| --- | --- | --- | --- | --- |
| Reddit | `reddit read`, `reddit get-comments` | `reddit comment` | `reddit reply` | `opencli --browserbase-account reddit1 reddit get-comments <url> -f json` |
| Twitter / X | `twitter get-comments`, `twitter thread` | `twitter post` / `twitter reply` 发 tweet 回复 | `twitter reply` | `opencli --browserbase-account x-main-1 twitter get-comments <url> -f json` |
| YouTube | `youtube comments` | `youtube reply` | `youtube reply-comment` | `opencli --browserbase-account yt1 youtube comments <url> -f json` |
| Instagram | `instagram get-comments` | `instagram comment` | `instagram reply` | `opencli --browserbase-account ig1 instagram get-comments <url> -f json` |
| TikTok | `tiktok get-comments` | `tiktok comment` | `tiktok reply` | `opencli --browserbase-account tiktok1 tiktok get-comments <url> -f json` |
| 小红书 | `xiaohongshu comments` | 暂未暴露 | `xiaohongshu reply` | `opencli --browserbase-account xhs1 xiaohongshu comments <url> -f json` |
| LinkedIn | `linkedin timeline` 评论数量 | 暂未暴露 | 暂未暴露 | `opencli --browserbase-account linkedin1 linkedin timeline -f json` |

## 读取示例

读取评论时用 JSON，方便复用返回的 ID：

```bash
opencli reddit get-comments "https://www.reddit.com/r/example/comments/1abc123/title/" --limit 100 -f json
opencli reddit read "https://www.reddit.com/r/example/comments/1abc123/title/" --expand-more -f json

opencli twitter get-comments "https://x.com/user/status/123" --limit 50 -f json
opencli twitter thread "https://x.com/user/status/123" -f json

opencli youtube comments "https://www.youtube.com/watch?v=VIDEO_ID" --limit 100 -f json
opencli instagram get-comments "https://www.instagram.com/p/SHORTCODE/" --limit 50 -f json
opencli tiktok get-comments "https://www.tiktok.com/@user/video/123" --limit 50 -f json
opencli xiaohongshu comments "https://www.xiaohongshu.com/search_result/<id>?xsec_token=..." --with-replies -f json
opencli linkedin timeline --limit 20 -f json
```

## 写入示例

只有在用户明确要发评论或回复时才运行写入命令。

```bash
opencli reddit comment 1abc123 "Comment text"
opencli reddit reply t1_okf3s7u "Reply text"

opencli twitter reply "https://x.com/user/status/123" "Reply text"

opencli youtube reply "https://www.youtube.com/watch?v=VIDEO_ID" "Comment text"
opencli youtube reply-comment Ugxxx "Reply text" --url "https://www.youtube.com/watch?v=VIDEO_ID"

opencli instagram comment nasa "Comment text" --index 1
opencli instagram reply nasa 18000000000000000 "Reply text" --index 1

opencli tiktok comment "https://www.tiktok.com/@user/video/123" "Comment text"
opencli tiktok reply "https://www.tiktok.com/@user/video/123" "COMMENT_ID" "Reply text"

opencli xiaohongshu reply "https://www.xiaohongshu.com/search_result/<id>?xsec_token=..." "COMMENT_ID" "Reply text"
```

## Browserbase 身份模式

当登录态和出口 IP 需要绑定时，使用 Browserbase account：

```bash
opencli browserbase account set-proxy reddit1 reddit1-proxy

opencli --browserbase-account reddit1 \
  reddit get-comments "https://www.reddit.com/r/example/comments/1abc123/title/" \
  --limit 100 \
  -f json
```

多个任务并发：

```bash
opencli run --browserbase \
  --accounts reddit1,reddit2,reddit3 \
  --parallel 3 \
  jobs.jsonl
```

详见 [Browserbase 账号、Proxy 与并发 Session](../advanced/browserbase.md)。

## 安全说明

- 读取命令返回当前平台 API 或 UI 暴露的数据；分页、隐藏回复、登录墙和限流都会影响覆盖度。
- 写入命令需要有效登录态，并且可能产生不可撤销的社交影响。没有用户明确意图时不要执行。
- 评论 ID 是平台内 ID，只能回传给同一个平台 adapter。
- 最终输出不要泄露 cookies、proxy password、Browserbase connect URL 或 API key。
