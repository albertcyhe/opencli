/**
 * LinkedIn comment — post a top-level comment on a LinkedIn post via UI automation.
 */
import { CommandExecutionError } from '@jackwener/opencli/errors';
import { cli, Strategy } from '@jackwener/opencli/registry';

cli({
  site: 'linkedin',
  name: 'comment',
  description: 'Post a comment on a LinkedIn post',
  domain: 'www.linkedin.com',
  strategy: Strategy.UI,
  browser: true,
  args: [
    { name: 'post-url', type: 'string', required: true, positional: true, help: 'LinkedIn post URL' },
    { name: 'text', type: 'string', required: true, positional: true, help: 'Comment text' },
  ],
  columns: ['status', 'message', 'text'],
  func: async (page, kwargs) => {
    if (!page) throw new CommandExecutionError('Browser session required');

    await page.goto(kwargs['post-url']);
    await page.wait(4);

    const result = await page.evaluate(`(async () => {
      try {
        const commentText = ${JSON.stringify(kwargs.text)};
        const wait = (ms) => new Promise(r => setTimeout(r, ms));

        // Click the comment button to expand the comment box
        const commentBtns = Array.from(document.querySelectorAll('button, [role="button"]'));
        const commentBtn = commentBtns.find(b => /^comment$/i.test((b.textContent || '').trim())
          || /comment/i.test(b.getAttribute('aria-label') || ''));
        if (commentBtn) {
          commentBtn.click();
          await wait(1500);
        }

        // Find comment input
        const input = document.querySelector('.comments-comment-box__form [role="textbox"], .ql-editor[contenteditable="true"], [contenteditable="true"][aria-label*="comment"], [contenteditable="true"][aria-label*="Comment"]');
        if (!input) return { ok: false, message: 'Comment input not found — make sure you are logged in and the post is visible' };

        input.focus();
        await wait(300);
        document.execCommand('selectAll');
        document.execCommand('insertText', false, commentText);
        await wait(1000);

        // Limit submit lookup to the active composer so we do not re-click the action-bar comment button.
        const composerRoot = input.closest('form')
          || input.closest('.comments-comment-box__form')
          || input.closest('.comments-comment-box')
          || input.parentElement;
        const btns = Array.from((composerRoot || document).querySelectorAll('button, [role="button"]'));
        const postBtn = btns.find(b => {
          const t = (b.textContent || '').trim().toLowerCase();
          const label = (b.getAttribute('aria-label') || '').toLowerCase();
          return (t === 'post' || t === 'comment' || t === '发布' || label.includes('post comment') || label.includes('comment'))
            && !b.disabled;
        });

        if (!postBtn) return { ok: false, message: 'Post button not found or disabled' };

        postBtn.click();
        await wait(3000);

        return { ok: true, message: 'Comment posted' };
      } catch (e) {
        return { ok: false, message: e.toString() };
      }
    })()`);

    return [{
      status: result.ok ? 'success' : 'failed',
      message: result.message,
      text: kwargs.text,
    }];
  },
});
