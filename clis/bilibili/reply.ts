/**
 * Bilibili reply — reply to a specific comment via the official API.
 *
 * Uses /x/v2/reply/add endpoint with bili_jct CSRF token.
 */
import { cli, Strategy } from '@jackwener/opencli/registry';
import { AuthRequiredError, CommandExecutionError } from '@jackwener/opencli/errors';
import { resolveBvid, apiGet } from './utils.js';

cli({
  site: 'bilibili',
  name: 'reply',
  description: '回复 B站视频评论',
  domain: 'www.bilibili.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'comment-id', required: true, positional: true, help: 'Comment rpid from bilibili comments output' },
    { name: 'text', required: true, positional: true, help: 'Reply text' },
    { name: 'bvid', required: true, help: 'Video BV ID (e.g. BV1WtAGzYEBm)' },
  ],
  columns: ['status', 'message', 'comment_id', 'text'],
  func: async (page, kwargs) => {
    const rpid = kwargs['comment-id'];
    const text = kwargs.text;
    const bvid = await resolveBvid(kwargs.bvid);

    // Resolve bvid → aid
    const view = await apiGet(page, '/x/web-interface/view', { params: { bvid } });
    const aid = view?.data?.aid;
    if (!aid) throw new CommandExecutionError(`Cannot resolve aid for bvid: ${bvid}`);

    // Post reply via browser fetch (needs bili_jct CSRF token from cookies)
    const result = await page.evaluate(`(async () => {
      try {
        var aid = ${JSON.stringify(String(aid))};
        var rpid = ${JSON.stringify(rpid)};
        var message = ${JSON.stringify(text)};

        // Extract bili_jct CSRF token from cookies
        var csrf = '';
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
          var c = cookies[i].trim();
          if (c.startsWith('bili_jct=')) {
            csrf = c.split('=')[1];
            break;
          }
        }
        if (!csrf) return { ok: false, message: 'No bili_jct CSRF token found — are you logged in?' };

        var body = new URLSearchParams({
          oid: aid,
          type: '1',
          root: rpid,
          parent: rpid,
          message: message,
          csrf: csrf,
        });

        var res = await fetch('https://api.bilibili.com/x/v2/reply/add', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        });

        if (!res.ok) return { ok: false, message: 'HTTP ' + res.status };
        var data = await res.json();

        if (data.code === 0) {
          return { ok: true, message: 'Reply posted successfully' };
        }
        return { ok: false, message: 'Bilibili API error ' + data.code + ': ' + (data.message || 'unknown') };
      } catch (e) {
        return { ok: false, message: e.toString() };
      }
    })()`);

    return [{
      status: result.ok ? 'success' : 'failed',
      message: result.message,
      comment_id: rpid,
      text,
    }];
  },
});
