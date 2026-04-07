/**
 * TikTok reply — reply to a specific comment on a video via UI automation.
 *
 * Navigates to the video, expands comments, finds the target comment,
 * clicks its Reply button, types the reply, and submits.
 */
import { CommandExecutionError } from '@jackwener/opencli/errors';
import { cli, Strategy } from '@jackwener/opencli/registry';

cli({
  site: 'tiktok',
  name: 'reply',
  description: 'Reply to a specific TikTok comment',
  domain: 'www.tiktok.com',
  strategy: Strategy.UI,
  browser: true,
  args: [
    { name: 'url', type: 'string', required: true, positional: true, help: 'TikTok video URL' },
    { name: 'comment-id', type: 'string', required: true, positional: true, help: 'Comment ID (cid from get-comments output)' },
    { name: 'text', type: 'string', required: true, positional: true, help: 'Reply text' },
  ],
  columns: ['status', 'message', 'comment_id', 'text'],
  func: async (page, kwargs) => {
    if (!page) throw new CommandExecutionError('Browser session required');

    const videoUrl = kwargs.url;
    const commentId = kwargs['comment-id'];
    const text = kwargs.text;

    await page.goto(videoUrl, { waitUntil: 'load', settleMs: 6000 });

    const result = await page.evaluate(`(async () => {
      try {
        const commentId = ${JSON.stringify(commentId)};
        const replyText = ${JSON.stringify(text)};
        const wait = (ms) => new Promise(r => setTimeout(r, ms));

        // Click comment icon to expand comment section if needed
        const commentIcon = document.querySelector('[data-e2e="comment-icon"]');
        if (commentIcon) {
          const cBtn = commentIcon.closest('button') || commentIcon.closest('[role="button"]') || commentIcon;
          cBtn.click();
          await wait(3000);
        }

        // Find all comment containers
        const comments = document.querySelectorAll('[data-e2e="comment-level-1"]');
        let targetComment = null;

        // Try to find by data attribute or iterate through comments
        for (const c of comments) {
          // Check various data attributes for the comment ID
          const attrs = Array.from(c.attributes);
          for (const attr of attrs) {
            if (String(attr.value).includes(commentId)) {
              targetComment = c;
              break;
            }
          }
          if (targetComment) break;

          // Also check nested elements
          const el = c.querySelector('[data-comment-id="' + commentId + '"]')
            || c.querySelector('[id*="' + commentId + '"]');
          if (el) {
            targetComment = c;
            break;
          }
        }

        // Fallback: try to match by index if commentId looks numeric
        if (!targetComment && /^\\d+$/.test(commentId)) {
          // Search all comment wrappers for the ID in any attribute
          const allEls = document.querySelectorAll('*');
          for (const el of allEls) {
            for (const attr of el.attributes) {
              if (attr.value === commentId) {
                targetComment = el.closest('[data-e2e="comment-level-1"]') || el;
                break;
              }
            }
            if (targetComment) break;
          }
        }

        if (!targetComment) {
          return { ok: false, message: 'Could not find comment with ID ' + commentId + ' in the DOM' };
        }

        // Click the Reply button on this comment
        const replyBtns = targetComment.querySelectorAll('span, p, button');
        let replyBtn = null;
        for (const btn of replyBtns) {
          const t = (btn.textContent || '').trim();
          if (t === 'Reply' || t === '回复' || t === '回覆') {
            replyBtn = btn;
            break;
          }
        }

        if (!replyBtn) {
          return { ok: false, message: 'Reply button not found on comment' };
        }

        replyBtn.click();
        await wait(1500);

        // Find the reply input (should now be focused/visible)
        const input = document.querySelector('[data-e2e="comment-input"] [contenteditable="true"]')
          || document.querySelector('[contenteditable="true"]');
        if (!input) {
          return { ok: false, message: 'Reply input not found — make sure you are logged in' };
        }

        input.focus();
        document.execCommand('insertText', false, replyText);
        await wait(1000);

        // Click post button
        const btns = Array.from(document.querySelectorAll('[data-e2e="comment-post"], button'));
        const postBtn = btns.find(function(b) {
          var t = b.textContent.trim();
          return t === 'Post' || t === '发布' || t === '发送' || t === 'Reply';
        });

        if (!postBtn) {
          return { ok: false, message: 'Post button not found' };
        }

        postBtn.click();
        await wait(3000);

        return { ok: true, message: 'Reply posted on comment ' + commentId };
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
