import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError } from '@jackwener/opencli/errors';
import { fetchText, NMPA_UDI_BASE, parseDetailPairs } from './utils.js';

cli({
    site: 'nmpa',
    name: 'udi-detail',
    access: 'read',
    description: 'Read one NMPA UDI detail page by deviceRecordKey',
    domain: 'udi.nmpa.gov.cn',
    strategy: Strategy.PUBLIC,
    browser: false,
    args: [
        { name: 'deviceRecordKey', positional: true, required: true, help: 'deviceRecordKey from nmpa udi-search' },
    ],
    columns: ['field', 'value', 'sourceUrl'],
    func: async (args) => {
        const key = String(args.deviceRecordKey ?? '').trim();
        if (!key) throw new ArgumentError('deviceRecordKey is required');
        const sourceUrl = `${NMPA_UDI_BASE}/showDetailCX.html?deviceRecordKey=${encodeURIComponent(key)}`;
        const html = await fetchText(sourceUrl, 'nmpa udi-detail');
        const rows = parseDetailPairs(html).filter(r => r.field || r.value);
        if (!rows.length) throw new ArgumentError('NMPA UDI detail page did not contain parseable field rows');
        return rows.map(r => ({ ...r, sourceUrl }));
    },
});
