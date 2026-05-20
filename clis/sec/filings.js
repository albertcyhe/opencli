import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError } from '@jackwener/opencli/errors';
import { cik10, ensure, filingUrl, filingsFromSubmission, secJson } from './utils.js';

cli({
    site: 'sec',
    name: 'filings',
    access: 'read',
    description: 'List recent SEC EDGAR submissions for one CIK',
    domain: 'sec.gov',
    strategy: Strategy.PUBLIC,
    browser: false,
    args: [
        { name: 'cik', positional: true, required: true, help: 'CIK, with or without leading zeroes' },
        { name: 'form', help: 'Optional form filter, e.g. D, 10-K, S-1' },
        { name: 'limit', type: 'int', default: 20, help: 'Max rows (default 20)' },
    ],
    columns: ['rank', 'form', 'accessionNumber', 'filingDate', 'reportDate', 'primaryDocument', 'primaryDocDescription', 'sourceUrl'],
    func: async (args) => {
        const cik = cik10(args.cik);
        if (!/\d{10}/.test(cik)) throw new ArgumentError('cik is required');
        const limit = Math.max(1, Math.min(Number(args.limit) || 20, 200));
        const formFilter = String(args.form ?? '').trim().toUpperCase();
        const body = await secJson(`https://data.sec.gov/submissions/CIK${cik}.json`, 'sec filings');
        let rows = filingsFromSubmission(body);
        if (formFilter) rows = rows.filter(r => String(r.form).toUpperCase() === formFilter);
        ensure(rows, 'sec filings');
        return rows.slice(0, limit).map((r, i) => ({
            rank: i + 1,
            ...r,
            sourceUrl: filingUrl(cik, r.accessionNumber, r.primaryDocument),
        }));
    },
});
