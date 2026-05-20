import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError } from '@jackwener/opencli/errors';
import { fetchLicensed } from './utils.js';

cli({
    site: 'itjuzi',
    name: 'financing',
    access: 'read',
    description: 'Search licensed IT桔子 financing data through ITJUZI_API_BASE',
    strategy: Strategy.PUBLIC,
    browser: false,
    args: [
        { name: 'query', positional: true, required: true, help: 'Company or financing keyword' },
        { name: 'limit', type: 'int', default: 20, help: 'Max rows (default 20)' },
    ],
    columns: ['rank', 'companyName', 'round', 'amount', 'currency', 'date', 'investors', 'source'],
    func: async (args) => {
        const query = String(args.query ?? '').trim();
        if (!query) throw new ArgumentError('query is required');
        const limit = Math.max(1, Math.min(Number(args.limit) || 20, 100));
        const rows = await fetchLicensed('/financing/search', query, 'itjuzi financing');
        return rows.slice(0, limit).map((r, i) => ({
            rank: i + 1,
            companyName: r.companyName ?? r.name ?? r.company_name ?? null,
            round: r.round ?? r.stage ?? r.investmentType ?? null,
            amount: r.amount ?? r.money ?? null,
            currency: r.currency ?? null,
            date: r.date ?? r.investmentDate ?? r.financing_date ?? null,
            investors: Array.isArray(r.investors) ? r.investors.join(', ') : r.investors ?? null,
            source: 'itjuzi-api',
        }));
    },
});
