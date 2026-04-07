/**
 * Facebook get-comments — read comments on a Facebook post.
 *
 * Navigates to the post URL, expands comments, and DOM-scrapes
 * comment elements for author, text, and IDs.
 */
import { cli, Strategy } from '@jackwener/opencli/registry';
import { AuthRequiredError, EmptyResultError } from '@jackwener/opencli/errors';

cli({
  site: 'facebook',
  name: 'get-comments',
  description: 'Get comments on a Facebook post with reply-able IDs',
  domain: 'www.facebook.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'post-url', required: true, positional: true, help: 'Facebook post URL' },
    { name: 'limit', type: 'int', default: 20, help: 'Number of comments (max 50)' },
  ],
  columns: ['rank', 'comment_id', 'author', 'text', 'likes', 'time'],
  func: async (page, kwargs) => {
    const postUrl = kwargs['post-url'];
    const limit = Math.min(Math.max(1, kwargs.limit ?? 20), 50);

    await page.goto(postUrl);
    await page.wait(4);

    // Click "View more comments" to expand
    for (let i = 0; i < 3; i++) {
      await page.evaluate(`(() => {
        const spans = Array.from(document.querySelectorAll('span, div[role="button"]'));
        const viewMore = spans.filter(s => /view more comments|view all|more comments|查看更多/i.test(s.textContent || ''));
        viewMore.slice(0, 3).forEach(s => { try { s.click(); } catch {} });
      })()`);
      await page.wait(2);
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
      if (path.indexOf('/login') >= 0 || path.indexOf('/checkpoint') >= 0) {
        return { loginRequired: true };
      }

      // Facebook comments are typically in nested [role="article"] elements
      // The top-level post is also role="article", so we need the nested ones
      var articles = Array.from(document.querySelectorAll('[role="article"]'));

      // Filter to only comment-level articles (those nested inside another article)
      var commentArticles = articles.filter(function(el) {
        return Boolean(el.parentElement && el.parentElement.closest('[role="article"]'));
      });

      // If no nested articles found, try different selector strategy
      if (commentArticles.length === 0) {
        // Look for elements with comment-like structure
        commentArticles = Array.from(document.querySelectorAll('ul[role="list"] li div[role="article"]'));
      }

      var seen = new Set();
      var results = [];

      for (var i = 0; i < commentArticles.length; i++) {
        var el = commentArticles[i];
        if (seen.has(el)) continue;
        seen.add(el);

        // Extract comment ID from various sources
        var commentId = '';

        // Check for fbid in reply links
        var replyLinks = el.querySelectorAll('a[href*="comment_id="], a[href*="reply_comment_id="]');
        for (var j = 0; j < replyLinks.length; j++) {
          var href = replyLinks[j].href || '';
          var cidMatch = href.match(/comment_id=(\\d+)/);
          if (cidMatch) { commentId = cidMatch[1]; break; }
        }

        // Fallback: check data attributes
        if (!commentId) {
          var attrs = Array.from(el.attributes || []);
          for (var j = 0; j < attrs.length; j++) {
            var aMatch = String(attrs[j].value).match(/(\\d{10,})/);
            if (aMatch && attrs[j].name.includes('id')) { commentId = aMatch[1]; break; }
          }
        }

        // Fallback: index-based ID
        if (!commentId) commentId = 'fb-comment-' + (results.length + 1);

        // Extract author (usually the first link with a profile URL)
        var authorLink = el.querySelector('a[href*="/profile.php"], a[href*="facebook.com/"][role="link"]');
        var author = '';
        if (authorLink) {
          // Get only the direct text, not nested comment text
          var spans = authorLink.querySelectorAll('span');
          author = normalize(spans.length > 0 ? spans[0].textContent : authorLink.textContent);
        }

        // Extract comment text
        var textEl = el.querySelector('[dir="auto"]');
        var text = '';
        if (textEl) {
          text = normalize(textEl.textContent);
        }

        if (!text) continue;
        // Skip if text looks like the author name only
        if (text === author) continue;

        // Extract likes count
        var likes = 0;
        var likeEls = el.querySelectorAll('[aria-label*="reaction"], [aria-label*="like"]');
        for (var j = 0; j < likeEls.length; j++) {
          var likeLabel = likeEls[j].getAttribute('aria-label') || '';
          var likeCount = parseMetric(likeLabel);
          if (likeCount > 0) { likes = likeCount; break; }
        }

        // Extract timestamp
        var timeEl = el.querySelector('a[href*="/comment/"] span, abbr, [data-utime]');
        var time = normalize(timeEl ? timeEl.textContent : '');

        results.push({
          comment_id: commentId,
          author: author.substring(0, 50),
          text: text.substring(0, 300),
          likes: likes,
          time: time,
        });
      }

      return { comments: results };
    })()`);

    if (data?.loginRequired) {
      throw new AuthRequiredError('facebook.com', 'Facebook requires a signed-in browser session');
    }

    const comments = Array.isArray(data?.comments) ? data.comments : [];
    if (comments.length === 0) throw new EmptyResultError('facebook/get-comments', 'No comments found on this post');

    return comments.slice(0, limit).map((c: any, i: number) => ({
      rank: i + 1,
      ...c,
    }));
  },
});
