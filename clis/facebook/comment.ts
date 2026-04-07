/**
 * Facebook comment — post a top-level comment on a Facebook post via UI automation.
 */
import { CommandExecutionError } from '@jackwener/opencli/errors';
import { cli, Strategy } from '@jackwener/opencli/registry';

cli({
  site: 'facebook',
  name: 'comment',
  description: 'Post a comment on a Facebook post',
  domain: 'www.facebook.com',
  strategy: Strategy.UI,
  browser: true,
  args: [
    { name: 'post-url', type: 'string', required: true, positional: true, help: 'Facebook post URL' },
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

        // Click the comment button/area to open comment input
        const commentBtns = Array.from(document.querySelectorAll('[role="button"], span'));
        const commentBtn = commentBtns.find(b => {
          const t = (b.textContent || '').trim().toLowerCase();
          return t === 'comment' || t === '评论' || t === '留言';
        });
        if (commentBtn) {
          commentBtn.click();
          await wait(1500);
        }

        // Find comment input (contenteditable div or textbox)
        const input = document.querySelector('[contenteditable="true"][role="textbox"][aria-label*="comment"]')
          || document.querySelector('[contenteditable="true"][role="textbox"][aria-label*="Comment"]')
          || document.querySelector('[contenteditable="true"][role="textbox"][aria-label*="评论"]')
          || document.querySelector('[contenteditable="true"][role="textbox"]')
          || document.querySelector('form [contenteditable="true"]');

        if (!input) {
          return { ok: false, message: 'Comment input not found — make sure you are logged in' };
        }

        input.focus();
        await wait(300);

        // Type using execCommand for React/Draft.js compatibility
        document.execCommand('insertText', false, commentText);
        await wait(1000);

        // Submit with Enter key (Facebook comments submit with Enter)
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
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
