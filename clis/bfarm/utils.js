import { ConfigError, CommandExecutionError, EmptyResultError } from '@jackwener/opencli/errors';

export const BFARM_FHIR_BASE = 'https://diga.bfarm.de/api/fhir/v3.0';
const UA = 'opencli-bfarm-diga/1.0';

export function getToken() {
    const token = process.env.BFARM_DIGA_TOKEN || process.env.BFARM_DIGA_BEARER;
    if (!token) {
        throw new ConfigError(
            'BFARM_DIGA_TOKEN is required for BfArM DiGA FHIR API access',
            'BfArM documents DiGA API access as token-gated; set BFARM_DIGA_TOKEN to a valid bearer token.',
        );
    }
    return token.replace(/^Bearer\s+/i, '').trim();
}

export async function bfarmFetch(path, label) {
    const url = path.startsWith('http') ? path : `${BFARM_FHIR_BASE}${path}`;
    const token = getToken();
    let resp;
    try {
        resp = await fetch(url, {
            headers: {
                'User-Agent': UA,
                accept: 'application/fhir+json,application/json',
                authorization: `Bearer ${token}`,
            },
        });
    } catch (err) {
        throw new CommandExecutionError(`${label} request failed: ${err.message}`);
    }
    if (resp.status === 401 || resp.status === 403) {
        throw new ConfigError(`${label} was rejected by BfArM (HTTP ${resp.status})`, 'Check BFARM_DIGA_TOKEN and API eligibility.');
    }
    if (!resp.ok) throw new CommandExecutionError(`${label} returned HTTP ${resp.status}`);
    try {
        return await resp.json();
    } catch (err) {
        throw new CommandExecutionError(`${label} returned non-JSON body: ${err.message}`);
    }
}

export function bundleResources(body) {
    const entries = Array.isArray(body?.entry) ? body.entry : [];
    return entries.map(e => e?.resource).filter(Boolean);
}

export function ensureNonEmpty(rows, label) {
    if (!rows.length) throw new EmptyResultError(label, `${label} returned no DiGA records.`);
    return rows;
}

export function firstIdentifier(resource, systemNeedle) {
    const ids = Array.isArray(resource?.identifier) ? resource.identifier : [];
    const hit = ids.find(x => String(x?.system ?? '').includes(systemNeedle));
    return hit?.value ?? ids[0]?.value ?? null;
}

export function deviceName(resource) {
    const names = Array.isArray(resource?.deviceName) ? resource.deviceName : [];
    return names.find(x => x?.name)?.name ?? resource?.name ?? resource?.title ?? null;
}

export function manufacturer(resource) {
    const owner = resource?.owner ?? resource?.manufacturerReference ?? resource?.manufacturer;
    if (typeof owner === 'string') return owner;
    return owner?.display ?? owner?.reference ?? null;
}

export function extensionText(resource, needle) {
    const exts = Array.isArray(resource?.extension) ? resource.extension : [];
    const hit = exts.find(e => String(e?.url ?? '').toLowerCase().includes(needle.toLowerCase()));
    return hit?.valueString ?? hit?.valueMarkdown ?? hit?.valueCode ?? hit?.valueCoding?.display ?? null;
}
