import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError, EmptyResultError } from '@jackwener/opencli/errors';

function resolveCompanyUrl(raw) {
    const value = String(raw ?? '').trim();
    if (!value) throw new ArgumentError('company-number-or-url is required');
    if (/^https:\/\/find-and-update\.company-information\.service\.gov\.uk\/company\//.test(value)) return value;
    return `https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(value)}`;
}

cli({
    site: 'companieshouse',
    name: 'web-company',
    access: 'read',
    description: 'Read public UK Companies House company page fields without an API key',
    domain: 'company-information.service.gov.uk',
    strategy: Strategy.PUBLIC,
    browser: true,
    args: [
        { name: 'company-number-or-url', positional: true, required: true, help: 'UK company number or public Companies House URL' },
    ],
    columns: ['field', 'value', 'sourceUrl'],
    func: async (page, args) => {
        const url = resolveCompanyUrl(args['company-number-or-url']);
        await page.goto(url);
        await page.wait(2);
        const rows = await page.evaluate(`
(() => {
  const clean = s => (s || '').replace(/\\s+/g, ' ').trim();
  const sourceUrl = location.href;
  const out = [];
  const title = clean(document.querySelector('h1')?.textContent);
  if (title) out.push({ field: 'companyName', value: title, sourceUrl });
  for (const row of document.querySelectorAll('dl, tr, .govuk-summary-list__row, p')) {
    const label = clean(row.querySelector('dt, th, .govuk-summary-list__key, strong')?.textContent);
    const value = clean(row.querySelector('dd, td, .govuk-summary-list__value')?.textContent);
    if (label && value && label !== value) out.push({ field: label.replace(/[:：]$/, ''), value, sourceUrl });
  }
  const seen = new Set();
  return out.filter(r => r.field && r.value && !seen.has(r.field + r.value) && seen.add(r.field + r.value));
})()
        `);
        if (!Array.isArray(rows) || !rows.length) throw new EmptyResultError('companieshouse web-company', 'No public Companies House company fields were visible.');
        return rows;
    },
});
