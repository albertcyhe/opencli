import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError, EmptyResultError } from '@jackwener/opencli/errors';

cli({
    site: 'opencorporates',
    name: 'web-search',
    access: 'read',
    description: 'Search publicly rendered OpenCorporates company pages without an API token',
    domain: 'opencorporates.com',
    strategy: Strategy.PUBLIC,
    browser: true,
    args: [
        { name: 'query', positional: true, required: true, help: 'Company name or identifier' },
        { name: 'jurisdiction-code', help: 'Optional OpenCorporates jurisdiction code, e.g. us_de, gb' },
        { name: 'limit', type: 'int', default: 20, help: 'Max rows (default 20)' },
    ],
    columns: ['rank', 'name', 'companyNumber', 'jurisdictionCode', 'status', 'address', 'url', 'sourceUrl'],
    func: async (page, args) => {
        const query = String(args.query ?? '').trim();
        if (!query) throw new ArgumentError('query is required');
        const limit = Math.max(1, Math.min(Number(args.limit) || 20, 100));
        const params = new URLSearchParams({ q: query });
        if (args['jurisdiction-code']) params.set('jurisdiction_code', String(args['jurisdiction-code']));
        const sourceUrl = `https://opencorporates.com/companies?${params.toString()}`;
        await page.goto(sourceUrl);
        await page.wait(3);
        const rows = await page.evaluate(`
(() => {
  const clean = s => (s || '').replace(/\\s+/g, ' ').trim();
  const out = [];
  const seen = new Set();
  for (const a of document.querySelectorAll('a[href^="/companies/"], a[href*="opencorporates.com/companies/"]')) {
    const url = new URL(a.getAttribute('href'), location.href).href;
    const m = url.match(/\\/companies\\/([^/]+)\\/([^/?#]+)/);
    if (!m || seen.has(url)) continue;
    seen.add(url);
    const box = a.closest('li, article, tr, .search-result, .company, [class*="result"]') || a.parentElement || a;
    const text = clean(box.innerText || box.textContent);
    const name = clean(a.innerText || a.textContent).replace(/\\s+\\([^)]*\\)$/, '');
    if (!name || name.length > 220) continue;
    const status = (text.match(/(?:Status|Current status)[:：]?\\s*([^\\n]{2,80})/i) || [])[1] || '';
    const address = (text.match(/(?:Registered Address|Address)[:：]?\\s*([^\\n]{5,180})/i) || [])[1] || '';
    out.push({ name, companyNumber: decodeURIComponent(m[2]), jurisdictionCode: m[1], status: clean(status), address: clean(address), url });
  }
  return out;
})()
        `);
        if (!Array.isArray(rows) || !rows.length) throw new EmptyResultError('opencorporates web-search', 'No public OpenCorporates search rows were visible.');
        return rows.slice(0, limit).map((r, i) => ({ rank: i + 1, ...r, sourceUrl }));
    },
});
