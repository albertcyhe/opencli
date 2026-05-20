import { ConfigError, CommandExecutionError, EmptyResultError } from '@jackwener/opencli/errors';

export const OC_BASE = 'https://api.opencorporates.com/v0.4';

export function token() {
    const value = process.env.OPENCORPORATES_API_TOKEN || process.env.OPEN_CORPORATES_API_TOKEN;
    if (!value) {
        throw new ConfigError('OPENCORPORATES_API_TOKEN is required', 'OpenCorporates currently requires an API token for API requests.');
    }
    return value.trim();
}

export async function ocFetch(path, params, label) {
    const url = new URL(`${OC_BASE}${path}`);
    for (const [k, v] of Object.entries(params ?? {})) {
        if (v !== undefined && v !== null && String(v) !== '') url.searchParams.set(k, String(v));
    }
    url.searchParams.set('api_token', token());
    let resp;
    try {
        resp = await fetch(url, { headers: { accept: 'application/json', 'User-Agent': 'opencli-opencorporates/1.0' } });
    } catch (err) {
        throw new CommandExecutionError(`${label} request failed: ${err.message}`);
    }
    if (!resp.ok) throw new CommandExecutionError(`${label} returned HTTP ${resp.status}`);
    const body = await resp.json();
    if (body?.error) throw new CommandExecutionError(`${label} returned error: ${body.error.message ?? JSON.stringify(body.error)}`);
    return body;
}

export function ensure(rows, label) {
    if (!rows.length) throw new EmptyResultError(label, `${label} returned no company records.`);
    return rows;
}

export function companyRow(company, rank = 1) {
    return {
        rank,
        name: company?.name ?? null,
        companyNumber: company?.company_number ?? null,
        jurisdictionCode: company?.jurisdiction_code ?? null,
        companyType: company?.company_type ?? null,
        status: company?.current_status ?? null,
        inactive: company?.inactive ?? null,
        incorporationDate: company?.incorporation_date ?? null,
        registeredAddress: company?.registered_address_in_full ?? company?.registered_address ?? null,
        registryUrl: company?.registry_url ?? null,
        opencorporatesUrl: company?.opencorporates_url ?? null,
    };
}
