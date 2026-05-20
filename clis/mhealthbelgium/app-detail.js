import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError } from '@jackwener/opencli/errors';

cli({
    site: 'mhealthbelgium',
    name: 'app-detail',
    access: 'read',
    description: 'Read visible fields from one mHealthBELGIUM app page',
    domain: 'mhealthbelgium.be',
    strategy: Strategy.PUBLIC,
    browser: true,
    args: [
        { name: 'url', positional: true, required: true, help: 'mHealthBELGIUM app URL' },
    ],
    columns: ['field', 'value', 'sourceUrl'],
    func: async (page, args) => {
        const url = String(args.url ?? '').trim();
        if (!/^https:\/\/mhealthbelgium\.be\//.test(url)) throw new ArgumentError('Pass a full https://mhealthbelgium.be/... URL');
        await page.goto(url);
        await page.wait(2);
        const rows = await page.evaluate(`
(() => {
  const clean = s => (s || '').replace(/\\s+/g, ' ').trim();
  const sourceUrl = location.href;
  const out = [];
  const h1 = clean(document.querySelector('h1')?.textContent);
  if (h1) out.push({ field: 'title', value: h1, sourceUrl });
  for (const row of document.querySelectorAll('tr, .field, .item, p')) {
    const text = clean(row.textContent);
    if (!text || text.length < 3 || text.length > 500) continue;
    const parts = text.split(/:|：/);
    if (parts.length >= 2 && parts[0].length < 80) {
      out.push({ field: clean(parts.shift()), value: clean(parts.join(':')), sourceUrl });
    }
  }
  return out;
})()
        `);
        return Array.isArray(rows) ? rows : [];
    },
});
