import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError, EmptyResultError } from '@jackwener/opencli/errors';

const SOURCE_URL = 'https://diga.bfarm.de/de/verzeichnis';

function resolveUrl(raw) {
    const value = String(raw ?? '').trim();
    if (!value) throw new ArgumentError('url-or-query is required');
    if (/^https:\/\/diga\.bfarm\.de\//.test(value)) return value;
    return `${SOURCE_URL}?search=${encodeURIComponent(value)}`;
}

cli({
    site: 'bfarm',
    name: 'diga-web-detail',
    access: 'read',
    description: 'Read visible fields from a public BfArM DiGA directory page without the FHIR API token',
    domain: 'diga.bfarm.de',
    strategy: Strategy.PUBLIC,
    browser: true,
    args: [
        { name: 'url-or-query', positional: true, required: true, help: 'Full DiGA URL or product/DiGA id search term' },
    ],
    columns: ['field', 'value', 'sourceUrl'],
    func: async (page, args) => {
        const target = resolveUrl(args['url-or-query']);
        await page.goto(target);
        await page.wait(4);
        const rows = await page.evaluate(`
(() => {
  const clean = s => (s || '').replace(/\\s+/g, ' ').trim();
  const sourceUrl = location.href;
  const out = [];
  const title = clean(document.querySelector('h1, h2')?.textContent);
  if (title) out.push({ field: 'title', value: title, sourceUrl });
  for (const row of document.querySelectorAll('tr, dl, .row, [class*="detail"], [class*="property"], p')) {
    const text = clean(row.innerText || row.textContent);
    if (!text || text.length < 3 || text.length > 800) continue;
    const dt = clean(row.querySelector('dt, th, [class*="label"]')?.textContent);
    const dd = clean(row.querySelector('dd, td, [class*="value"]')?.textContent);
    if (dt && dd && dt !== dd) out.push({ field: dt.replace(/[:：]$/, ''), value: dd, sourceUrl });
    else {
      const parts = text.split(/:|：/);
      if (parts.length >= 2 && parts[0].length < 100) out.push({ field: clean(parts.shift()).replace(/[:：]$/, ''), value: clean(parts.join(':')), sourceUrl });
    }
  }
  const seen = new Set();
  return out.filter(r => {
    const k = r.field + '\\n' + r.value;
    if (!r.field || !r.value || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
})()
        `);
        if (!Array.isArray(rows) || !rows.length) {
            throw new EmptyResultError('bfarm diga-web-detail', 'No visible DiGA detail fields were found.');
        }
        return rows;
    },
});
