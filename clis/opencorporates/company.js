import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError } from '@jackwener/opencli/errors';
import { companyRow, ocFetch } from './utils.js';

cli({
    site: 'opencorporates',
    name: 'company',
    access: 'read',
    description: 'Read one OpenCorporates company by jurisdiction and company number',
    domain: 'opencorporates.com',
    strategy: Strategy.PUBLIC,
    browser: false,
    args: [
        { name: 'jurisdiction-code', positional: true, required: true, help: 'Jurisdiction code, e.g. gb or us_de' },
        { name: 'company-number', positional: true, required: true, help: 'Registry company number' },
    ],
    columns: ['rank', 'name', 'companyNumber', 'jurisdictionCode', 'companyType', 'status', 'inactive', 'incorporationDate', 'registeredAddress', 'registryUrl', 'opencorporatesUrl'],
    func: async (args) => {
        const jurisdiction = String(args['jurisdiction-code'] ?? '').trim();
        const number = String(args['company-number'] ?? '').trim();
        if (!jurisdiction || !number) throw new ArgumentError('jurisdiction-code and company-number are required');
        const body = await ocFetch(`/companies/${encodeURIComponent(jurisdiction)}/${encodeURIComponent(number)}`, { sparse: true }, 'opencorporates company');
        const company = body?.results?.company;
        if (!company) throw new ArgumentError(`No OpenCorporates company found for ${jurisdiction}/${number}`);
        return [companyRow(company, 1)];
    },
});
