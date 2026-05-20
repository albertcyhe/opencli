# YouTube

**Mode**: 🔐 Browser · **Domain**: `youtube.com`

## Commands

| Command | Description |
|---------|-------------|
| `opencli youtube search` | Search videos |
| `opencli youtube video` | Get video metadata |
| `opencli youtube transcript` | Get video transcript/subtitles |
| `opencli youtube comments` | Get video comments |
| `opencli youtube reply` | Post a top-level video comment |
| `opencli youtube reply-comment` | Reply to a specific comment ID |
| `opencli youtube channel` | Get channel info and videos |
| `opencli youtube playlist` | Get playlist video list |
| `opencli youtube feed` | Homepage recommended videos |
| `opencli youtube history` | Watch history |
| `opencli youtube watch-later` | Watch Later queue |
| `opencli youtube subscriptions` | List subscribed channels |
| `opencli youtube like` | Like a video |
| `opencli youtube unlike` | Remove like from a video |
| `opencli youtube subscribe` | Subscribe to a channel |
| `opencli youtube unsubscribe` | Unsubscribe from a channel |

## Usage Examples

```bash
# Read commands
opencli youtube feed --limit 10
opencli youtube history --limit 20
opencli youtube watch-later --limit 50
opencli youtube subscriptions --limit 30

# Search and video info
opencli youtube search "rust programming" --limit 5
opencli youtube video "https://www.youtube.com/watch?v=xxx"
opencli youtube transcript "https://www.youtube.com/watch?v=xxx"
opencli youtube comments "https://www.youtube.com/watch?v=xxx" --limit 100

# Write commands (requires login)
opencli youtube like "https://www.youtube.com/watch?v=xxx"
opencli youtube unlike "videoId"
opencli youtube subscribe "@ChannelHandle"
opencli youtube unsubscribe "UCxxxxxxxxxxxxxx"
opencli youtube reply "https://www.youtube.com/watch?v=xxx" "Top-level comment"
opencli youtube reply-comment Ugxxx "Nested reply" --url "https://www.youtube.com/watch?v=xxx"
```

## Comments

`comments` returns `comment_id`, `author`, `text`, `likes`, `replies`, and
`time`. Use `reply` for a new top-level video comment, and `reply-comment` with
the `comment_id` from `comments` plus `--url` so the adapter can open the right
video context before writing.

## Prerequisites

- Chrome running and **logged into** youtube.com
- [Browser Bridge extension](/guide/browser-bridge) installed
