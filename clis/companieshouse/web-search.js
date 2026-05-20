import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError, EmptyResultError } from '@jackwener/opencli/errors';

cli({
    site: 'companieshouse',
    name: 'web-search',
    access: 'read',
    description: 'Search public UK Companies House pages without an API key',
    domain: 'company-information.service.gov.uk',
    strategy: Strategy.PUBLIC,
    browser: true,
    args: [
        { name: 'query', positional: true, required: true, help: 'Company name or number' },
        { name: 'limit', type: 'int', default: 20, help: 'Max rows (default 20)' },
    ],
    columns: ['rank', 'companyName', 'companyNumber', 'companyStatus', 'address', 'url', 'sourceUrl'],
    func: async (page, args) => {
        const query = String(args.query ?? '').trim();
        if (!query) throw new ArgumentError('query is required');
        const limit = Math.max(1, Math.min(Number(args.limit) || 20, 100));
        const sourceUrl = `https://find-and-update.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(query)}`;
        await page.goto(sourceUrl);
        await page.wait(2);
        const rows = await page.evaluate(`
(() => {
  const clean = s => (s || '').replace(/\\s+/g, ' ').trim();
  const out = [];
  const seen = new Set();
  for (const a of document.querySelectorAll('a[href^="/company/"], a[href*="/company/"]')) {
    const url = new URL(a.getAttribute('href'), location.href).href;
    const m = url.match(/\\/company\\/([^/?#]+)/);
    if (!m || seen.has(url)) continue;
    seen.add(url);
    const box = a.closest('li, article, tr, .type-company, .govuk-summary-card') || a.parentElement || a;
    const text = clean(box.innerText || box.textContent);
    const name = clean(a.innerText || a.textContent);
    if (!name || name.length > 180) continue;
    const status = (text.match(/\\b(active|dissolved|liquidation|administration|converted\\/closed|receivership)\\b/i) || [''])[0];
    const address = (text.match(/Registered office address\\s*([^\\n]{5,220})/i) || [])[1] || '';
    out.push({ companyName: name, companyNumber: m[1], companyStatus: clean(status), address: clean(address), url });
  }
  return out;
})()
        `);
        if (!Array.isArray(rows) || !rows.length) throw new EmptyResultError('companieshouse web-search', 'No public Companies House search rows were visible.');
        return rows.slice(0, limit).map((r, i) => ({ rank: i + 1, ...r, sourceUrl }));
    },
});
