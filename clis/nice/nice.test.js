import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRegistry } from '@jackwener/opencli/registry';
import { EmptyResultError } from '@jackwener/opencli/errors';
import './digital-health-list.js';
import './digital-health-detail.js';

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('nice digital-health-list', () => {
    const cmd = getRegistry().get('nice/digital-health-list');

    it('parses published digital-health product cards', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(`
            <article class="card">
              <a href="/guidance/htg778">Digital technologies to support self-management of asthma</a>
              <data value="HTG778"></data>
              <dl class="card__metadata">Product type: Guidance Programme: HealthTech guidance</dl>
              <time dateTime="2026-04-30">30 April 2026</time>
              <time dateTime="2026-05-05">5 May 2026</time>
            </article>
        `, { status: 200 })));

        const rows = await cmd.func({ limit: 1 });
        expect(rows).toEqual([{
            rank: 1,
            code: 'HTG778',
            title: 'Digital technologies to support self-management of asthma',
            url: 'https://www.nice.org.uk/guidance/htg778',
            metadata: 'Product type: Guidance Programme: HealthTech guidance',
            publishedDate: '2026-05-05',
            updatedDate: '2026-04-30',
        }]);
    });

    it('throws EmptyResultError when NICE markup has no product cards', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<main></main>', { status: 200 })));
        await expect(cmd.func({ limit: 1 })).rejects.toThrow(EmptyResultError);
    });
});

describe('nice digital-health-detail', () => {
    const cmd = getRegistry().get('nice/digital-health-detail');

    it('extracts title, description, and dates from one guidance page', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(`
            <html>
              <head><meta name="Description" content="Guidance on digital asthma self-management."></head>
              <body>
                <h1>Digital asthma products</h1>
                <p>Published <time dateTime="2026-05-05">5 May 2026</time></p>
                <p>Last updated <time dateTime="2026-05-06">6 May 2026</time></p>
              </body>
            </html>
        `, { status: 200 })));

        const rows = await cmd.func({ 'code-or-url': 'htg778' });
        expect(rows).toContainEqual({
            field: 'title',
            value: 'Digital asthma products',
            sourceUrl: 'https://www.nice.org.uk/guidance/htg778',
        });
        expect(rows).toContainEqual({
            field: 'description',
            value: 'Guidance on digital asthma self-management.',
            sourceUrl: 'https://www.nice.org.uk/guidance/htg778',
        });
    });
});
