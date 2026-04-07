/**
 * LinkedIn reply — reply to a specific comment on a LinkedIn post via UI automation.
 *
 * Navigates to the post, locates the comment by its URN or index,
 * clicks Reply, types text, and submits.
 */
import { CommandExecutionError } from '@jackwener/opencli/errors';
import { cli, Strategy } from '@jackwener/opencli/registry';

cli({
  site: 'linkedin',
  name: 'reply',
  description: 'Reply to a specific LinkedIn comment',
  domain: 'www.linkedin.com',
  strategy: Strategy.UI,
  browser: true,
  args: [
    { name: 'post-url', type: 'string', required: true, positional: true, help: 'LinkedIn post URL' },
    { name: 'comment-id', type: 'string', required: true, positional: true, help: 'Comment ID (URN from get-comments output)' },
    { name: 'text', type: 'string', required: true, positional: true, help: 'Reply text' },
  ],
  columns: ['status', 'message', 'comment_id', 'text'],
  func: async (page, kwargs) => {
    if (!page) throw new CommandExecutionError('Browser session required');

    const postUrl = kwargs['post-url'];
    const commentId = kwargs['comment-id'];
    const text = kwargs.text;

    await page.goto(postUrl);
    await page.wait(4);

    // Expand comments
    for (let i = 0; i < 3; i++) {
      await page.evaluate(`(() => {
        const btns = Array.from(document.querySelectorAll('button, a[role="button"]'));
        const loadMore = btns.filter(b => /load more comments|previous comments|view more/i.test(b.textContent || ''));
        loadMore.forEach(b => { try { b.click(); } catch {} });
      })()`);
      await page.wait(1.5);
    }

    const result = await page.evaluate(`(async () => {
      try {
        const commentId = ${JSON.stringify(commentId)};
        const replyText = ${JSON.stringify(text)};
        const wait = (ms) => new Promise(r => setTimeout(r, ms));

        // Find all comment containers
        var commentEls = Array.from(document.querySelectorAll(
          '.comments-comment-item, .comments-comment-entity, article.comments-comment-item, .comments-comments-list > li'
        ));

        var targetComment = null;

        // Try to match by URN in attributes
        for (var i = 0; i < commentEls.length; i++) {
          var el = commentEls[i];
          var allAttrs = [];

          // Check element and its children
          var toCheck = [el].concat(Array.from(el.querySelectorAll('*')).slice(0, 30));
          for (var j = 0; j < toCheck.length; j++) {
            var attrs = Array.from(toCheck[j].attributes || []);
            for (var k = 0; k < attrs.length; k++) {
              if (String(attrs[k].value).includes(commentId)) {
                targetComment = el;
                break;
              }
            }
            if (targetComment) break;
          }
          if (targetComment) break;
        }

        // Fallback: match by index (comment-N format)
        if (!targetComment) {
          var indexMatch = commentId.match(/comment-(\\d+)/);
          if (indexMatch) {
            var idx = parseInt(indexMatch[1], 10) - 1;
            if (idx >= 0 && idx < commentEls.length) {
              targetComment = commentEls[idx];
            }
          }
        }

        if (!targetComment) {
          return { ok: false, message: 'Could not find comment with ID ' + commentId };
        }

        // Click the Reply button on this comment
        var replyBtns = Array.from(targetComment.querySelectorAll('button, [role="button"], span'));
        var replyBtn = replyBtns.find(function(b) {
          var t = (b.textContent || '').trim().toLowerCase();
          return t === 'reply' || t === '回复' || t === '回覆';
        });

        if (!replyBtn) {
          return { ok: false, message: 'Reply button not found on comment' };
        }

        replyBtn.click();
        await wait(1500);

        // Find the reply input (should appear near the comment)
        var input = targetComment.querySelector('[role="textbox"][contenteditable="true"]')
          || targetComment.querySelector('[contenteditable="true"]')
          || document.querySelector('.comments-comment-box--is-reply [role="textbox"]')
          || document.querySelector('[contenteditable="true"][aria-label*="reply"]')
          || document.querySelector('[contenteditable="true"][aria-label*="Reply"]');

        if (!input) {
          // Broader fallback: last contenteditable that appeared
          var allEditable = Array.from(document.querySelectorAll('[contenteditable="true"]'));
          input = allEditable[allEditable.length - 1];
        }

        if (!input) {
          return { ok: false, message: 'Reply input not found' };
        }

        input.focus();
        await wait(300);
        document.execCommand('selectAll');
        document.execCommand('insertText', false, replyText);
        await wait(1000);

        // Limit submit lookup to the active reply composer so we do not re-click another Reply action.
        var composerRoot = input.closest('form')
          || input.closest('.comments-comment-box--is-reply')
          || input.closest('.comments-comment-box')
          || input.parentElement;
        var submitBtns = Array.from((composerRoot || document).querySelectorAll('button, [role="button"]'));
        var submitBtn = submitBtns.find(function(b) {
          var t = (b.textContent || '').trim().toLowerCase();
          var label = (b.getAttribute('aria-label') || '').toLowerCase();
          return (t === 'post' || t === 'reply' || t === '发布' || label.includes('post reply') || label.includes('reply'))
            && !b.disabled;
        });

        // Try the last visible submit-like button
        if (!submitBtn) {
          submitBtn = submitBtns.reverse().find(function(b) {
            return /post|reply|submit/i.test(b.textContent || '') && !b.disabled;
          });
        }

        if (!submitBtn) {
          return { ok: false, message: 'Submit button not found or disabled' };
        }

        submitBtn.click();
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
