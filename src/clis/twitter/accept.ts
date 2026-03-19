import { cli, Strategy } from '../../registry.js';
import type { IPage } from '../../types.js';

cli({
  site: 'twitter',
  name: 'accept',
  description: 'Auto-accept DM requests containing specific keywords',
  domain: 'x.com',
  strategy: Strategy.UI,
  browser: true,
  args: [
    { name: 'keyword', type: 'string', required: true, help: 'Keyword to match in message content (e.g. "微信")' },
    { name: 'max', type: 'int', required: false, default: 20, help: 'Maximum number of requests to accept (default: 20)' },
  ],
  columns: ['index', 'status', 'user', 'message'],
  func: async (page: IPage | null, kwargs: any) => {
    if (!page) throw new Error('Requires browser');

    const keyword: string = kwargs.keyword;
    const maxAccepts: number = kwargs.max ?? 20;
    const results: Array<{ index: number; status: string; user: string; message: string }> = [];
    let acceptCount = 0;

    for (let round = 0; round < maxAccepts + 50; round++) {
      if (acceptCount >= maxAccepts) break;

      // Step 1: Navigate to DM requests page
      await page.goto('https://x.com/messages/requests');
      await page.wait(4);

      // Step 2: Extract conversation URLs from the request list
      const urlsResult = await page.evaluate(`(async () => {
        try {
          let attempts = 0;
          let urls = [];
          while (attempts < 10) {
            const anchors = Array.from(document.querySelectorAll('a[href]'));
            urls = anchors
              .map(a => a.href)
              .filter(href => /\\/messages\\/\\d+-\\d+/.test(href));
            urls = [...new Set(urls)];
            if (urls.length > 0) break;
            await new Promise(r => setTimeout(r, 1000));
            attempts++;
          }
          return { ok: true, urls };
        } catch(e) {
          return { ok: false, error: String(e), urls: [] };
        }
      })()`);

      if (!urlsResult?.ok || !urlsResult.urls?.length) {
        if (results.length === 0) {
          results.push({ index: 1, status: 'info', user: 'System', message: 'No message requests found' });
        }
        break;
      }

      const urls: string[] = urlsResult.urls;
      let foundInThisRound = false;

      // Step 3: Try each conversation in this round
      for (const url of urls) {
        if (acceptCount >= maxAccepts) break;

        await page.goto(url);
        await page.wait(3);

        // Read chat content, check keyword, and accept if matched
        const res = await page.evaluate(`(async () => {
          try {
            const keyword = ${JSON.stringify(keyword)};

            // Get username from conversation header
            const heading = document.querySelector('[data-testid="conversation-header"]') ||
                            document.querySelector('h2');
            const username = heading ? heading.innerText.trim().split('\\n')[0] : 'Unknown';

            // Read full chat area text
            const chatArea = document.querySelector('[data-testid="DmScrollerContainer"]') ||
                             document.querySelector('main');
            const text = chatArea ? chatArea.innerText : '';

            // Check if keyword is present
            if (!text.includes(keyword)) {
              return { status: 'skipped', user: username, message: 'No keyword match' };
            }

            // Find the Accept button
            const allBtns = Array.from(document.querySelectorAll('[role="button"]'));
            const acceptBtn = allBtns.find(btn => {
              const t = btn.innerText.trim().toLowerCase();
              return t === 'accept' || t === '接受';
            });

            if (!acceptBtn) {
              return { status: 'no_button', user: username, message: 'Keyword matched but no Accept button (already accepted?)' };
            }

            // Click Accept
            acceptBtn.click();
            await new Promise(r => setTimeout(r, 1500));

            // Check if there's a confirmation dialog
            const btnsAfter = Array.from(document.querySelectorAll('[role="button"]'));
            const confirmBtn = btnsAfter.find(btn => {
              const t = btn.innerText.trim().toLowerCase();
              return (t === 'accept' || t === '接受') && btn !== acceptBtn;
            });
            if (confirmBtn) {
              confirmBtn.click();
              await new Promise(r => setTimeout(r, 800));
            }

            return { status: 'accepted', user: username, message: 'Accepted! Keyword: ' + keyword };
          } catch(e) {
            return { status: 'error', user: 'system', message: String(e) };
          }
        })()`);

        if (res) {
          if (res.status === 'accepted') {
            acceptCount++;
            foundInThisRound = true;
            results.push({
              index: acceptCount,
              status: res.status,
              user: res.user || 'Unknown',
              message: res.message || 'Accepted',
            });
            // After accept, Twitter redirects to /messages — break out to re-navigate to /messages/requests
            await page.wait(2);
            break;
          }
          // Don't add skipped items to output to keep it clean
        }
      }

      // If no match found in this round, we've exhausted all requests
      if (!foundInThisRound) {
        break;
      }
    }

    if (results.length === 0) {
      results.push({ index: 0, status: 'info', user: 'System', message: `No requests matched keyword "${keyword}"` });
    }

    return results;
  }
});
