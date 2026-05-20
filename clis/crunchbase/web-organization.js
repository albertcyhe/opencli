import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError, AuthRequiredError, EmptyResultError } from '@jackwener/opencli/errors';

function orgUrl(raw) {
    const value = String(raw ?? '').trim();
    if (!value) throw new ArgumentError('slug-or-url is required');
    if (/^https:\/\/www\.crunchbase\.com\/organization\//.test(value)) return value;
    return `https://www.crunchbase.com/organization/${encodeURIComponent(value)}`;
}

cli({
    site: 'crunchbase',
    name: 'web-organization',
    access: 'read',
    description: 'Read visible public Crunchbase organization fields without the API key',
    domain: 'crunchbase.com',
    strategy: Strategy.PUBLIC,
    browser: true,
    args: [
        { name: 'slug-or-url', positional: true, required: true, help: 'Crunchbase organization slug or full URL' },
    ],
    columns: ['field', 'value', 'sourceUrl'],
    func: async (page, args) => {
        const target = orgUrl(args['slug-or-url']);
        await page.goto(target);
        await page.wait(4);
        const wrapper = await page.evaluate(`
(() => {
  const clean = s => (s || '').replace(/\\s+/g, ' ').trim();
  const body = clean(document.body?.innerText || '');
  if (/verify you are human|captcha|sign in to continue|access denied/i.test(body)) return { blocked: true };
  const sourceUrl = location.href;
  const out = [];
  const title = clean(document.querySelector('h1')?.textContent || document.querySelector('[class*="profile-name"]')?.textContent);
  if (title) out.push({ field: 'name', value: title, sourceUrl });
  const description = clean(document.querySelector('meta[name="description"]')?.content || document.querySelector('[class*="description"]')?.textContent);
  if (description) out.push({ field: 'description', value: description, sourceUrl });
  for (const row of document.querySelectorAll('tr, fields-card li, .section-content-wrapper li, .field, [class*="field"]')) {
    const label = clean(row.querySelector('.field-label, label, dt, th, strong')?.textContent);
    const value = clean(row.querySelector('.field-value, dd, td')?.textContent);
    const text = clean(row.innerText || row.textContent);
    if (label && value && label !== value) out.push({ field: label.replace(/[:：]$/, ''), value, sourceUrl });
    else if (text.includes(':')) {
      const parts = text.split(/:|：/);
      if (parts[0].length < 80) out.push({ field: clean(parts.shift()).replace(/[:：]$/, ''), value: clean(parts.join(':')), sourceUrl });
    }
  }
  const seen = new Set();
  return { rows: out.filter(r => r.field && r.value && !seen.has(r.field + r.value) && seen.add(r.field + r.value)) };
})()
        `);
        if (wrapper?.blocked) throw new AuthRequiredError('crunchbase.com', 'Crunchbase blocked or gated the rendered organization page; use the official API or a licensed export.');
        const rows = wrapper?.rows ?? [];
        if (!Array.isArray(rows) || !rows.length) throw new EmptyResultError('crunchbase web-organization', 'No visible Crunchbase organization fields were found.');
        return rows;
    },
});
