// openfda device-510k — FDA 510(k) device clearance search.
import { cli, Strategy } from '@jackwener/opencli/registry';
import { EmptyResultError, ArgumentError } from '@jackwener/opencli/errors';
import { OPENFDA_BASE, openfdaFetch, requireBoundedInt, requireString } from './utils.js';

const FIELD_MAP = {
    all: null,
    applicant: 'applicant',
    deviceName: 'device_name',
    productCode: 'product_code',
    kNumber: 'k_number',
};

function buildSearch(field, query) {
    const mapped = FIELD_MAP[field];
    if (mapped === undefined) {
        throw new ArgumentError('--field must be one of: all, applicant, deviceName, productCode, kNumber');
    }
    if (!mapped) return encodeURIComponent(query);
    return `${mapped}:${encodeURIComponent(`"${query}"`)}`;
}

function detailUrl(kNumber) {
    return kNumber
        ? `https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?id=${encodeURIComponent(kNumber)}`
        : null;
}

cli({
    site: 'openfda',
    name: 'device-510k',
    access: 'read',
    description: 'Search FDA 510(k) medical device clearances through openFDA',
    domain: 'fda.gov',
    strategy: Strategy.PUBLIC,
    browser: false,
    args: [
        { name: 'query', positional: true, required: true, help: 'Search term, company, device name, product code, or K number' },
        { name: 'field', default: 'all', choices: Object.keys(FIELD_MAP), help: 'Search field: all, applicant, deviceName, productCode, kNumber' },
        { name: 'limit', type: 'int', default: 25, help: 'Max rows (1-100, default 25)' },
    ],
    columns: [
        'rank', 'kNumber', 'applicant', 'deviceName', 'productCode',
        'decisionDate', 'decision', 'clearanceType', 'advisoryCommittee',
        'city', 'state', 'country', 'sourceUrl',
    ],
    func: async (args) => {
        const query = requireString(args.query, 'query');
        const limit = requireBoundedInt(args.limit, 25, 100);
        const field = String(args.field ?? 'all');
        const search = buildSearch(field, query);
        const url = `${OPENFDA_BASE}/device/510k.json?search=${search}&limit=${limit}`;
        const body = await openfdaFetch(url, 'openfda device-510k');
        const list = Array.isArray(body?.results) ? body.results : [];
        if (!list.length) {
            throw new EmptyResultError('openfda device-510k', `openFDA returned no 510(k) records matching "${query}".`);
        }
        return list.map((r, i) => ({
            rank: i + 1,
            kNumber: r?.k_number ?? null,
            applicant: r?.applicant ?? null,
            deviceName: r?.device_name ?? null,
            productCode: r?.product_code ?? null,
            decisionDate: r?.decision_date ?? null,
            decision: r?.decision_description ?? r?.decision_code ?? null,
            clearanceType: r?.clearance_type ?? null,
            advisoryCommittee: r?.advisory_committee_description ?? r?.advisory_committee ?? null,
            city: r?.city ?? null,
            state: r?.state ?? null,
            country: r?.country_code ?? r?.country ?? null,
            sourceUrl: detailUrl(r?.k_number),
        }));
    },
});
