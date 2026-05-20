import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError, EmptyResultError } from '@jackwener/opencli/errors';

function companyUrl(jurisdiction, numberOrUrl) {
    const value = String(numberOrUrl ?? '').trim();
    if (/^https:\/\/opencorporates\.com\/companies\//.test(value)) return value;
    const j = String(jurisdiction ?? '').trim();
    if (!j || !value) throw new ArgumentError('Pass a full OpenCorporates company URL or --jurisdiction-code plus company-number');
    return `https://opencorporates.com/companies/${encodeURIComponent(j)}/${encodeURIComponent(value)}`;
}

cli({
    site: 'opencorporates',
    name: 'web-company',
    access: 'read',
    description: 'Read visible fields from one public OpenCorporates company page without an API token',
    domain: 'opencorporates.com',
    strategy: Strategy.PUBLIC,
    browser: true,
    args: [
        { name: 'company-number-or-url', positional: true, required: true, help: 'Company number or full OpenCorporates URL' },
        { name: 'jurisdiction-code', help: 'Jurisdiction code when passing a company number' },
    ],
    columns: ['field', 'value', 'sourceUrl'],
    func: async (page, args) => {
        const url = companyUrl(args['jurisdiction-code'], args['company-number-or-url']);
        await page.goto(url);
        await page.wait(3);
        const rows = await page.evaluate(`
(() => {
  const clean = s => (s || '').replace(/\\s+/g, ' ').trim();
  const sourceUrl = location.href;
  const out = [];
  const title = clean(document.querySelector('h1')?.textContent);
  if (title) out.push({ field: 'name', value: title, sourceUrl });
  for (const row of document.querySelectorAll('tr, dl, .datum, .attribute, p')) {
    const label = clean(row.querySelector('th, dt, .label, strong')?.textContent);
    const value = clean(row.querySelector('td, dd, .value')?.textContent);
    const text = clean(row.innerText || row.textContent);
    if (label && value && label !== value) out.push({ field: label.replace(/[:：]$/, ''), value, sourceUrl });
    else if (text.includes(':')) {
      const parts = text.split(/:|：/);
      if (parts[0].length < 80) out.push({ field: clean(parts.shift()).replace(/[:：]$/, ''), value: clean(parts.join(':')), sourceUrl });
    }
  }
  const seen = new Set();
  return out.filter(r => r.field && r.value && !seen.has(r.field + r.value) && seen.add(r.field + r.value));
})()
        `);
        if (!Array.isArray(rows) || !rows.length) throw new EmptyResultError('opencorporates web-company', 'No visible OpenCorporates company fields were found.');
        return rows;
    },
});
