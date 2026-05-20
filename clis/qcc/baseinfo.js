import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError } from '@jackwener/opencli/errors';
import { companyRow, ensure, qccFetch, rowsFromResult } from './utils.js';

cli({
    site: 'qcc',
    name: 'baseinfo',
    access: 'read',
    description: 'Read Qichacha base company information by keyword (requires QCC_API_KEY and QCC_SECRET_KEY)',
    domain: 'api.qichacha.com',
    strategy: Strategy.PUBLIC,
    browser: false,
    args: [
        { name: 'keyword', positional: true, required: true, help: 'Exact company name or credit code' },
    ],
    columns: ['rank', 'name', 'creditCode', 'operName', 'status', 'registeredCapital', 'startDate', 'address', 'businessScope', 'sourceUrl'],
    func: async (args) => {
        const keyword = String(args.keyword ?? '').trim();
        if (!keyword) throw new ArgumentError('keyword is required');
        const body = await qccFetch('/ECIInfoOverview/Get', { keyword }, 'qcc baseinfo');
        const rows = ensure(rowsFromResult(body), 'qcc baseinfo');
        return rows.slice(0, 1).map((x, i) => companyRow(x, i + 1));
    },
});
