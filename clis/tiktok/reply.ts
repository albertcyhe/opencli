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
    { name: 'comment-text', type: 'string', help: 'Comment text for fuzzy matching if ID fails' },
    { name: 'comment-author', type: 'string', help: 'Comment author for fuzzy matching if ID fails' },
  ],
  columns: ['status', 'message', 'comment_id', 'text'],
  func: async (page, kwargs) => {
    if (!page) throw new CommandExecutionError('Browser session required');

    const videoUrl = kwargs.url;
    const commentId = kwargs['comment-id'];
    const text = kwargs.text;
    const commentText = kwargs['comment-text'] || '';
    const commentAuthor = kwargs['comment-author'] || '';

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
          await wait(5000);
        }

        // Find comment text spans and their parent containers
        // TikTok: [data-e2e="comment-level-1"] is the text SPAN, not the container
        // The container is its parentElement which holds username, text, reply button, etc.
        const commentSpans = document.querySelectorAll('[data-e2e="comment-level-1"]');
        let targetContainer = null;

        // Strategy 1: Match by comment ID in container attributes
        for (var ci = 0; ci < commentSpans.length; ci++) {
          var container = commentSpans[ci].parentElement;
          if (!container) continue;
          var toCheck = [container].concat(Array.from(container.querySelectorAll('*')).slice(0, 30));
          for (var j = 0; j < toCheck.length; j++) {
            var attrs = Array.from(toCheck[j].attributes || []);
            for (var k = 0; k < attrs.length; k++) {
              if (String(attrs[k].value).includes(commentId)) {
                targetContainer = container;
                break;
              }
            }
            if (targetContainer) break;
          }
          if (targetContainer) break;
        }

        // Strategy 2: Fuzzy match by comment text
        if (!targetContainer) {
          var fuzzyText = ${JSON.stringify(commentText)};
          var fuzzyAuthor = ${JSON.stringify(commentAuthor)};
          var needle = (fuzzyText || '').substring(0, 80).toLowerCase();
          if (!needle && commentId) needle = ''; // will skip text match

          for (var ci = 0; ci < commentSpans.length; ci++) {
            var container = commentSpans[ci].parentElement;
            if (!container) continue;
            var containerText = (container.innerText || '').toLowerCase();

            if (needle && containerText.includes(needle)) {
              targetContainer = container;
              break;
            }
            if (fuzzyAuthor && containerText.includes(fuzzyAuthor.toLowerCase())) {
              targetContainer = container;
              break;
            }
          }
        }

        if (!targetContainer) {
          return { ok: false, message: 'Could not find comment with ID ' + commentId + ' in the DOM. Try --comment-text or --comment-author for fuzzy matching. Found ' + commentSpans.length + ' comments.' };
        }

        // Click the Reply button — look for [data-e2e="comment-reply-1"] or text-based match
        var replyBtn = targetContainer.querySelector('[data-e2e="comment-reply-1"]')
          || targetContainer.querySelector('[data-e2e*="reply"]');

        if (!replyBtn) {
          // Text-based fallback
          var allEls = targetContainer.querySelectorAll('span, p, button, [role="button"]');
          for (var ri = 0; ri < allEls.length; ri++) {
            var t = (allEls[ri].textContent || '').trim();
            if (t === 'Reply' || t === '回复' || t === '回覆') {
              replyBtn = allEls[ri];
              break;
            }
          }
        }

        if (!replyBtn) {
          return { ok: false, message: 'Reply button not found on comment (container has ' + targetContainer.children.length + ' children)' };
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

        // TikTok submits comments with Enter key, not a Post button
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        await wait(500);
        input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        await wait(3000);

        // Fallback: try clicking a Post button if Enter didn't work
        const composerRoot = input.closest('[data-e2e="comment-input"]')
          || input.parentElement
          || document;
        const btns = Array.from(composerRoot.querySelectorAll('[data-e2e="comment-post"], button'));
        const postBtn = btns.find(function(b) {
          var t = (b.textContent || '').trim();
          return b.getAttribute('data-e2e') === 'comment-post'
            || t === 'Post'
            || t === '发布'
            || t === '发送';
        });
        if (postBtn) {
          postBtn.click();
          await wait(3000);
        }

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
