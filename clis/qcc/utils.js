import { createHash } from 'node:crypto';
import { ConfigError, CommandExecutionError, EmptyResultError } from '@jackwener/opencli/errors';

const BASE = 'https://api.qichacha.com';

function creds() {
    const key = process.env.QCC_API_KEY;
    const secret = process.env.QCC_SECRET_KEY;
    if (!key || !secret) {
        throw new ConfigError('QCC_API_KEY and QCC_SECRET_KEY are required', 'Use a licensed Qichacha OpenAPI account, then set QCC_API_KEY and QCC_SECRET_KEY.');
    }
    return { key, secret };
}

function md5(s) {
    return createHash('md5').update(s).digest('hex').toUpperCase();
}

export async function qccFetch(path, params, label) {
    const { key, secret } = creds();
    const timespan = String(Math.floor(Date.now() / 1000));
    const url = new URL(`${BASE}${path}`);
    url.searchParams.set('key', key);
    for (const [k, v] of Object.entries(params ?? {})) {
        if (v !== undefined && v !== null && String(v) !== '') url.searchParams.set(k, String(v));
    }
    let resp;
    try {
        resp = await fetch(url, {
            headers: {
                accept: 'application/json',
                Token: md5(key + timespan + secret),
                Timespan: timespan,
                'User-Agent': 'opencli-qcc/1.0',
            },
        });
    } catch (err) {
        throw new CommandExecutionError(`${label} request failed: ${err.message}`);
    }
    if (!resp.ok) throw new CommandExecutionError(`${label} returned HTTP ${resp.status}`);
    const body = await resp.json();
    const status = String(body?.Status ?? body?.status ?? '');
    if (status && status !== '200') {
        throw new CommandExecutionError(`${label} returned status ${status}: ${body?.Message ?? body?.message ?? 'unknown error'}`);
    }
    return body;
}

export function rowsFromResult(body) {
    const result = body?.Result ?? body?.result ?? [];
    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.Data)) return result.Data;
    if (result && typeof result === 'object') return [result];
    return [];
}

export function ensure(rows, label) {
    if (!rows.length) throw new EmptyResultError(label, `${label} returned no QCC records.`);
    return rows;
}

export function companyRow(x, rank = 1) {
    return {
        rank,
        name: x?.Name ?? x?.name ?? null,
        creditCode: x?.CreditCode ?? x?.creditCode ?? null,
        operName: x?.OperName ?? x?.operName ?? null,
        status: x?.Status ?? x?.StatusDesc ?? x?.status ?? null,
        registeredCapital: x?.RegistCapi ?? x?.RegisteredCapital ?? x?.registeredCapital ?? null,
        startDate: x?.StartDate ?? x?.startDate ?? null,
        address: x?.Address ?? x?.address ?? null,
        businessScope: x?.Scope ?? x?.BusinessScope ?? x?.businessScope ?? null,
        sourceUrl: x?.KeyNo ? `https://www.qcc.com/firm/${x.KeyNo}.html` : null,
    };
}
