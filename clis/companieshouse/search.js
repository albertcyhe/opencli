import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError } from '@jackwener/opencli/errors';
import { chFetch, ensure, searchRow } from './utils.js';

cli({
    site: 'companieshouse',
    name: 'search',
    access: 'read',
    description: 'Search UK Companies House companies (requires COMPANIES_HOUSE_API_KEY)',
    domain: 'company-information.service.gov.uk',
    strategy: Strategy.PUBLIC,
    browser: false,
    args: [
        { name: 'query', positional: true, required: true, help: 'Company name or number' },
        { name: 'limit', type: 'int', default: 20, help: 'Max rows (1-100, default 20)' },
    ],
    columns: ['rank', 'companyName', 'companyNumber', 'companyStatus', 'companyType', 'dateOfCreation', 'address', 'url'],
    func: async (args) => {
        const query = String(args.query ?? '').trim();
        if (!query) throw new ArgumentError('query is required');
        const limit = Math.max(1, Math.min(Number(args.limit) || 20, 100));
        const body = await chFetch('/search/companies', { q: query, items_per_page: limit }, 'companieshouse search');
        const rows = ensure(Array.isArray(body?.items) ? body.items : [], 'companieshouse search');
        return rows.slice(0, limit).map((r, i) => searchRow(r, i + 1));
    },
});
