# Social Comments Matrix

| Platform | Read comments | Top-level write | Reply write | Notes |
| --- | --- | --- | --- | --- |
| Reddit | `reddit read`, `reddit get-comments` | `reddit comment` | `reddit reply` | `read --expand-more` expands threaded comments; `get-comments` returns reusable IDs. |
| Twitter / X | `twitter get-comments`, `twitter thread` | `twitter post`, tweet reply via `twitter reply` | `twitter reply` | Replies are represented as comment rows with reply-able IDs or tweet URLs. |
| YouTube | `youtube comments` | `youtube reply` | `youtube reply-comment` | `reply-comment` needs the original video URL for page context. |
| Instagram | `instagram get-comments` | `instagram comment` | `instagram reply` | `get-comments` accepts post/reel URL or username; write commands use username plus `--index`. |
| TikTok | `tiktok get-comments` | `tiktok comment` | `tiktok reply` | Reply may fall back to text/author matching when IDs are unavailable. |
| Xiaohongshu | `xiaohongshu comments` | Not exposed | `xiaohongshu reply` | Note URLs usually require `xsec_token`; `--with-replies` includes nested replies. |
| LinkedIn | `linkedin timeline` comment counts | Not exposed | Not exposed | Current support exposes timeline post metadata, not full comment threads. |
