import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError, AuthRequiredError, EmptyResultError } from '@jackwener/opencli/errors';

function resolveUrl(raw) {
    const value = String(raw ?? '').trim();
    if (!value) throw new ArgumentError('company-url is required');
    if (/^https:\/\/www\.itjuzi\.com\//.test(value)) return value;
    return `https://www.itjuzi.com/company/${encodeURIComponent(value)}`;
}

cli({
    site: 'itjuzi',
    name: 'web-company',
    access: 'read',
    description: 'Read visible IT桔子 company/financing fields in the browser profile without licensed API credentials',
    domain: 'itjuzi.com',
    strategy: Strategy.PUBLIC,
    browser: true,
    args: [
        { name: 'company-url', positional: true, required: true, help: 'IT桔子 company URL or numeric/company id path segment' },
    ],
    columns: ['field', 'value', 'sourceUrl'],
    func: async (page, args) => {
        const target = resolveUrl(args['company-url']);
        await page.goto(target);
        await page.wait(4);
        const wrapper = await page.evaluate(`
(() => {
  const clean = s => (s || '').replace(/\\s+/g, ' ').trim();
  const body = clean(document.body?.innerText || '');
  if (/验证码|安全验证|请登录|登录后|访问受限|会员|付费|权限|captcha/i.test(body)) return { blocked: true };
  const sourceUrl = location.href;
  const out = [];
  const title = clean(document.querySelector('h1, .company-name, [class*="company-name"]')?.textContent);
  if (title) out.push({ field: 'companyName', value: title, sourceUrl });
  for (const row of document.querySelectorAll('tr, dl, .info-item, .base-item, [class*="info"], [class*="finance"], p')) {
    const label = clean(row.querySelector('th, dt, .label, .key, strong')?.textContent);
    const value = clean(row.querySelector('td, dd, .value, .val')?.textContent);
    const text = clean(row.innerText || row.textContent);
    if (label && value && label !== value) out.push({ field: label.replace(/[:：]$/, ''), value, sourceUrl });
    else if (text.includes('：') || text.includes(':')) {
      const parts = text.split(/:|：/);
      if (parts[0].length < 80) out.push({ field: clean(parts.shift()).replace(/[:：]$/, ''), value: clean(parts.join(':')), sourceUrl });
    }
  }
  const seen = new Set();
  return { rows: out.filter(r => r.field && r.value && !seen.has(r.field + r.value) && seen.add(r.field + r.value)) };
})()
        `);
        if (wrapper?.blocked) throw new AuthRequiredError('itjuzi.com', 'IT桔子 page is login-, member-, or verification-gated; use the licensed API/import adapter instead.');
        const rows = wrapper?.rows ?? [];
        if (!Array.isArray(rows) || !rows.length) throw new EmptyResultError('itjuzi web-company', 'No visible IT桔子 company fields were found.');
        return rows;
    },
});
