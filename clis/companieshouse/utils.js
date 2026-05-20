import { ConfigError, CommandExecutionError, EmptyResultError } from '@jackwener/opencli/errors';

const BASE = 'https://api.company-information.service.gov.uk';

function key() {
    const value = process.env.COMPANIES_HOUSE_API_KEY;
    if (!value) throw new ConfigError('COMPANIES_HOUSE_API_KEY is required', 'Create a Companies House API key and set COMPANIES_HOUSE_API_KEY.');
    return value.trim();
}

export async function chFetch(path, params, label) {
    const url = new URL(`${BASE}${path}`);
    for (const [k, v] of Object.entries(params ?? {})) {
        if (v !== undefined && v !== null && String(v) !== '') url.searchParams.set(k, String(v));
    }
    const apiKey = key();
    let resp;
    try {
        resp = await fetch(url, {
            headers: {
                accept: 'application/json',
                authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
                'User-Agent': 'opencli-companieshouse/1.0',
            },
        });
    } catch (err) {
        throw new CommandExecutionError(`${label} request failed: ${err.message}`);
    }
    if (!resp.ok) throw new CommandExecutionError(`${label} returned HTTP ${resp.status}`);
    return resp.json();
}

export function ensure(rows, label) {
    if (!rows.length) throw new EmptyResultError(label, `${label} returned no companies.`);
    return rows;
}

export function searchRow(item, rank = 1) {
    return {
        rank,
        companyName: item?.title ?? item?.company_name ?? null,
        companyNumber: item?.company_number ?? null,
        companyStatus: item?.company_status ?? null,
        companyType: item?.company_type ?? null,
        dateOfCreation: item?.date_of_creation ?? null,
        address: item?.address_snippet ?? formatAddress(item?.registered_office_address),
        url: item?.links?.self ? `https://find-and-update.company-information.service.gov.uk${item.links.self}` : null,
    };
}

export function formatAddress(addr) {
    if (!addr || typeof addr !== 'object') return null;
    return [addr.address_line_1, addr.address_line_2, addr.locality, addr.region, addr.postal_code, addr.country].filter(Boolean).join(', ') || null;
}
