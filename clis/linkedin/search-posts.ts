/**
 * LinkedIn search-posts — search LinkedIn posts (not jobs).
 *
 * Navigates to the content search page and DOM-scrapes post cards,
 * reusing extraction patterns from timeline.ts.
 */
import { cli, Strategy } from '@jackwener/opencli/registry';
import { AuthRequiredError, EmptyResultError } from '@jackwener/opencli/errors';

cli({
  site: 'linkedin',
  name: 'search-posts',
  description: 'Search LinkedIn posts',
  domain: 'www.linkedin.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'query', required: true, positional: true, help: 'Search keyword' },
    { name: 'limit', type: 'int', default: 15, help: 'Number of posts (max 50)' },
  ],
  columns: ['rank', 'author', 'text', 'reactions', 'comments', 'url'],
  func: async (page, kwargs) => {
    const query = kwargs.query;
    const limit = Math.min(Math.max(1, kwargs.limit ?? 15), 50);

    await page.goto(`https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(query)}`);
    await page.wait(4);

    // Scroll to load more results
    for (let i = 0; i < 3 && true; i++) {
      await page.autoScroll({ times: 1, delayMs: 1200 });
      await page.wait(1);
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
      if (path.indexOf('/login') >= 0 || path.indexOf('/checkpoint/') >= 0) {
        return { loginRequired: true };
      }

      var cards = Array.from(document.querySelectorAll('.feed-shared-update-v2, [data-urn*="activity"], [role="listitem"]'));
      var seen = new Set();
      var posts = [];

      for (var i = 0; i < cards.length; i++) {
        var card = cards[i];
        if (seen.has(card)) continue;
        seen.add(card);

        var authorEl = card.querySelector('.update-components-actor__title span[dir="ltr"]')
          || card.querySelector('.update-components-actor__title')
          || card.querySelector('a[href*="/in/"] span');
        var author = normalize(authorEl ? authorEl.textContent : '');

        var textEl = card.querySelector('.update-components-text span[dir="ltr"]')
          || card.querySelector('.update-components-text')
          || card.querySelector('.feed-shared-inline-show-more-text span[dir="ltr"]')
          || card.querySelector('.feed-shared-inline-show-more-text');
        var text = normalize(textEl ? textEl.textContent : '');

        if (!author || !text) continue;

        var permalink = card.querySelector('a[href*="/feed/update/"], a[href*="/posts/"]');
        var url = permalink ? permalink.href : '';

        // Try to extract activity URN from element attributes
        if (!url) {
          var urnEls = [card].concat(Array.from(card.querySelectorAll('*')));
          for (var j = 0; j < Math.min(urnEls.length, 50); j++) {
            var attrs = Array.from(urnEls[j].attributes || []);
            for (var k = 0; k < attrs.length; k++) {
              var match = String(attrs[k].value).match(/urn:li:activity:\\d+/);
              if (match) { url = 'https://www.linkedin.com/feed/update/' + match[0] + '/'; break; }
            }
            if (url) break;
          }
        }

        var reactionsEl = card.querySelector('.social-details-social-counts__reactions-count')
          || card.querySelector('[aria-label*="reaction"]');
        var reactions = parseMetric(reactionsEl ? (reactionsEl.textContent || reactionsEl.getAttribute('aria-label')) : '');

        var commentCount = 0;
        var commentBtns = Array.from(card.querySelectorAll('button, a'));
        for (var j = 0; j < commentBtns.length; j++) {
          var label = normalize(commentBtns[j].textContent || commentBtns[j].getAttribute('aria-label'));
          if (/comment/i.test(label)) { commentCount = parseMetric(label); break; }
        }

        posts.push({
          author: author,
          text: text.substring(0, 200),
          reactions: reactions,
          comments: commentCount,
          url: url,
        });
      }

      return { posts: posts };
    })()`);

    if (data?.loginRequired) {
      throw new AuthRequiredError('linkedin.com', 'LinkedIn post search requires a signed-in browser session');
    }

    const posts = Array.isArray(data?.posts) ? data.posts : [];
    if (posts.length === 0) throw new EmptyResultError('linkedin/search-posts', 'No posts found');

    return posts.slice(0, limit).map((p: any, i: number) => ({
      rank: i + 1,
      ...p,
    }));
  },
});
