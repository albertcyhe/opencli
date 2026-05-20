import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRegistry } from '@jackwener/opencli/registry';
import { ArgumentError, EmptyResultError } from '@jackwener/opencli/errors';
import './udi-search.js';
import './udi-detail.js';
import './device-registration-search.js';

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('nmpa udi-search', () => {
    const cmd = getRegistry().get('nmpa/udi-search');

    it('rejects one-character queries before fetching', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        await expect(cmd.func({ query: '软' })).rejects.toThrow(ArgumentError);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('maps UDI search rows into stable product/company fields', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
            total: 1,
            rows: [{
                primaryDeviceId: '06975215901517',
                agencyName: 'GS1',
                companyName: '深圳星康医疗科技有限公司',
                productName: '动态心电分析软件',
                specification: 'aECGMap',
                deviceRecordKey: 'abc123',
            }],
        }), { status: 200 })));

        const rows = await cmd.func({ query: '软件', limit: 1 });
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            rank: 1,
            primaryDeviceId: '06975215901517',
            companyName: '深圳星康医疗科技有限公司',
            productName: '动态心电分析软件',
            detailUrl: 'https://udi.nmpa.gov.cn/showDetailCX.html?deviceRecordKey=abc123',
        });
    });
});

describe('nmpa udi-detail', () => {
    const cmd = getRegistry().get('nmpa/udi-detail');

    it('parses same-row th/td detail pairs', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(`
            <table>
              <tr><th><a>产品名称：</a></th><td>动态心电分析软件</td></tr>
              <tr><th><a>注册人名称：</a></th><td>深圳星康医疗科技有限公司</td></tr>
            </table>
        `, { status: 200 })));

        const rows = await cmd.func({ deviceRecordKey: 'abc123' });
        expect(rows).toEqual([
            { field: '产品名称', value: '动态心电分析软件', sourceUrl: 'https://udi.nmpa.gov.cn/showDetailCX.html?deviceRecordKey=abc123' },
            { field: '注册人名称', value: '深圳星康医疗科技有限公司', sourceUrl: 'https://udi.nmpa.gov.cn/showDetailCX.html?deviceRecordKey=abc123' },
        ]);
    });
});

describe('nmpa device-registration-search', () => {
    const cmd = getRegistry().get('nmpa/device-registration-search');

    it('requires at least one official registration search filter', async () => {
        await expect(cmd.func({})).rejects.toThrow(ArgumentError);
    });

    it('maps domestic registration records after token exchange', async () => {
        vi.stubGlobal('fetch', vi.fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'token-1' }), { status: 200 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({ value: [{
                zczh: '国械注准20243210001',
                zcsqr: '示例医疗科技有限公司',
                cpmc: '认知训练软件',
                cplb: '第二类',
                cpsyfw: '用于辅助认知功能训练',
                pzrq: '2024-01-01',
            }] }), { status: 200 })));

        const rows = await cmd.func({ 'product-name': '认知训练软件', limit: 1 });
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            registrationNumber: '国械注准20243210001',
            registrant: '示例医疗科技有限公司',
            productName: '认知训练软件',
            intendedUse: '用于辅助认知功能训练',
        });
    });

    it('returns EmptyResultError when the government endpoint has no rows', async () => {
        vi.stubGlobal('fetch', vi.fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'token-1' }), { status: 200 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({ value: [] }), { status: 200 })));

        await expect(cmd.func({ registrant: '无结果公司' })).rejects.toThrow(EmptyResultError);
    });
});
