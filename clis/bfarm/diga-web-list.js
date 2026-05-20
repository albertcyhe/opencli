import { cli, Strategy } from '@jackwener/opencli/registry';
import { EmptyResultError } from '@jackwener/opencli/errors';

const SOURCE_URL = 'https://diga.bfarm.de/de/verzeichnis';

cli({
    site: 'bfarm',
    name: 'diga-web-list',
    access: 'read',
    description: 'List publicly rendered BfArM DiGA directory entries without the FHIR API token',
    domain: 'diga.bfarm.de',
    strategy: Strategy.PUBLIC,
    browser: true,
    args: [
        { name: 'query', help: 'Optional DiGA/product/company search term' },
        { name: 'limit', type: 'int', default: 100, help: 'Max rows (default 100)' },
    ],
    columns: ['rank', 'name', 'manufacturer', 'indication', 'status', 'url', 'sourceUrl'],
    func: async (page, args) => {
        const limit = Math.max(1, Math.min(Number(args.limit) || 100, 500));
        const query = String(args.query ?? '').trim();
        const url = query ? `${SOURCE_URL}?search=${encodeURIComponent(query)}` : SOURCE_URL;
        await page.goto(url);
        await page.wait(4);
        const rows = await page.evaluate(`
(() => {
  const clean = s => (s || '').replace(/\\s+/g, ' ').trim();
  const out = [];
  const seen = new Set();
  const roots = document.querySelectorAll('article, li, tr, [class*="card"], [class*="result"], [class*="diga"]');
  for (const root of roots) {
    const link = root.querySelector('a[href*="/de/verzeichnis"]') || root.querySelector('a[href]');
    const href = link ? new URL(link.getAttribute('href'), location.href).href : location.href;
    const text = clean(root.innerText || root.textContent);
    if (!text || seen.has(href + text.slice(0, 60))) continue;
    if (text.length < 4) continue;
    seen.add(href + text.slice(0, 60));
    const lines = text.split(/\\n|\\s{2,}/).map(clean).filter(Boolean);
    const name = clean(link?.innerText || link?.textContent || lines[0] || '');
    if (!name || name.length > 180) continue;
    const status = (text.match(/(?:dauerhaft|vorlaeufig|vorläufig|gelistet|gestrichen|permanent|preliminary)[^\\n]{0,80}/i) || [''])[0];
    const indication = (text.match(/(?:Indikation|Anwendungsgebiet)[:：]?\\s*([^\\n]{3,160})/i) || [])[1] || '';
    const manufacturer = (text.match(/(?:Hersteller|Anbieter)[:：]?\\s*([^\\n]{3,140})/i) || [])[1] || '';
    out.push({ name, manufacturer: clean(manufacturer), indication: clean(indication), status: clean(status), url: href });
  }
  return out;
})()
        `);
        if (!Array.isArray(rows) || !rows.length) {
            throw new EmptyResultError('bfarm diga-web-list', 'No public DiGA directory entries were visible in the rendered page.');
        }
        return rows.slice(0, limit).map((r, i) => ({ rank: i + 1, ...r, sourceUrl: SOURCE_URL }));
    },
});
