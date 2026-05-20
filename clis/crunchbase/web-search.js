import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError, AuthRequiredError, EmptyResultError } from '@jackwener/opencli/errors';

cli({
    site: 'crunchbase',
    name: 'web-search',
    access: 'read',
    description: 'Search publicly rendered Crunchbase organization links without the API key',
    domain: 'crunchbase.com',
    strategy: Strategy.PUBLIC,
    browser: true,
    args: [
        { name: 'query', positional: true, required: true, help: 'Organization keyword' },
        { name: 'limit', type: 'int', default: 10, help: 'Max rows (default 10)' },
    ],
    columns: ['rank', 'name', 'url', 'description', 'sourceUrl'],
    func: async (page, args) => {
        const query = String(args.query ?? '').trim();
        if (!query) throw new ArgumentError('query is required');
        const limit = Math.max(1, Math.min(Number(args.limit) || 10, 50));
        const sourceUrl = `https://www.crunchbase.com/search/organizations/field/organizations/name/${encodeURIComponent(query)}`;
        await page.goto(sourceUrl);
        await page.wait(4);
        const wrapper = await page.evaluate(`
(() => {
  const clean = s => (s || '').replace(/\\s+/g, ' ').trim();
  const body = clean(document.body?.innerText || '');
  if (/verify you are human|captcha|sign in to continue|access denied/i.test(body)) return { blocked: true };
  const out = [];
  const seen = new Set();
  for (const a of document.querySelectorAll('a[href*="/organization/"]')) {
    const url = new URL(a.getAttribute('href'), location.href).href.split('?')[0];
    if (seen.has(url)) continue;
    seen.add(url);
    const box = a.closest('li, article, tr, .component--field-formatter, [class*="result"], [class*="card"]') || a.parentElement || a;
    const name = clean(a.innerText || a.textContent);
    const description = clean(box.innerText || box.textContent).replace(name, '').slice(0, 300);
    if (name && name.length <= 160) out.push({ name, url, description });
  }
  return { rows: out };
})()
        `);
        if (wrapper?.blocked) throw new AuthRequiredError('crunchbase.com', 'Crunchbase blocked or gated the rendered search page; use the official API or a licensed export.');
        const rows = wrapper?.rows ?? [];
        if (!Array.isArray(rows) || !rows.length) throw new EmptyResultError('crunchbase web-search', 'No public Crunchbase organization links were visible.');
        return rows.slice(0, limit).map((r, i) => ({ rank: i + 1, ...r, sourceUrl }));
    },
});
