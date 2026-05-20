import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRegistry } from '@jackwener/opencli/registry';
import { EmptyResultError } from '@jackwener/opencli/errors';
import './members.js';

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('dta members', () => {
    const cmd = getRegistry().get('dta/members');

    it('parses member organization links and logo URLs', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(`
            <a href="https://dtxalliance.org/members/akili-interactive/">
              <img data-src="https://dtxalliance.org/wp-content/uploads/akili-interactive-logo.png" />
            </a>
            <a href="https://dtxalliance.org/members/akili-interactive/">Duplicate</a>
        `, { status: 200 })));

        const rows = await cmd.func({ limit: 10 });
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            rank: 1,
            name: 'akili interactive',
            memberSlug: 'akili-interactive',
            memberUrl: 'https://dtxalliance.org/members/akili-interactive/',
            logoUrl: 'https://dtxalliance.org/wp-content/uploads/akili-interactive-logo.png',
        });
    });

    it('throws EmptyResultError when the members page has no member links', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<main></main>', { status: 200 })));
        await expect(cmd.func({ limit: 1 })).rejects.toThrow(EmptyResultError);
    });
});
