/**
 * Reddit reply — reply to a specific comment by its t1_ fullname.
 *
 * Uses the same /api/comment endpoint as comment.ts but enforces
 * a t1_ prefix so the orchestrator targets a comment, not a post.
 */
import { CommandExecutionError } from '@jackwener/opencli/errors';
import { cli, Strategy } from '@jackwener/opencli/registry';

cli({
  site: 'reddit',
  name: 'reply',
  description: 'Reply to a Reddit comment',
  domain: 'reddit.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'comment-id', type: 'string', required: true, positional: true, help: 'Comment fullname (t1_xxx) from get-comments output' },
    { name: 'text', type: 'string', required: true, positional: true, help: 'Reply text' },
  ],
  columns: ['status', 'message', 'comment_id', 'text'],
  func: async (page, kwargs) => {
    if (!page) throw new CommandExecutionError('Browser session required');

    let commentId = kwargs['comment-id'];
    // Accept raw ID or t1_ prefixed
    if (!commentId.startsWith('t1_')) commentId = 't1_' + commentId;

    await page.goto('https://www.reddit.com');

    const result = await page.evaluate(`(async () => {
      try {
        var fullname = ${JSON.stringify(commentId)};
        var text = ${JSON.stringify(kwargs.text)};

        // Get modhash
        var meRes = await fetch('/api/me.json', { credentials: 'include' });
        var me = await meRes.json();
        var modhash = me?.data?.modhash || '';

        var res = await fetch('/api/comment', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'parent=' + encodeURIComponent(fullname)
            + '&text=' + encodeURIComponent(text)
            + '&api_type=json'
            + (modhash ? '&uh=' + encodeURIComponent(modhash) : ''),
        });

        if (!res.ok) return { ok: false, message: 'HTTP ' + res.status };
        var data = await res.json();
        var errors = data?.json?.errors;
        if (errors && errors.length > 0) {
          return { ok: false, message: errors.map(function(e) { return e.join(': '); }).join('; ') };
        }
        return { ok: true, message: 'Reply posted on ' + fullname };
      } catch (e) {
        return { ok: false, message: e.toString() };
      }
    })()`);

    return [{
      status: result.ok ? 'success' : 'failed',
      message: result.message,
      comment_id: commentId,
      text: kwargs.text,
    }];
  }
});
