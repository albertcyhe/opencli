import { createHash } from 'node:crypto';
import { ArgumentError, CommandExecutionError, EmptyResultError } from '@jackwener/opencli/errors';

export const NMPA_UDI_BASE = 'https://udi.nmpa.gov.cn';
export const NMPA_REG_BASE = 'https://app.gjzwfw.gov.cn';
const UA = 'opencli-nmpa/1.0';

export function requireQuery(value, name = 'query') {
    const query = String(value ?? '').trim();
    if (query.length < 2) {
        throw new ArgumentError(`--${name} must contain at least two characters`);
    }
    return query;
}

export function boundedInt(value, def, max, name = 'limit') {
    const n = value == null || value === '' ? def : Number(value);
    if (!Number.isInteger(n) || n < 1 || n > max) {
        throw new ArgumentError(`--${name} must be an integer between 1 and ${max}`);
    }
    return n;
}

export function cleanText(value) {
    return String(value ?? '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&#40;/g, '(')
        .replace(/&#41;/g, ')')
        .replace(/\s+/g, ' ')
        .trim();
}

export async function fetchJson(url, init, label) {
    let resp;
    try {
        resp = await fetch(url, {
            ...init,
            headers: {
                'User-Agent': UA,
                accept: 'application/json,text/html',
                ...(init?.headers ?? {}),
            },
        });
    } catch (err) {
        throw new CommandExecutionError(`${label} request failed: ${err.message}`);
    }
    if (!resp.ok) {
        throw new CommandExecutionError(`${label} returned HTTP ${resp.status}`);
    }
    const text = await resp.text();
    try {
        return JSON.parse(text);
    } catch (err) {
        throw new CommandExecutionError(`${label} returned non-JSON body`, text.slice(0, 300));
    }
}

export async function udiSearch(query, page = 1) {
    const body = new URLSearchParams({
        query,
        searchType: '1',
        page: String(page),
        rows: '15',
        sidx: '',
        sord: 'asc',
    });
    return fetchJson(`${NMPA_UDI_BASE}/getDeviceList.html`, {
        method: 'POST',
        headers: {
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'x-requested-with': 'XMLHttpRequest',
            referer: `${NMPA_UDI_BASE}/showListInterr.html`,
        },
        body,
    }, 'nmpa udi-search');
}

export async function fetchText(url, label) {
    let resp;
    try {
        resp = await fetch(url, { headers: { 'User-Agent': UA, accept: 'text/html,application/json' } });
    } catch (err) {
        throw new CommandExecutionError(`${label} request failed: ${err.message}`);
    }
    if (!resp.ok) throw new CommandExecutionError(`${label} returned HTTP ${resp.status}`);
    return resp.text();
}

export function parseDetailPairs(html) {
    const rows = [];
    const re = /<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi;
    let match;
    while ((match = re.exec(html))) {
        const label = cleanText(match[1]);
        const value = cleanText(match[2]);
        if (label || value) rows.push({ field: label.replace(/[:：]\s*$/, ''), value });
    }
    return rows;
}

export function ensureRows(rows, label, hint) {
    if (!Array.isArray(rows) || !rows.length) {
        throw new EmptyResultError(label, hint);
    }
    return rows;
}

function md5(s) {
    return createHash('md5').update(s).digest('hex');
}

async function registrationToken() {
    const appid = 'apigcylqxcpzccx';
    const requestTime = String(Date.now());
    const data = {
        from: '1',
        key: 'addfe7b3f22b4844a1ff7e97b508a9c6',
        requestTime,
        sign: md5(appid + requestTime),
    };
    const result = await fetchJson(`${NMPA_REG_BASE}/jimps/link.do`, {
        method: 'POST',
        headers: {
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            referer: `${NMPA_REG_BASE}/jmopen/webapp/html5/apigcylqxcpzccx/index.html`,
        },
        body: new URLSearchParams({ param: JSON.stringify(data) }),
    }, 'nmpa device-registration token');
    if (!result?.access_token) {
        throw new CommandExecutionError('nmpa device-registration token response did not include access_token');
    }
    return result.access_token;
}

export async function registrationSearch({ registrationNumber = '', productName = '', registrant = '' }) {
    const appid = 'apigcylqxcpzccx';
    const accessToken = await registrationToken();
    const requestTime = String(Date.now());
    const data = {
        from: '1',
        key: 'e8e399b498654521ab1957867f25b04b',
        requestTime,
        sign: md5(appid + requestTime),
        access_token: accessToken,
        zczh: registrationNumber,
        cpmc: productName,
        zcsqr: registrant,
    };
    const result = await fetchJson(`${NMPA_REG_BASE}/jimps/link.do`, {
        method: 'POST',
        headers: {
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            referer: `${NMPA_REG_BASE}/jmopen/webapp/html5/apigcylqxcpzccx/index.html`,
        },
        body: new URLSearchParams({ param: JSON.stringify(data) }),
    }, 'nmpa device-registration-search');
    if (result?.error_code) {
        throw new CommandExecutionError(
            `nmpa device-registration-search returned ${result.error_code}: ${result.reason ?? 'request rejected'}`,
            'The official domestic medical-device registration app may reject automated token flows; use NMPA UDI or manual browser verification when this happens.',
        );
    }
    return Array.isArray(result?.value) ? result.value : [];
}
