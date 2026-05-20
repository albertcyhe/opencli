import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError } from '@jackwener/opencli/errors';
import { cbFetch, ensure, money } from './utils.js';

function normalizeRound(x, rank, organizationId) {
    const p = x?.properties ?? x;
    const identifier = p?.identifier ?? x?.identifier ?? {};
    const permalink = identifier?.permalink ?? p?.permalink ?? null;
    return {
        rank,
        roundName: identifier?.value ?? p?.name ?? p?.funding_type ?? null,
        announcedOn: p?.announced_on?.value ?? p?.announced_on ?? null,
        investmentType: p?.investment_type ?? p?.funding_type ?? null,
        moneyRaised: money(p?.money_raised ?? p?.money_raised_usd),
        leadInvestors: Array.isArray(p?.lead_investor_identifiers) ? p.lead_investor_identifiers.map(i => i.value).join(', ') : null,
        sourceUrl: permalink ? `https://www.crunchbase.com/funding_round/${permalink}` : `https://www.crunchbase.com/organization/${organizationId}/company_financials`,
    };
}

cli({
    site: 'crunchbase',
    name: 'funding-rounds',
    access: 'read',
    description: 'Read Crunchbase funding rounds for one organization (requires CRUNCHBASE_API_KEY)',
    domain: 'crunchbase.com',
    strategy: Strategy.PUBLIC,
    browser: false,
    args: [
        { name: 'id', positional: true, required: true, help: 'Crunchbase organization permalink or UUID' },
        { name: 'limit', type: 'int', default: 25, help: 'Max rows (default 25)' },
    ],
    columns: ['rank', 'roundName', 'announcedOn', 'investmentType', 'moneyRaised', 'leadInvestors', 'sourceUrl'],
    func: async (args) => {
        const id = String(args.id ?? '').trim();
        if (!id) throw new ArgumentError('id is required');
        const limit = Math.max(1, Math.min(Number(args.limit) || 25, 100));
        const body = await cbFetch(`/entities/organizations/${encodeURIComponent(id)}`, {
            card_ids: 'raised_funding_rounds',
            field_ids: 'identifier',
        }, 'crunchbase funding-rounds');
        const rows = body?.cards?.raised_funding_rounds ?? body?.cards?.funding_rounds ?? [];
        ensure(Array.isArray(rows) ? rows : [], 'crunchbase funding-rounds');
        return rows.slice(0, limit).map((x, i) => normalizeRound(x, i + 1, id));
    },
});
