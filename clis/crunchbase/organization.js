import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError } from '@jackwener/opencli/errors';
import { cbFetch, prop } from './utils.js';

cli({
    site: 'crunchbase',
    name: 'organization',
    access: 'read',
    description: 'Read one Crunchbase organization by permalink or UUID (requires CRUNCHBASE_API_KEY)',
    domain: 'crunchbase.com',
    strategy: Strategy.PUBLIC,
    browser: false,
    args: [
        { name: 'id', positional: true, required: true, help: 'Crunchbase organization permalink or UUID' },
    ],
    columns: ['field', 'value', 'sourceUrl'],
    func: async (args) => {
        const id = String(args.id ?? '').trim();
        if (!id) throw new ArgumentError('id is required');
        const body = await cbFetch(`/entities/organizations/${encodeURIComponent(id)}`, {
            field_ids: 'identifier,short_description,website_url,location_identifiers,categories,founded_on,num_funding_rounds,funding_total',
        }, 'crunchbase organization');
        const identifier = prop(body, 'identifier');
        const permalink = identifier?.permalink ?? id;
        const sourceUrl = `https://www.crunchbase.com/organization/${permalink}`;
        return [
            { field: 'name', value: identifier?.value ?? prop(body, 'name'), sourceUrl },
            { field: 'shortDescription', value: prop(body, 'short_description'), sourceUrl },
            { field: 'websiteUrl', value: prop(body, 'website_url'), sourceUrl },
            { field: 'foundedOn', value: prop(body, 'founded_on')?.value ?? prop(body, 'founded_on'), sourceUrl },
            { field: 'numFundingRounds', value: prop(body, 'num_funding_rounds'), sourceUrl },
            { field: 'fundingTotal', value: JSON.stringify(prop(body, 'funding_total') ?? null), sourceUrl },
        ];
    },
});
