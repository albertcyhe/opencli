import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError } from '@jackwener/opencli/errors';
import { companyRow, ensure, ocFetch } from './utils.js';

cli({
    site: 'opencorporates',
    name: 'search',
    access: 'read',
    description: 'Search OpenCorporates companies (requires OPENCORPORATES_API_TOKEN)',
    domain: 'opencorporates.com',
    strategy: Strategy.PUBLIC,
    browser: false,
    args: [
        { name: 'query', positional: true, required: true, help: 'Company name or identifier' },
        { name: 'jurisdiction-code', help: 'Optional OpenCorporates jurisdiction code, e.g. gb, us_de, fr' },
        { name: 'country-code', help: 'Optional country code, e.g. us, gb, de' },
        { name: 'limit', type: 'int', default: 20, help: 'Max rows (1-100, default 20)' },
    ],
    columns: ['rank', 'name', 'companyNumber', 'jurisdictionCode', 'companyType', 'status', 'inactive', 'incorporationDate', 'registeredAddress', 'registryUrl', 'opencorporatesUrl'],
    func: async (args) => {
        const query = String(args.query ?? '').trim();
        if (!query) throw new ArgumentError('query is required');
        const limit = Math.max(1, Math.min(Number(args.limit) || 20, 100));
        const body = await ocFetch('/companies/search', {
            q: query,
            jurisdiction_code: args['jurisdiction-code'],
            country_code: args['country-code'],
            per_page: limit,
            order: 'score',
        }, 'opencorporates search');
        const rows = (body?.results?.companies ?? []).map(x => x.company).filter(Boolean);
        ensure(rows, 'opencorporates search');
        return rows.slice(0, limit).map((c, i) => companyRow(c, i + 1));
    },
});
