import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { getRegistry } from '@jackwener/opencli/registry';
import '../pitchbook/import.js';
import '../pharmcube/investgo-import.js';
import './merge-evidence.js';

const tempFiles = [];

async function tempFile(name, text) {
    const file = path.join(os.tmpdir(), `opencli-${Date.now()}-${Math.random().toString(16).slice(2)}-${name}`);
    tempFiles.push(file);
    await fs.writeFile(file, text, 'utf8');
    return file;
}

afterEach(async () => {
    await Promise.all(tempFiles.splice(0).map(file => fs.rm(file, { force: true, recursive: true })));
});

describe('pitchbook import', () => {
    const cmd = getRegistry().get('pitchbook/import');

    it('normalizes licensed PitchBook CSV exports', async () => {
        const file = await tempFile('pitchbook.csv', [
            'Company Name,Description,HQ Location,Website,Last Financing Type,Last Financing Date,Last Financing Size,Investors',
            'Akili Interactive,Digital therapeutics,Boston MA,https://akili.example,Series D,2021-05-01,$110M,Example Ventures',
        ].join('\n'));

        const rows = await cmd.func({ file, limit: 1 });
        expect(rows[0]).toMatchObject({
            companyName: 'Akili Interactive',
            description: 'Digital therapeutics',
            hqLocation: 'Boston MA',
            financingStatus: 'Series D',
            lastFinancingSize: '$110M',
            source: 'pitchbook-import',
        });
    });
});

describe('pharmcube investgo-import', () => {
    const cmd = getRegistry().get('pharmcube/investgo-import');

    it('normalizes licensed PharmCube InvestGO CSV exports', async () => {
        const file = await tempFile('pharmcube.csv', [
            '企业名称,产品,业务范围,轮次,金额,币种,日期,投资方',
            '上海示例健康科技有限公司,数字疗法软件,慢病管理,A轮,数千万,CNY,2025-01-01,示例资本',
        ].join('\n'));

        const rows = await cmd.func({ file, limit: 1 });
        expect(rows[0]).toMatchObject({
            companyName: '上海示例健康科技有限公司',
            productOrPipeline: '数字疗法软件',
            businessScope: '慢病管理',
            round: 'A轮',
            amount: '数千万',
            source: 'pharmcube-investgo-import',
        });
    });
});

describe('mobile-health merge-evidence', () => {
    const cmd = getRegistry().get('mobile-health/merge-evidence');

    it('deduplicates company evidence into companies_master rows', async () => {
        const file = await tempFile('evidence.json', JSON.stringify([
            { companyName: 'Akili Interactive', productName: 'EndeavorRx', country: 'US', sourceUrl: 'https://fda.example/k123' },
            { companyName: 'Akili Interactive', round: 'Series D', amount: '$110M', sourceUrl: 'https://funding.example/round' },
        ]));

        const rows = await cmd.func({ input: file, table: 'companies' });
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            table: 'companies_master',
            companyName: 'Akili Interactive',
            jurisdiction: 'US',
            evidenceCount: 2,
        });
        expect(rows[0].confidence).toBeGreaterThan(0.6);
    });

    it('emits product and financing logical tables from mixed evidence', async () => {
        const file = await tempFile('evidence.json', JSON.stringify([
            { companyName: 'Akili Interactive', productName: 'EndeavorRx', sourceUrl: 'https://fda.example/k123' },
            { companyName: 'Akili Interactive', round: 'Series D', amount: '$110M', sourceUrl: 'https://funding.example/round' },
        ]));

        const products = await cmd.func({ input: file, table: 'products' });
        const financing = await cmd.func({ input: file, table: 'financing' });
        expect(products).toEqual([expect.objectContaining({ table: 'products', productName: 'EndeavorRx' })]);
        expect(financing).toEqual([expect.objectContaining({ table: 'financing_events', round: 'Series D', amount: '$110M' })]);
    });
});
