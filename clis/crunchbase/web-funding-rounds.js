import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError, AuthRequiredError, EmptyResultError } from '@jackwener/opencli/errors';

function fundingUrl(raw) {
    const value = String(raw ?? '').trim();
    if (!value) throw new ArgumentError('slug-or-url is required');
    if (/^https:\/\/www\.crunchbase\.com\/organization\//.test(value)) {
        return value.replace(/\/?$/, '/company_financials');
    }
    return `https://www.crunchbase.com/organization/${encodeURIComponent(value)}/company_financials`;
}

cli({
    site: 'crunchbase',
    name: 'web-funding-rounds',
    access: 'read',
    description: 'Read visible public Crunchbase funding rows without the API key',
    domain: 'crunchbase.com',
    strategy: Strategy.PUBLIC,
    browser: true,
    args: [
        { name: 'slug-or-url', positional: true, required: true, help: 'Crunchbase organization slug or full organization URL' },
        { name: 'limit', type: 'int', default: 25, help: 'Max rows (default 25)' },
    ],
    columns: ['rank', 'roundName', 'announcedOn', 'investmentType', 'moneyRaised', 'leadInvestors', 'sourceUrl'],
    func: async (page, args) => {
        const limit = Math.max(1, Math.min(Number(args.limit) || 25, 100));
        const target = fundingUrl(args['slug-or-url']);
        await page.goto(target);
        await page.wait(4);
        const wrapper = await page.evaluate(`
(() => {
  const clean = s => (s || '').replace(/\\s+/g, ' ').trim();
  const body = clean(document.body?.innerText || '');
  if (/verify you are human|captcha|sign in to continue|access denied/i.test(body)) return { blocked: true };
  const out = [];
  for (const row of document.querySelectorAll('tr, grid-row, .mat-row, li, [class*="funding"]')) {
    const text = clean(row.innerText || row.textContent);
    if (!/seed|series|grant|venture|funding|round|\\$|€|£|¥/i.test(text)) continue;
    const cells = [...row.querySelectorAll('td, grid-cell, .mat-cell, span, div')].map(x => clean(x.textContent)).filter(Boolean);
    const uniq = [...new Set(cells)].filter(x => x.length < 160);
    const roundName = uniq.find(x => /seed|series|grant|venture|debt|angel|round/i.test(x)) || text.slice(0, 120);
    const announcedOn = (text.match(/\\b\\d{4}-\\d{2}-\\d{2}\\b|\\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?\\s+\\d{1,2},?\\s+\\d{4}\\b/i) || [''])[0];
    const moneyRaised = (text.match(/[$€£¥]\\s?[\\d,.]+\\s?[KMBTkmbt]?|\\b[\\d,.]+\\s?(?:million|billion)\\b/i) || [''])[0];
    out.push({ roundName, announcedOn, investmentType: roundName, moneyRaised, leadInvestors: '', sourceUrl: location.href });
  }
  const seen = new Set();
  return { rows: out.filter(r => r.roundName && !seen.has(r.roundName + r.announcedOn + r.moneyRaised) && seen.add(r.roundName + r.announcedOn + r.moneyRaised)) };
})()
        `);
        if (wrapper?.blocked) throw new AuthRequiredError('crunchbase.com', 'Crunchbase blocked or gated the rendered funding page; use the official API or a licensed export.');
        const rows = wrapper?.rows ?? [];
        if (!Array.isArray(rows) || !rows.length) throw new EmptyResultError('crunchbase web-funding-rounds', 'No visible Crunchbase funding rows were found.');
        return rows.slice(0, limit).map((r, i) => ({ rank: i + 1, ...r }));
    },
});
