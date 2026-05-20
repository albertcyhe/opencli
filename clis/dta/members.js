import { cli, Strategy } from '@jackwener/opencli/registry';
import { CommandExecutionError, EmptyResultError } from '@jackwener/opencli/errors';

const URL = 'https://dtxalliance.org/engage/dta-members/';

function cleanName(slug, imgUrl) {
    const fromImg = String(imgUrl ?? '').split('/').pop()?.replace(/\.(png|jpe?g|webp|svg).*$/i, '') ?? '';
    const raw = fromImg || slug;
    return raw
        .replace(/[-_](\d+x\d+|\d+|logo|Logo|RGB|Blue|Color|Vector).*$/i, '')
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

cli({
    site: 'dta',
    name: 'members',
    access: 'read',
    description: 'List Digital Therapeutics Alliance member organization pages',
    domain: 'dtxalliance.org',
    strategy: Strategy.PUBLIC,
    browser: false,
    args: [
        { name: 'limit', type: 'int', default: 200, help: 'Max rows (default 200)' },
    ],
    columns: ['rank', 'name', 'memberSlug', 'memberUrl', 'logoUrl', 'sourceUrl'],
    func: async (args) => {
        const limit = Math.max(1, Math.min(Number(args.limit) || 200, 500));
        let html;
        try {
            const resp = await fetch(URL, { headers: { 'User-Agent': 'opencli-dta-members/1.0', accept: 'text/html' } });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            html = await resp.text();
        } catch (err) {
            throw new CommandExecutionError(`dta members request failed: ${err.message}`);
        }
        const rows = [];
        const seen = new Set();
        for (const m of html.matchAll(/<a[^>]+href="(https:\/\/dtxalliance\.org\/members\/([^"/]+)\/)"[^>]*>([\s\S]*?)<\/a>/g)) {
            const memberUrl = m[1];
            const slug = m[2];
            if (seen.has(memberUrl)) continue;
            seen.add(memberUrl);
            const logoUrl = m[3].match(/data-src="([^"]+)"/)?.[1] ?? m[3].match(/src="([^"]+)"/)?.[1] ?? null;
            rows.push({ name: cleanName(slug, logoUrl), memberSlug: slug, memberUrl, logoUrl, sourceUrl: URL });
        }
        if (!rows.length) throw new EmptyResultError('dta members', 'DTA members page contained no member links.');
        return rows.slice(0, limit).map((r, i) => ({ rank: i + 1, ...r }));
    },
});
