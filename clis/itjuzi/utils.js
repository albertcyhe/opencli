import { ConfigError, CommandExecutionError, EmptyResultError } from '@jackwener/opencli/errors';

export function config() {
    const base = process.env.ITJUZI_API_BASE;
    const key = process.env.ITJUZI_API_KEY;
    if (!base || !key) {
        throw new ConfigError('ITJUZI_API_BASE and ITJUZI_API_KEY are required', 'IT桔子 does not expose a universal public API; configure your licensed API base URL and key.');
    }
    return { base: base.replace(/\/$/, ''), key };
}

export async function fetchLicensed(path, query, label) {
    const { base, key } = config();
    const url = new URL(`${base}${path}`);
    url.searchParams.set('query', query);
    let resp;
    try {
        resp = await fetch(url, { headers: { accept: 'application/json', authorization: `Bearer ${key}`, 'User-Agent': 'opencli-itjuzi/1.0' } });
    } catch (err) {
        throw new CommandExecutionError(`${label} request failed: ${err.message}`);
    }
    if (!resp.ok) throw new CommandExecutionError(`${label} returned HTTP ${resp.status}`);
    const body = await resp.json();
    const rows = Array.isArray(body?.data) ? body.data : Array.isArray(body?.results) ? body.results : [];
    if (!rows.length) throw new EmptyResultError(label, `${label} returned no rows.`);
    return rows;
}
