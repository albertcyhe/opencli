import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError } from '@jackwener/opencli/errors';
import { cleanHtml, fetchNice, NICE_BASE } from './utils.js';

cli({
    site: 'nice',
    name: 'digital-health-detail',
    access: 'read',
    description: 'Read basic metadata from one NICE guidance page',
    domain: 'nice.org.uk',
    strategy: Strategy.PUBLIC,
    browser: false,
    args: [
        { name: 'code-or-url', positional: true, required: true, help: 'Guidance code such as htg778, or a full NICE guidance URL' },
    ],
    columns: ['field', 'value', 'sourceUrl'],
    func: async (args) => {
        const raw = String(args['code-or-url'] ?? '').trim();
        if (!raw) throw new ArgumentError('code-or-url is required');
        const sourceUrl = raw.startsWith('http') ? raw : `${NICE_BASE}/guidance/${encodeURIComponent(raw)}`;
        const html = await fetchNice(sourceUrl, 'nice digital-health-detail');
        const title = cleanHtml(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '');
        const description = cleanHtml(html.match(/<meta name="Description" content="([^"]+)"/i)?.[1] ?? '');
        const published = html.match(/Published[\s\S]*?<time[^>]+dateTime="([^"]+)"/i)?.[1] ?? null;
        const updated = html.match(/Last updated[\s\S]*?<time[^>]+dateTime="([^"]+)"/i)?.[1] ?? null;
        return [
            { field: 'title', value: title, sourceUrl },
            { field: 'description', value: description, sourceUrl },
            { field: 'publishedDate', value: published, sourceUrl },
            { field: 'updatedDate', value: updated, sourceUrl },
        ];
    },
});
