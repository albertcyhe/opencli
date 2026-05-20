import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError, AuthRequiredError, EmptyResultError } from '@jackwener/opencli/errors';

cli({
    site: 'itjuzi',
    name: 'web-search',
    access: 'read',
    description: 'Search visible IT桔子 web results in the browser profile without licensed API credentials',
    domain: 'itjuzi.com',
    strategy: Strategy.PUBLIC,
    browser: true,
    args: [
        { name: 'query', positional: true, required: true, help: 'Company or financing keyword' },
        { name: 'limit', type: 'int', default: 20, help: 'Max rows (default 20)' },
    ],
    columns: ['rank', 'companyName', 'description', 'city', 'industry', 'website', 'url', 'sourceUrl'],
    func: async (page, args) => {
        const query = String(args.query ?? '').trim();
        if (!query) throw new ArgumentError('query is required');
        const limit = Math.max(1, Math.min(Number(args.limit) || 20, 100));
        const sourceUrl = `https://www.itjuzi.com/search?word=${encodeURIComponent(query)}`;
        await page.goto(sourceUrl);
        await page.wait(4);
        const wrapper = await page.evaluate(`
(() => {
  const clean = s => (s || '').replace(/\\s+/g, ' ').trim();
  const body = clean(document.body?.innerText || '');
  if (/验证码|安全验证|请登录|登录后|访问受限|会员|付费|权限|captcha/i.test(body)) return { blocked: true };
  const out = [];
  const seen = new Set();
  for (const a of document.querySelectorAll('a[href*="/company/"], a[href*="/company"]')) {
    const url = new URL(a.getAttribute('href'), location.href).href.split('?')[0];
    if (seen.has(url)) continue;
    seen.add(url);
    const box = a.closest('tr, li, article, .search-item, [class*="company"], [class*="result"]') || a.parentElement || a;
    const text = clean(box.innerText || box.textContent);
    const companyName = clean(a.innerText || a.textContent);
    if (!companyName || companyName.length > 160) continue;
    const city = (text.match(/(?:北京|上海|广州|深圳|杭州|成都|南京|苏州|武汉|西安|天津|重庆)/) || [''])[0];
    const industry = (text.match(/(?:医疗健康|数字医疗|医疗|健康|企业服务|人工智能|生物医药)/) || [''])[0];
    const website = (text.match(/https?:\\/\\/[^\\s]+/) || [''])[0];
    out.push({ companyName, description: text.slice(0, 300), city, industry, website, url });
  }
  return { rows: out };
})()
        `);
        if (wrapper?.blocked) throw new AuthRequiredError('itjuzi.com', 'IT桔子 page is login-, member-, or verification-gated; use the licensed API/import adapter instead.');
        const rows = wrapper?.rows ?? [];
        if (!Array.isArray(rows) || !rows.length) throw new EmptyResultError('itjuzi web-search', 'No visible IT桔子 company rows were found.');
        return rows.slice(0, limit).map((r, i) => ({ rank: i + 1, ...r, sourceUrl }));
    },
});
