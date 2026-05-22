# Social Comment Recipes

## Read

```bash
opencli reddit get-comments "https://www.reddit.com/r/example/comments/1abc123/title/" --limit 100 -f json
opencli reddit read "https://www.reddit.com/r/example/comments/1abc123/title/" --expand-more -f json

opencli twitter get-comments "https://x.com/user/status/123" --limit 50 -f json
opencli twitter thread "https://x.com/user/status/123" -f json

opencli youtube comments "https://www.youtube.com/watch?v=VIDEO_ID" --limit 100 -f json
opencli instagram get-comments "https://www.instagram.com/p/SHORTCODE/" --limit 50 -f json
opencli tiktok get-comments "https://www.tiktok.com/@user/video/123" --limit 50 -f json
opencli xiaohongshu comments "https://www.xiaohongshu.com/search_result/<id>?xsec_token=..." --with-replies -f json
```

## Write

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

## Browserbase Account

```bash
opencli --browserbase-account reddit1 reddit get-comments <url> --limit 100 -f json
opencli --browserbase-account x-main-1 twitter get-comments <url> --limit 50 -f json
```

Use `opencli browserbase account set-proxy <account> <proxy>` when login state and exit IP should be bound.
