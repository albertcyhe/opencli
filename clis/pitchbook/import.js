import { cli, Strategy } from '@jackwener/opencli/registry';
import { pick, readCsvObjects } from '../_shared/csv-import.js';

cli({
    site: 'pitchbook',
    name: 'import',
    access: 'read',
    description: 'Normalize a licensed PitchBook CSV export into OpenCLI rows',
    strategy: Strategy.LOCAL,
    browser: false,
    args: [
        { name: 'file', positional: true, required: true, help: 'CSV export path' },
        { name: 'limit', type: 'int', default: 500, help: 'Max rows (default 500)' },
    ],
    columns: ['rank', 'companyName', 'description', 'hqLocation', 'website', 'financingStatus', 'lastFinancingDate', 'lastFinancingSize', 'investors', 'source'],
    func: async (args) => {
        const limit = Math.max(1, Math.min(Number(args.limit) || 500, 5000));
        const rows = await readCsvObjects(args.file);
        return rows.slice(0, limit).map((r, i) => ({
            rank: i + 1,
            companyName: pick(r, ['Company Name', 'Company', 'Name']),
            description: pick(r, ['Description', 'Business Description']),
            hqLocation: pick(r, ['HQ Location', 'Headquarters', 'Location']),
            website: pick(r, ['Website', 'Website URL']),
            financingStatus: pick(r, ['Financing Status', 'Latest Deal Type', 'Last Financing Type']),
            lastFinancingDate: pick(r, ['Last Financing Date', 'Latest Deal Date']),
            lastFinancingSize: pick(r, ['Last Financing Size', 'Latest Deal Size']),
            investors: pick(r, ['Investors', 'Latest Deal Investors']),
            source: 'pitchbook-import',
        }));
    },
});
