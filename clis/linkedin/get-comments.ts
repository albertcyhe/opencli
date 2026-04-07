/**
 * LinkedIn get-comments — read comments on a LinkedIn post.
 *
 * Navigates to the post URL, expands comments, and DOM-scrapes
 * comment elements to extract text, author, and comment URNs.
 */
import { cli, Strategy } from '@jackwener/opencli/registry';
import { AuthRequiredError, CommandExecutionError, EmptyResultError } from '@jackwener/opencli/errors';

cli({
  site: 'linkedin',
  name: 'get-comments',
  description: 'Get comments on a LinkedIn post with reply-able IDs',
  domain: 'www.linkedin.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'post-url', required: true, positional: true, help: 'LinkedIn post URL (e.g. linkedin.com/feed/update/urn:li:activity:XXX/)' },
    { name: 'limit', type: 'int', default: 20, help: 'Number of comments (max 50)' },
  ],
  columns: ['rank', 'comment_id', 'author', 'text', 'likes', 'time'],
  func: async (page, kwargs) => {
    const postUrl = kwargs['post-url'];
    const limit = Math.min(Math.max(1, kwargs.limit ?? 20), 50);

    await page.goto(postUrl);
    await page.wait(4);

    // Click "Load more comments" buttons to expand
    for (let i = 0; i < 3; i++) {
      await page.evaluate(`(() => {
        const btns = Array.from(document.querySelectorAll('button, a[role="button"]'));
        const loadMore = btns.filter(b => /load more comments|previous comments|view more/i.test(b.textContent || ''));
        loadMore.forEach(b => { try { b.click(); } catch {} });
      })()`);
      await page.wait(1.5);
    }

    const data = await page.evaluate(`(function() {
      function normalize(v) { return String(v || '').replace(/\\s+/g, ' ').trim(); }
      function parseMetric(v) {
        var raw = normalize(v).toLowerCase().replace(/,/g, '');
        var m = raw.match(/(\\d+(?:\\.\\d+)?)(k|m)?/i);
        if (!m) return 0;
        var n = Number(m[1]);
        if ((m[2]||'').toLowerCase() === 'k') return Math.round(n * 1000);
        if ((m[2]||'').toLowerCase() === 'm') return Math.round(n * 1000000);
        return Math.round(n);
      }

      var path = String(window.location.pathname || '');
      if (path.indexOf('/login') >= 0) return { loginRequired: true };

      // Find comment elements
      var commentEls = Array.from(document.querySelectorAll(
        '.comments-comment-item, ' +
        '.comments-comment-entity, ' +
        'article.comments-comment-item, ' +
        '[data-id*="comment"], ' +
        '.comments-comments-list > li'
      ));

      // Fallback: look for comment-like containers
      if (commentEls.length === 0) {
        commentEls = Array.from(document.querySelectorAll('.comments-comments-list article, .comments-comment-list article'));
      }

      var seen = new Set();
      var results = [];

      for (var i = 0; i < commentEls.length; i++) {
        var el = commentEls[i];
        if (seen.has(el)) continue;
        seen.add(el);

        // Extract comment URN from data attributes
        var commentId = '';
        var attrs = Array.from(el.attributes || []);
        for (var j = 0; j < attrs.length; j++) {
          var match = String(attrs[j].value).match(/urn:li:comment:\\([^)]+\\)/);
          if (match) { commentId = match[0]; break; }
          // Also try fsd_comment format
          match = String(attrs[j].value).match(/urn:li:fsd_comment:\\([^)]+\\)/);
          if (match) { commentId = match[0]; break; }
        }

        // Fallback: search nested elements for URN
        if (!commentId) {
          var nested = el.querySelectorAll('*');
          for (var j = 0; j < Math.min(nested.length, 30); j++) {
            var nAttrs = Array.from(nested[j].attributes || []);
            for (var k = 0; k < nAttrs.length; k++) {
              var match = String(nAttrs[k].value).match(/urn:li:(?:comment|fsd_comment):\\([^)]+\\)/);
              if (match) { commentId = match[0]; break; }
            }
            if (commentId) break;
          }
        }

        // If no URN, use index as fallback ID
        if (!commentId) commentId = 'comment-' + (results.length + 1);

        var authorEl = el.querySelector('.comments-post-meta__name-text a, .comments-post-meta__name-text, a[href*="/in/"] span');
        var author = normalize(authorEl ? authorEl.textContent : '');

        var textEl = el.querySelector('.comments-comment-item__main-content, .update-components-text, .comments-comment-item-content-body span[dir="ltr"]');
        var text = normalize(textEl ? textEl.textContent : '');

        if (!text) continue;

        var timeEl = el.querySelector('time, .comments-comment-item__timestamp');
        var time = normalize(timeEl ? (timeEl.getAttribute('datetime') || timeEl.textContent) : '');

        var likesEl = el.querySelector('[aria-label*="like"], [aria-label*="reaction"], .comments-comment-social-bar__reactions-count');
        var likes = parseMetric(likesEl ? (likesEl.textContent || likesEl.getAttribute('aria-label')) : '');

        results.push({
          comment_id: commentId,
          author: author,
          text: text.substring(0, 300),
          likes: likes,
          time: time,
        });
      }

      return { comments: results };
    })()`);

    if (data?.loginRequired) {
      throw new AuthRequiredError('linkedin.com', 'LinkedIn requires a signed-in browser session');
    }

    const comments = Array.isArray(data?.comments) ? data.comments : [];
    if (comments.length === 0) throw new EmptyResultError('linkedin/get-comments', 'No comments found on this post');

    return comments.slice(0, limit).map((c: any, i: number) => ({
      rank: i + 1,
      ...c,
    }));
  },
});
