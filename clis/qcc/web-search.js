import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError, AuthRequiredError, EmptyResultError } from '@jackwener/opencli/errors';

cli({
    site: 'qcc',
    name: 'web-search',
    access: 'read',
    description: 'Search visible Qichacha web results in the browser profile without QCC OpenAPI credentials',
    domain: 'qcc.com',
    strategy: Strategy.PUBLIC,
    browser: true,
    args: [
        { name: 'query', positional: true, required: true, help: 'Company keyword' },
        { name: 'limit', type: 'int', default: 20, help: 'Max rows (default 20)' },
    ],
    columns: ['rank', 'name', 'creditCode', 'legalRepresentative', 'registeredCapital', 'status', 'address', 'url', 'sourceUrl'],
    func: async (page, args) => {
        const query = String(args.query ?? '').trim();
        if (!query) throw new ArgumentError('query is required');
        const limit = Math.max(1, Math.min(Number(args.limit) || 20, 100));
        const sourceUrl = `https://www.qcc.com/web/search?key=${encodeURIComponent(query)}`;
        await page.goto(sourceUrl);
        await page.wait(4);
        const wrapper = await page.evaluate(`
(() => {
  const clean = s => (s || '').replace(/\\s+/g, ' ').trim();
  const body = clean(document.body?.innerText || '');
  if (/验证码|安全验证|请登录|登录后查看更多|访问受限|滑块|robot|captcha/i.test(body)) return { blocked: true };
  const out = [];
  const seen = new Set();
  for (const a of document.querySelectorAll('a[href*="/firm/"]')) {
    const url = new URL(a.getAttribute('href'), location.href).href.split('?')[0];
    if (seen.has(url)) continue;
    seen.add(url);
    const box = a.closest('tr, li, .search-item, .maininfo, [class*="search"], [class*="company"]') || a.parentElement || a;
    const text = clean(box.innerText || box.textContent);
    const name = clean(a.innerText || a.textContent).replace(/\\s+更多.*$/, '');
    if (!name || name.length > 160) continue;
    const creditCode = (text.match(/(?:统一社会信用代码|信用代码)[:：]?\\s*([0-9A-Z]{12,30})/) || [])[1] || '';
    const legalRepresentative = (text.match(/(?:法定代表人|法人)[:：]?\\s*([^\\s｜|]{2,40})/) || [])[1] || '';
    const registeredCapital = (text.match(/(?:注册资本)[:：]?\\s*([^\\s｜|]{2,60})/) || [])[1] || '';
    const status = (text.match(/\\b(?:存续|在业|开业|注销|吊销|迁出|正常)\\b/) || [''])[0];
    const address = (text.match(/(?:地址|企业地址)[:：]?\\s*([^\\n]{5,180})/) || [])[1] || '';
    out.push({ name, creditCode, legalRepresentative, registeredCapital, status, address: clean(address), url });
  }
  return { rows: out };
})()
        `);
        if (wrapper?.blocked) throw new AuthRequiredError('qcc.com', 'Qichacha requires normal login or verification in the browser profile; the adapter will not bypass it.');
        const rows = wrapper?.rows ?? [];
        if (!Array.isArray(rows) || !rows.length) throw new EmptyResultError('qcc web-search', 'No visible Qichacha company rows were found.');
        return rows.slice(0, limit).map((r, i) => ({ rank: i + 1, ...r, sourceUrl }));
    },
});
