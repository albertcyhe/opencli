/**
 * Twitter get-comments — get replies to a tweet with reply-able IDs.
 *
 * Reuses the TweetDetail GraphQL endpoint from thread-utils, filtering
 * to only replies (tweets where in_reply_to matches the focal tweet).
 * The returned comment_id and url can be passed directly to `twitter reply`.
 */
import { cli, Strategy } from '@jackwener/opencli/registry';
import { AuthRequiredError, CommandExecutionError, EmptyResultError } from '@jackwener/opencli/errors';
import {
  BEARER_TOKEN,
  buildTweetDetailUrl,
  extractTweetId,
  parseTweetDetail,
  type ThreadTweet,
} from './thread-utils.js';

cli({
  site: 'twitter',
  name: 'get-comments',
  description: 'Get replies to a tweet with reply-able IDs',
  domain: 'x.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'tweet-id', positional: true, type: 'string', required: true, help: 'Tweet ID or URL' },
    { name: 'limit', type: 'int', default: 30, help: 'Max replies to return' },
  ],
  columns: ['rank', 'comment_id', 'author', 'text', 'likes', 'time', 'url'],
  func: async (page, kwargs) => {
    const tweetId = extractTweetId(kwargs['tweet-id']);
    const limit = Math.min(Math.max(1, kwargs.limit ?? 30), 100);

    await page.goto('https://x.com');
    await page.wait(3);

    const ct0 = await page.evaluate(`() => {
      return document.cookie.split(';').map(c=>c.trim()).find(c=>c.startsWith('ct0='))?.split('=')[1] || null;
    }`);
    if (!ct0) throw new AuthRequiredError('x.com', 'Not logged into x.com (no ct0 cookie)');

    const headers = JSON.stringify({
      'Authorization': `Bearer ${decodeURIComponent(BEARER_TOKEN)}`,
      'X-Csrf-Token': ct0,
      'X-Twitter-Auth-Type': 'OAuth2Session',
      'X-Twitter-Active-User': 'yes',
    });

    const allTweets: ThreadTweet[] = [];
    const seen = new Set<string>();
    let cursor: string | null = null;

    for (let i = 0; i < 5; i++) {
      const apiUrl = buildTweetDetailUrl(tweetId, cursor);

      const data = await page.evaluate(`async () => {
        const r = await fetch("${apiUrl}", { headers: ${headers}, credentials: 'include' });
        return r.ok ? await r.json() : { error: r.status };
      }`);

      if (data?.error) {
        if (allTweets.length === 0) throw new CommandExecutionError(`HTTP ${data.error}: Tweet not found or queryId expired`);
        break;
      }

      const { tweets, nextCursor } = parseTweetDetail(data, seen);
      allTweets.push(...tweets);

      if (!nextCursor || nextCursor === cursor) break;
      cursor = nextCursor;
    }

    // Filter to only replies to the focal tweet (exclude the tweet itself and self-thread)
    const replies = allTweets.filter(tw => tw.in_reply_to === tweetId && tw.id !== tweetId);

    if (replies.length === 0) throw new EmptyResultError('twitter/get-comments', 'No replies found on this tweet');

    return replies.slice(0, limit).map((tw, i) => ({
      rank: i + 1,
      comment_id: tw.id,
      author: tw.author,
      text: tw.text.substring(0, 500),
      likes: tw.likes,
      time: tw.created_at || '',
      url: tw.url,
    }));
  },
});
