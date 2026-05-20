import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError } from '@jackwener/opencli/errors';
import { fetchLicensed } from './utils.js';

cli({
    site: 'itjuzi',
    name: 'company',
    access: 'read',
    description: 'Search licensed IT桔子 company data through ITJUZI_API_BASE',
    strategy: Strategy.PUBLIC,
    browser: false,
    args: [
        { name: 'query', positional: true, required: true, help: 'Company keyword' },
        { name: 'limit', type: 'int', default: 20, help: 'Max rows (default 20)' },
    ],
    columns: ['rank', 'companyName', 'description', 'city', 'industry', 'website', 'source'],
    func: async (args) => {
        const query = String(args.query ?? '').trim();
        if (!query) throw new ArgumentError('query is required');
        const limit = Math.max(1, Math.min(Number(args.limit) || 20, 100));
        const rows = await fetchLicensed('/company/search', query, 'itjuzi company');
        return rows.slice(0, limit).map((r, i) => ({
            rank: i + 1,
            companyName: r.companyName ?? r.name ?? r.company_name ?? null,
            description: r.description ?? r.desc ?? null,
            city: r.city ?? null,
            industry: r.industry ?? r.category ?? null,
            website: r.website ?? r.url ?? null,
            source: 'itjuzi-api',
        }));
    },
});
