import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError } from '@jackwener/opencli/errors';
import { ensure, secJson } from './utils.js';

cli({
    site: 'sec',
    name: 'company',
    access: 'read',
    description: 'Search SEC company tickers by name or ticker',
    domain: 'sec.gov',
    strategy: Strategy.PUBLIC,
    browser: false,
    args: [
        { name: 'query', positional: true, required: true, help: 'Company name or ticker' },
        { name: 'limit', type: 'int', default: 20, help: 'Max rows (default 20)' },
    ],
    columns: ['rank', 'cik', 'ticker', 'title', 'sourceUrl'],
    func: async (args) => {
        const query = String(args.query ?? '').trim().toLowerCase();
        if (!query) throw new ArgumentError('query is required');
        const limit = Math.max(1, Math.min(Number(args.limit) || 20, 100));
        const body = await secJson('https://www.sec.gov/files/company_tickers.json', 'sec company');
        const rows = Object.values(body ?? {}).filter(x => {
            const ticker = String(x?.ticker ?? '').toLowerCase();
            const title = String(x?.title ?? '').toLowerCase();
            return ticker === query || ticker.includes(query) || title.includes(query);
        });
        ensure(rows, 'sec company');
        return rows.slice(0, limit).map((r, i) => ({
            rank: i + 1,
            cik: String(r.cik_str).padStart(10, '0'),
            ticker: r.ticker ?? null,
            title: r.title ?? null,
            sourceUrl: `https://www.sec.gov/edgar/browse/?CIK=${r.cik_str}`,
        }));
    },
});
