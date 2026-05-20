import { cli, Strategy } from '@jackwener/opencli/registry';
import { pick, readCsvObjects } from '../_shared/csv-import.js';

cli({
    site: 'pharmcube',
    name: 'investgo-import',
    access: 'read',
    description: 'Normalize a licensed PharmCube InvestGO CSV export',
    strategy: Strategy.LOCAL,
    browser: false,
    args: [
        { name: 'file', positional: true, required: true, help: 'CSV export path' },
        { name: 'limit', type: 'int', default: 500, help: 'Max rows (default 500)' },
    ],
    columns: ['rank', 'companyName', 'productOrPipeline', 'businessScope', 'round', 'amount', 'currency', 'date', 'investors', 'source'],
    func: async (args) => {
        const limit = Math.max(1, Math.min(Number(args.limit) || 500, 5000));
        const rows = await readCsvObjects(args.file);
        return rows.slice(0, limit).map((r, i) => ({
            rank: i + 1,
            companyName: pick(r, ['企业名称', '公司名称', 'Company Name', 'Company']),
            productOrPipeline: pick(r, ['产品', '管线', 'Product', 'Pipeline']),
            businessScope: pick(r, ['业务范围', '简介', 'Description']),
            round: pick(r, ['轮次', '融资轮次', 'Round']),
            amount: pick(r, ['金额', '融资金额', 'Amount']),
            currency: pick(r, ['币种', 'Currency']),
            date: pick(r, ['日期', '融资日期', 'Date']),
            investors: pick(r, ['投资方', '投资机构', 'Investors']),
            source: 'pharmcube-investgo-import',
        }));
    },
});
