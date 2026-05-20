import { cli, Strategy } from '@jackwener/opencli/registry';
import { EmptyResultError } from '@jackwener/opencli/errors';

cli({
    site: 'mhealthbelgium',
    name: 'app-list',
    access: 'read',
    description: 'List rendered mHealthBELGIUM medical mobile applications',
    domain: 'mhealthbelgium.be',
    strategy: Strategy.PUBLIC,
    browser: true,
    args: [
        { name: 'limit', type: 'int', default: 100, help: 'Max rows (default 100)' },
    ],
    columns: ['rank', 'name', 'level', 'description', 'url'],
    func: async (page, args) => {
        const limit = Math.max(1, Math.min(Number(args.limit) || 100, 300));
        await page.goto('https://mhealthbelgium.be/apps');
        await page.wait(3);
        const rows = await page.evaluate(`
(() => {
  const out = [];
  const root = document.querySelector('#applications-selection-content') || document.body;
  const links = [...root.querySelectorAll('a[href]')];
  const seen = new Set();
  for (const a of links) {
    const href = a.href || '';
    const text = (a.innerText || a.textContent || '').replace(/\\s+/g, ' ').trim();
    if (!href || seen.has(href)) continue;
    if (!/mhealthbelgium\\.be/.test(href)) continue;
    const box = a.closest('article, li, .item, .app, [class*="app"], [class*="application"]') || a;
    const whole = (box.innerText || box.textContent || '').replace(/\\s+/g, ' ').trim();
    const level = (whole.match(/Level\\s*\\d(?:\\s*(?:plus|light))?/i) || [''])[0];
    const name = text || (a.querySelector('img')?.alt || '').trim();
    if (!name || name.length > 120) continue;
    seen.add(href);
    out.push({ name, level, description: whole.slice(0, 300), url: href });
  }
  return out;
})()
        `);
        if (!Array.isArray(rows) || rows.length === 0) {
            throw new EmptyResultError('mHealthBELGIUM app-list', 'The site may have changed its client-side rendering or blocked automation.');
        }
        return rows.slice(0, limit).map((r, i) => ({ rank: i + 1, ...r }));
    },
});
