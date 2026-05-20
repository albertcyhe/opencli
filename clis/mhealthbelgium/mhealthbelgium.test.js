import { describe, expect, it, vi } from 'vitest';
import { getRegistry } from '@jackwener/opencli/registry';
import { ArgumentError, EmptyResultError } from '@jackwener/opencli/errors';
import './app-list.js';
import './app-detail.js';

describe('mhealthbelgium app-list', () => {
    const cmd = getRegistry().get('mhealthbelgium/app-list');

    it('returns rendered app rows from the browser page', async () => {
        const page = {
            goto: vi.fn(),
            wait: vi.fn(),
            evaluate: vi.fn().mockResolvedValue([
                { name: 'Example App', level: 'Level 3', description: 'Example App Level 3 remote monitoring', url: 'https://mhealthbelgium.be/apps/example' },
            ]),
        };

        const rows = await cmd.func(page, { limit: 1 });
        expect(page.goto).toHaveBeenCalledWith('https://mhealthbelgium.be/apps');
        expect(rows).toEqual([{
            rank: 1,
            name: 'Example App',
            level: 'Level 3',
            description: 'Example App Level 3 remote monitoring',
            url: 'https://mhealthbelgium.be/apps/example',
        }]);
    });

    it('uses EmptyResultError for empty rendered pages', async () => {
        const page = { goto: vi.fn(), wait: vi.fn(), evaluate: vi.fn().mockResolvedValue([]) };
        await expect(cmd.func(page, { limit: 1 })).rejects.toThrow(EmptyResultError);
    });
});

describe('mhealthbelgium app-detail', () => {
    const cmd = getRegistry().get('mhealthbelgium/app-detail');

    it('rejects non-mHealthBELGIUM URLs before navigation', async () => {
        const page = { goto: vi.fn(), wait: vi.fn(), evaluate: vi.fn() };
        await expect(cmd.func(page, { url: 'https://example.com/app' })).rejects.toThrow(ArgumentError);
        expect(page.goto).not.toHaveBeenCalled();
    });

    it('returns browser-extracted field/value rows', async () => {
        const page = {
            goto: vi.fn(),
            wait: vi.fn(),
            evaluate: vi.fn().mockResolvedValue([
                { field: 'title', value: 'Example App', sourceUrl: 'https://mhealthbelgium.be/apps/example' },
            ]),
        };

        const rows = await cmd.func(page, { url: 'https://mhealthbelgium.be/apps/example' });
        expect(rows).toEqual([
            { field: 'title', value: 'Example App', sourceUrl: 'https://mhealthbelgium.be/apps/example' },
        ]);
    });
});
