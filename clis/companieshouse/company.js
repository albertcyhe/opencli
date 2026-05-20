import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError } from '@jackwener/opencli/errors';
import { chFetch, formatAddress } from './utils.js';

cli({
    site: 'companieshouse',
    name: 'company',
    access: 'read',
    description: 'Read one UK Companies House company profile',
    domain: 'company-information.service.gov.uk',
    strategy: Strategy.PUBLIC,
    browser: false,
    args: [
        { name: 'company-number', positional: true, required: true, help: 'UK company number' },
    ],
    columns: ['field', 'value', 'sourceUrl'],
    func: async (args) => {
        const number = String(args['company-number'] ?? '').trim();
        if (!number) throw new ArgumentError('company-number is required');
        const body = await chFetch(`/company/${encodeURIComponent(number)}`, {}, 'companieshouse company');
        const sourceUrl = `https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(number)}`;
        return [
            { field: 'companyName', value: body?.company_name ?? null, sourceUrl },
            { field: 'companyNumber', value: body?.company_number ?? null, sourceUrl },
            { field: 'companyStatus', value: body?.company_status ?? null, sourceUrl },
            { field: 'companyType', value: body?.type ?? null, sourceUrl },
            { field: 'dateOfCreation', value: body?.date_of_creation ?? null, sourceUrl },
            { field: 'registeredOfficeAddress', value: formatAddress(body?.registered_office_address), sourceUrl },
            { field: 'sicCodes', value: Array.isArray(body?.sic_codes) ? body.sic_codes.join(', ') : null, sourceUrl },
        ];
    },
});
