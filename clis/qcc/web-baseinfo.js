import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError, AuthRequiredError, EmptyResultError } from '@jackwener/opencli/errors';

function resolveUrl(raw) {
    const value = String(raw ?? '').trim();
    if (!value) throw new ArgumentError('firm-url is required');
    if (/^https:\/\/www\.qcc\.com\/firm\//.test(value)) return value;
    if (/^[A-Za-z0-9]+$/.test(value)) return `https://www.qcc.com/firm/${value}.html`;
    throw new ArgumentError('firm-url must be a full https://www.qcc.com/firm/... URL or KeyNo');
}

cli({
    site: 'qcc',
    name: 'web-baseinfo',
    access: 'read',
    description: 'Read visible Qichacha company base information from the browser profile without QCC OpenAPI credentials',
    domain: 'qcc.com',
    strategy: Strategy.PUBLIC,
    browser: true,
    args: [
        { name: 'firm-url', positional: true, required: true, help: 'Qichacha firm URL or KeyNo' },
    ],
    columns: ['field', 'value', 'sourceUrl'],
    func: async (page, args) => {
        const target = resolveUrl(args['firm-url']);
        await page.goto(target);
        await page.wait(4);
        const wrapper = await page.evaluate(`
(() => {
  const clean = s => (s || '').replace(/\\s+/g, ' ').trim();
  const body = clean(document.body?.innerText || '');
  if (/验证码|安全验证|请登录|登录后查看更多|访问受限|滑块|robot|captcha/i.test(body)) return { blocked: true };
  const sourceUrl = location.href;
  const out = [];
  const title = clean(document.querySelector('h1, .company-name, [class*="company-name"]')?.textContent);
  if (title) out.push({ field: '企业名称', value: title, sourceUrl });
  for (const row of document.querySelectorAll('tr, dl, .info-item, .base-item, [class*="info"], p')) {
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
        if (wrapper?.blocked) throw new AuthRequiredError('qcc.com', 'Qichacha requires normal login or verification in the browser profile; the adapter will not bypass it.');
        const rows = wrapper?.rows ?? [];
        if (!Array.isArray(rows) || !rows.length) throw new EmptyResultError('qcc web-baseinfo', 'No visible Qichacha base information fields were found.');
        return rows;
    },
});
