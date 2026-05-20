import { describe, expect, it } from 'vitest';
import { getRegistry } from '@jackwener/opencli/registry';
import './device-downloads.js';

describe('fda device-downloads', () => {
    const cmd = getRegistry().get('fda/device-downloads');

    it('lists stable official FDA 510(k) downloadable datasets', async () => {
        const rows = await cmd.func({});
        expect(rows.length).toBeGreaterThan(3);
        expect(rows[0]).toMatchObject({
            rank: 1,
            dataset: 'current-month-510k',
            format: 'zip/fixed-width',
            sourceUrl: 'https://www.fda.gov/medical-devices/510k-clearances/downloadable-510k-files',
        });
        expect(rows.map(r => r.url)).toContain('https://www.accessdata.fda.gov/premarket/ftparea/PMN96CUR.ZIP');
    });
});
