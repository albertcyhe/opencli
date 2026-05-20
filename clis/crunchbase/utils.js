import { ConfigError, CommandExecutionError, EmptyResultError } from '@jackwener/opencli/errors';

const BASE = 'https://api.crunchbase.com/api/v4';

function key() {
    const value = process.env.CRUNCHBASE_API_KEY;
    if (!value) {
        throw new ConfigError('CRUNCHBASE_API_KEY is required', 'Use an approved Crunchbase API key or import licensed exports instead.');
    }
    return value.trim();
}

export async function cbFetch(path, params, label) {
    const url = new URL(`${BASE}${path}`);
    for (const [k, v] of Object.entries(params ?? {})) {
        if (v !== undefined && v !== null && String(v) !== '') url.searchParams.set(k, String(v));
    }
    const apiKey = key();
    let resp;
    try {
        resp = await fetch(url, { headers: { accept: 'application/json', 'X-cb-user-key': apiKey, 'User-Agent': 'opencli-crunchbase/1.0' } });
    } catch (err) {
        throw new CommandExecutionError(`${label} request failed: ${err.message}`);
    }
    if (!resp.ok) throw new CommandExecutionError(`${label} returned HTTP ${resp.status}`);
    return resp.json();
}

export function prop(body, keyName) {
    return body?.properties?.[keyName] ?? body?.cards?.fields?.[keyName] ?? body?.[keyName] ?? null;
}

export function ensure(rows, label) {
    if (!rows.length) throw new EmptyResultError(label, `${label} returned no Crunchbase records.`);
    return rows;
}

export function money(x) {
    if (!x) return null;
    if (typeof x === 'string') return x;
    const value = x.value_usd ?? x.value ?? x.amount_usd ?? x.amount;
    const currency = x.currency ?? x.currency_code ?? 'USD';
    return value == null ? null : `${value} ${currency}`;
}
