import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError } from '@jackwener/opencli/errors';
import { cik10, ensure, filingUrl, filingsFromSubmission, secJson } from './utils.js';

cli({
    site: 'sec',
    name: 'form-d',
    access: 'read',
    description: 'List recent SEC Form D filings for one CIK',
    domain: 'sec.gov',
    strategy: Strategy.PUBLIC,
    browser: false,
    args: [
        { name: 'cik', positional: true, required: true, help: 'CIK, with or without leading zeroes' },
        { name: 'limit', type: 'int', default: 20, help: 'Max rows (default 20)' },
    ],
    columns: ['rank', 'form', 'accessionNumber', 'filingDate', 'reportDate', 'primaryDocument', 'primaryDocDescription', 'sourceUrl'],
    func: async (args) => {
        const cik = cik10(args.cik);
        if (!/\d{10}/.test(cik)) throw new ArgumentError('cik is required');
        const limit = Math.max(1, Math.min(Number(args.limit) || 20, 200));
        const body = await secJson(`https://data.sec.gov/submissions/CIK${cik}.json`, 'sec form-d');
        const rows = filingsFromSubmission(body).filter(r => String(r.form).toUpperCase() === 'D');
        ensure(rows, 'sec form-d');
        return rows.slice(0, limit).map((r, i) => ({
            rank: i + 1,
            ...r,
            sourceUrl: filingUrl(cik, r.accessionNumber, r.primaryDocument),
        }));
    },
});
