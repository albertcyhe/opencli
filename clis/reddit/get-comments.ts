/**
 * Reddit get-comments — flat comment list with reply-able IDs.
 *
 * Returns top-level comments with their t1_ fullnames so an orchestrator
 * can pass them directly to `reddit reply <comment-id> <text>`.
 */
import { cli, Strategy } from '@jackwener/opencli/registry';
import { CommandExecutionError, EmptyResultError } from '@jackwener/opencli/errors';

cli({
  site: 'reddit',
  name: 'get-comments',
  description: 'Get comments on a Reddit post with reply-able IDs',
  domain: 'reddit.com',
  strategy: Strategy.COOKIE,
  args: [
    { name: 'post-id', required: true, positional: true, help: 'Post ID (e.g. 1abc123) or full URL' },
    { name: 'sort', default: 'best', help: 'Comment sort: best, top, new, controversial, old, qa' },
    { name: 'limit', type: 'int', default: 25, help: 'Number of comments to return (max 100)' },
  ],
  columns: ['rank', 'comment_id', 'author', 'score', 'text', 'replies_count', 'time'],
  func: async (page, kwargs) => {
    const sort = kwargs.sort ?? 'best';
    const limit = Math.min(Math.max(1, kwargs.limit ?? 25), 100);

    await page.goto('https://www.reddit.com');

    const data = await page.evaluate(`
      (async function() {
        var postId = ${JSON.stringify(kwargs['post-id'])};
        var urlMatch = postId.match(/comments\\/([a-z0-9]+)/);
        if (urlMatch) postId = urlMatch[1];

        var res = await fetch(
          '/comments/' + postId + '.json?sort=${sort}&limit=${limit}&depth=1&raw_json=1',
          { credentials: 'include' }
        );
        if (!res.ok) return { error: 'Reddit API returned HTTP ' + res.status };

        var data;
        try { data = await res.json(); } catch(e) { return { error: 'Failed to parse response' }; }
        if (!Array.isArray(data) || data.length < 2) return { error: 'Unexpected response format' };

        var comments = data[1].data.children || [];
        var results = [];
        for (var i = 0; i < comments.length; i++) {
          var c = comments[i];
          if (c.kind !== 't1') continue;
          var d = c.data;

          var replyCount = 0;
          if (d.replies && d.replies.data && d.replies.data.children) {
            for (var j = 0; j < d.replies.data.children.length; j++) {
              if (d.replies.data.children[j].kind === 't1') replyCount++;
              else if (d.replies.data.children[j].kind === 'more') replyCount += d.replies.data.children[j].data.count || 0;
            }
          }

          results.push({
            rank: results.length + 1,
            comment_id: d.name || '',
            author: d.author || '[deleted]',
            score: d.score || 0,
            text: (d.body || '').substring(0, 500),
            replies_count: replyCount,
            time: d.created_utc ? new Date(d.created_utc * 1000).toISOString().replace('T', ' ').substring(0, 19) : '',
          });
        }
        return results;
      })()
    `);

    if (!Array.isArray(data)) {
      const errMsg = data && typeof data === 'object' ? String((data as Record<string, unknown>).error || '') : '';
      if (errMsg) throw new CommandExecutionError(errMsg);
      throw new CommandExecutionError('Unexpected response');
    }
    if (data.length === 0) throw new EmptyResultError('reddit/get-comments', 'No comments found on this post');

    return data.slice(0, limit);
  },
});
