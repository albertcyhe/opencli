import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError } from '@jackwener/opencli/errors';
import { companyRow, ensure, qccFetch, rowsFromResult } from './utils.js';

cli({
    site: 'qcc',
    name: 'search',
    access: 'read',
    description: 'Search Qichacha companies (requires QCC_API_KEY and QCC_SECRET_KEY)',
    domain: 'api.qichacha.com',
    strategy: Strategy.PUBLIC,
    browser: false,
    args: [
        { name: 'query', positional: true, required: true, help: 'Company keyword' },
        { name: 'limit', type: 'int', default: 20, help: 'Max rows (default 20)' },
    ],
    columns: ['rank', 'name', 'creditCode', 'operName', 'status', 'registeredCapital', 'startDate', 'address', 'businessScope', 'sourceUrl'],
    func: async (args) => {
        const query = String(args.query ?? '').trim();
        if (!query) throw new ArgumentError('query is required');
        const limit = Math.max(1, Math.min(Number(args.limit) || 20, 100));
        const body = await qccFetch('/FuzzySearch/GetList', { searchKey: query }, 'qcc search');
        const rows = ensure(rowsFromResult(body), 'qcc search');
        return rows.slice(0, limit).map((x, i) => companyRow(x, i + 1));
    },
});
