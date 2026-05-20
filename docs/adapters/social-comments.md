# Social Comment Support

OpenCLI exposes comment workflows for the major social adapters through the
same browser-backed runtime used by normal site commands. These commands reuse
your logged-in browser session, or a Browserbase account profile when you pass
`--browserbase-account`.

## Support Matrix

| Platform | Read comments | Post top-level comment | Reply to comment | Notes |
|----------|---------------|------------------------|------------------|-------|
| Twitter / X | `twitter get-comments` | `twitter reply` | `twitter reply` | Tweet replies are represented as comment rows with reply-able `comment_id` values. |
| YouTube | `youtube comments` | `youtube reply` | `youtube reply-comment` | `reply-comment` needs the original video URL for page context. |
| Reddit | `reddit read`, `reddit get-comments` | `reddit comment` | `reddit reply` | `read --expand-more` expands threaded comments; `get-comments` returns a flat top-level list with IDs. |
| LinkedIn | `linkedin timeline` comment counts | Not exposed | Not exposed | Current LinkedIn support reports timeline post `comments` counts, but does not extract or write comment threads. |
| Instagram | `instagram get-comments` | `instagram comment` | `instagram reply` | `get-comments` accepts a username plus post index, or a post/reel URL. |
| TikTok | `tiktok get-comments` | `tiktok comment` | `tiktok reply` | Reply can fall back to `--comment-text` and `--comment-author` when an ID cannot be matched. |
| Xiaohongshu | `xiaohongshu comments` | Not exposed | `xiaohongshu reply` | `comments --with-replies` includes nested replies; note URLs need `xsec_token`. |

## Common Patterns

Read comments in JSON so the returned IDs can be reused:

```bash
opencli reddit get-comments https://www.reddit.com/r/example/comments/1abc123/title/ --limit 100 -f json
opencli twitter get-comments https://x.com/user/status/123 --limit 50 -f json
opencli youtube comments "https://www.youtube.com/watch?v=VIDEO_ID" --limit 100 -f json
opencli instagram get-comments https://www.instagram.com/p/SHORTCODE/ --limit 50 -f json
opencli tiktok get-comments "https://www.tiktok.com/@user/video/123" --limit 50 -f json
opencli xiaohongshu comments "https://www.xiaohongshu.com/search_result/<id>?xsec_token=..." --with-replies -f json
```

Post or reply only when you intentionally want a write action:

```bash
opencli reddit comment 1abc123 "Comment text"
opencli reddit reply t1_okf3s7u "Reply text"

opencli youtube reply "https://www.youtube.com/watch?v=VIDEO_ID" "Comment text"
opencli youtube reply-comment Ugxxx "Reply text" --url "https://www.youtube.com/watch?v=VIDEO_ID"

opencli instagram comment nasa "Comment text" --index 1
opencli instagram reply nasa 18000000000000000 "Reply text" --index 1

opencli tiktok comment "https://www.tiktok.com/@user/video/123" "Comment text"
opencli tiktok reply "https://www.tiktok.com/@user/video/123" "COMMENT_ID" "Reply text"

opencli xiaohongshu reply "https://www.xiaohongshu.com/search_result/<id>?xsec_token=..." "COMMENT_ID" "Reply text"
```

## Browserbase Accounts

Use Browserbase when the comment workflow needs a cloud browser, a fixed proxy,
or multiple logged-in identities:

```bash
opencli --browserbase-account reddit1 reddit get-comments https://www.reddit.com/r/example/comments/1abc123/title/
opencli --browserbase-account x-main-1 twitter get-comments https://x.com/user/status/123
```

For durable login state, proxy CRUD, account-to-proxy binding, and pooled
parallel sessions, see [Browserbase Accounts, Login State, Proxies, and Parallel Sessions](../advanced/browserbase.md).

## Limits And Safety

- Read commands return the rows exposed by the platform's current web APIs or
  UI state. Some platforms hide replies behind paginated "more" affordances or
  rate limits.
- Write commands require a valid logged-in session. They raise typed errors on
  auth walls, malformed IDs, captcha/rate-limit states, or failed post-click
  verification instead of returning silent success rows.
- Treat returned comment IDs as platform-scoped IDs. Reuse them only with the
  same platform adapter that produced them.
