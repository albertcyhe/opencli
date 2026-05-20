import { cli, Strategy } from '@jackwener/opencli/registry';
import { ensureRows, fetchNice, parseCards } from './utils.js';

cli({
    site: 'nice',
    name: 'digital-health-list',
    access: 'read',
    description: 'List NICE products on the digital health topic',
    domain: 'nice.org.uk',
    strategy: Strategy.PUBLIC,
    browser: false,
    args: [
        { name: 'status', default: 'Published', help: 'NICE status query value, e.g. Published or InDevelopment' },
        { name: 'limit', type: 'int', default: 75, help: 'Max rows (1-200, default 75)' },
    ],
    columns: ['rank', 'code', 'title', 'metadata', 'publishedDate', 'updatedDate', 'url'],
    func: async (args) => {
        const status = encodeURIComponent(String(args.status ?? 'Published'));
        const limit = Math.max(1, Math.min(Number(args.limit) || 75, 200));
        const html = await fetchNice(`/guidance/health-and-social-care-delivery/digital-health/products?Status=${status}`, 'nice digital-health-list');
        const cards = ensureRows(parseCards(html), 'nice digital-health-list');
        return cards.slice(0, limit).map((r, i) => ({ rank: i + 1, ...r }));
    },
});
