/**
 * Douyin reply — reply to a specific comment via internal API.
 *
 * Uses browserFetch which handles a_bogus signing automatically.
 */
import { cli, Strategy } from '@jackwener/opencli/registry';
import { CommandExecutionError } from '@jackwener/opencli/errors';
import { browserFetch } from './_shared/browser-fetch.js';

function parseAwemeId(input: string): string {
  const match = input.match(/\/video\/(\d+)/);
  if (match) return match[1];
  if (/^\d+$/.test(input.trim())) return input.trim();
  throw new CommandExecutionError(`Cannot parse aweme_id from: ${input}`);
}

cli({
  site: 'douyin',
  name: 'reply',
  description: '回复抖音视频评论',
  domain: 'www.douyin.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'url', required: true, positional: true, help: 'Douyin video URL or aweme_id' },
    { name: 'comment-id', required: true, positional: true, help: 'Comment ID (cid from get-comments output)' },
    { name: 'text', required: true, positional: true, help: 'Reply text' },
  ],
  columns: ['status', 'message', 'comment_id', 'text'],
  func: async (page, kwargs) => {
    const awemeId = parseAwemeId(kwargs.url);
    const commentId = kwargs['comment-id'];
    const text = kwargs.text;

    await page.goto('https://www.douyin.com');
    await page.wait(3);

    const result = await page.evaluate(`(async () => {
      try {
        var awemeId = ${JSON.stringify(awemeId)};
        var commentId = ${JSON.stringify(commentId)};
        var replyText = ${JSON.stringify(text)};

        var params = new URLSearchParams({
          aweme_id: awemeId,
          text: replyText,
          reply_id: commentId,
          aid: '6383',
        });

        var res = await fetch('https://www.douyin.com/aweme/v1/web/comment/publish/?' + params.toString(), {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            referer: 'https://www.douyin.com/',
          },
        });

        var data = await res.json();
        if (data.status_code === 0) {
          return { ok: true, message: 'Reply posted successfully' };
        }
        return { ok: false, message: 'Douyin API error: ' + (data.status_msg || data.status_code || 'unknown') };
      } catch (e) {
        return { ok: false, message: e.toString() };
      }
    })()`);

    return [{
      status: result.ok ? 'success' : 'failed',
      message: result.message,
      comment_id: commentId,
      text,
    }];
  },
});
