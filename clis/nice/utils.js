import { CommandExecutionError, EmptyResultError } from '@jackwener/opencli/errors';

export const NICE_BASE = 'https://www.nice.org.uk';
const UA = 'opencli-nice-digital-health/1.0';

export async function fetchNice(path, label) {
    const url = path.startsWith('http') ? path : `${NICE_BASE}${path}`;
    let resp;
    try {
        resp = await fetch(url, { headers: { 'User-Agent': UA, accept: 'text/html' } });
    } catch (err) {
        throw new CommandExecutionError(`${label} request failed: ${err.message}`);
    }
    if (!resp.ok) throw new CommandExecutionError(`${label} returned HTTP ${resp.status}`);
    return resp.text();
}

export function cleanHtml(html) {
    return String(html ?? '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();
}

export function parseCards(html) {
    const cards = [...html.matchAll(/<article class="card">([\s\S]*?)<\/article>/g)];
    return cards.map((m) => {
        const block = m[1];
        const link = block.match(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
        const code = block.match(/<data value="([^"]+)"/)?.[1] ?? null;
        const times = [...block.matchAll(/<time[^>]+dateTime="([^"]+)"[^>]*>([\s\S]*?)<\/time>/g)];
        const meta = cleanHtml(block.match(/<dl class="card__metadata">([\s\S]*?)<\/dl>/)?.[1] ?? '');
        return {
            code,
            title: cleanHtml(link?.[2] ?? ''),
            url: link?.[1] ? `${NICE_BASE}${link[1]}` : null,
            metadata: meta,
            publishedDate: times.at(-1)?.[1] ?? null,
            updatedDate: times.length > 1 ? times[0]?.[1] : null,
        };
    }).filter(r => r.title && r.url);
}

export function ensureRows(rows, label) {
    if (!rows.length) throw new EmptyResultError(label, `${label} returned no NICE products.`);
    return rows;
}
