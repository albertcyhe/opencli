import { cli, Strategy } from '@jackwener/opencli/registry';
import { boundedInt, ensureRows, NMPA_UDI_BASE, requireQuery, udiSearch } from './utils.js';

cli({
    site: 'nmpa',
    name: 'udi-search',
    access: 'read',
    description: 'Search NMPA medical device UDI records by product, company, or identifier',
    domain: 'udi.nmpa.gov.cn',
    strategy: Strategy.PUBLIC,
    browser: false,
    args: [
        { name: 'query', positional: true, required: true, help: 'Product identifier, product name, or company name' },
        { name: 'limit', type: 'int', default: 25, help: 'Max rows (1-100, default 25)' },
    ],
    columns: ['rank', 'primaryDeviceId', 'agencyName', 'companyName', 'productName', 'specification', 'deviceEndDateStatus', 'deviceRecordKey', 'detailUrl', 'sourceUrl'],
    func: async (args) => {
        const query = requireQuery(args.query);
        const limit = boundedInt(args.limit, 25, 100);
        const out = [];
        let page = 1;
        while (out.length < limit) {
            const body = await udiSearch(query, page);
            const rows = Array.isArray(body?.rows) ? body.rows : [];
            if (!rows.length) break;
            for (const row of rows) {
                out.push(row);
                if (out.length >= limit) break;
            }
            if (page >= Number(body?.total ?? page)) break;
            page += 1;
        }
        ensureRows(out, 'nmpa udi-search', `NMPA UDI returned no records for "${query}".`);
        return out.map((r, i) => ({
            rank: i + 1,
            primaryDeviceId: r?.primaryDeviceId ?? null,
            agencyName: r?.agencyName ?? null,
            companyName: r?.companyName ?? null,
            productName: r?.productName ?? null,
            specification: r?.specification ?? null,
            deviceEndDateStatus: r?.deviceEndDateStatus ?? null,
            deviceRecordKey: r?.deviceRecordKey ?? null,
            detailUrl: r?.deviceRecordKey ? `${NMPA_UDI_BASE}/showDetailCX.html?deviceRecordKey=${encodeURIComponent(r.deviceRecordKey)}` : null,
            sourceUrl: `${NMPA_UDI_BASE}/showListInterr.html`,
        }));
    },
});
