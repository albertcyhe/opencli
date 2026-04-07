/**
 * Facebook reply — reply to a specific comment on a Facebook post via UI automation.
 *
 * Navigates to the post, locates the comment by ID, clicks Reply,
 * types text, and submits with Enter.
 */
import { CommandExecutionError } from '@jackwener/opencli/errors';
import { cli, Strategy } from '@jackwener/opencli/registry';

cli({
  site: 'facebook',
  name: 'reply',
  description: 'Reply to a specific Facebook comment',
  domain: 'www.facebook.com',
  strategy: Strategy.UI,
  browser: true,
  args: [
    { name: 'post-url', type: 'string', required: true, positional: true, help: 'Facebook post URL' },
    { name: 'comment-id', type: 'string', required: true, positional: true, help: 'Comment ID from get-comments output' },
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
        const spans = Array.from(document.querySelectorAll('span, div[role="button"]'));
        const viewMore = spans.filter(s => /view more comments|view all|more comments|查看更多/i.test(s.textContent || ''));
        viewMore.slice(0, 3).forEach(s => { try { s.click(); } catch {} });
      })()`);
      await page.wait(2);
    }

    const result = await page.evaluate(`(async () => {
      try {
        const commentId = ${JSON.stringify(commentId)};
        const replyText = ${JSON.stringify(text)};
        const wait = (ms) => new Promise(r => setTimeout(r, ms));

        // Find comment articles
        var articles = Array.from(document.querySelectorAll('[role="article"]'));
        var commentArticles = articles.filter(function(el) {
          return el.closest('[role="article"]') !== el
            && el.parentElement?.closest('[role="article"]') !== null;
        });

        var targetComment = null;

        // Match by comment ID in href or attributes
        for (var i = 0; i < commentArticles.length; i++) {
          var el = commentArticles[i];

          // Check links for comment_id
          var links = el.querySelectorAll('a[href*="comment_id="]');
          for (var j = 0; j < links.length; j++) {
            if ((links[j].href || '').includes(commentId)) {
              targetComment = el;
              break;
            }
          }
          if (targetComment) break;

          // Check all attributes for the ID
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

        // Fallback: index-based
        if (!targetComment) {
          var indexMatch = commentId.match(/fb-comment-(\\d+)/);
          if (indexMatch) {
            var idx = parseInt(indexMatch[1], 10) - 1;
            if (idx >= 0 && idx < commentArticles.length) {
              targetComment = commentArticles[idx];
            }
          }
        }

        if (!targetComment) {
          return { ok: false, message: 'Could not find comment with ID ' + commentId };
        }

        // Click "Reply" link on the comment
        var replyLinks = Array.from(targetComment.querySelectorAll('[role="button"], span, a'));
        var replyBtn = replyLinks.find(function(el) {
          var t = (el.textContent || '').trim().toLowerCase();
          return t === 'reply' || t === '回复' || t === '回覆';
        });

        if (!replyBtn) {
          return { ok: false, message: 'Reply button not found on comment' };
        }

        replyBtn.click();
        await wait(1500);

        // Find reply input (should appear near/below the comment)
        var input = targetComment.querySelector('[contenteditable="true"][role="textbox"]')
          || targetComment.parentElement?.querySelector('[contenteditable="true"][role="textbox"]');

        // Broader fallback: the most recently appeared textbox
        if (!input) {
          var allTextboxes = Array.from(document.querySelectorAll('[contenteditable="true"][role="textbox"]'));
          input = allTextboxes[allTextboxes.length - 1];
        }

        if (!input) {
          return { ok: false, message: 'Reply input not found' };
        }

        input.focus();
        await wait(300);
        document.execCommand('insertText', false, replyText);
        await wait(1000);

        // Submit with Enter
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
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
