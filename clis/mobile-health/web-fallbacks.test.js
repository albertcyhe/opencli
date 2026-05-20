import { describe, expect, it, vi } from 'vitest';
import { getRegistry } from '@jackwener/opencli/registry';
import { AuthRequiredError, EmptyResultError } from '@jackwener/opencli/errors';
import '../bfarm/diga-web-list.js';
import '../bfarm/diga-web-detail.js';
import '../opencorporates/web-search.js';
import '../opencorporates/web-company.js';
import '../companieshouse/web-search.js';
import '../companieshouse/web-company.js';
import '../crunchbase/web-search.js';
import '../crunchbase/web-organization.js';
import '../crunchbase/web-funding-rounds.js';
import '../qcc/web-search.js';
import '../qcc/web-baseinfo.js';
import '../itjuzi/web-search.js';
import '../itjuzi/web-company.js';

function pageReturning(value) {
    return {
        goto: vi.fn(),
        wait: vi.fn(),
        evaluate: vi.fn().mockResolvedValue(value),
    };
}

describe('browser fallback adapters for API-key sources', () => {
    it('bfarm diga-web-list ranks rendered public directory rows', async () => {
        const page = pageReturning([
            { name: 'Example DiGA', manufacturer: 'Example GmbH', indication: 'Depression', status: 'listed', url: 'https://diga.bfarm.de/de/verzeichnis/example' },
        ]);

        const rows = await getRegistry().get('bfarm/diga-web-list').func(page, { query: 'depression', limit: 1 });
        expect(page.goto).toHaveBeenCalledWith('https://diga.bfarm.de/de/verzeichnis?search=depression');
        expect(rows).toEqual([expect.objectContaining({
            rank: 1,
            name: 'Example DiGA',
            sourceUrl: 'https://diga.bfarm.de/de/verzeichnis',
        })]);
    });

    it('bfarm diga-web-detail reads visible field/value rows', async () => {
        const page = pageReturning([{ field: 'title', value: 'Example DiGA', sourceUrl: 'https://diga.bfarm.de/de/verzeichnis/example' }]);

        const rows = await getRegistry().get('bfarm/diga-web-detail').func(page, { 'url-or-query': '12345' });
        expect(page.goto).toHaveBeenCalledWith('https://diga.bfarm.de/de/verzeichnis?search=12345');
        expect(rows[0]).toMatchObject({ field: 'title', value: 'Example DiGA' });
    });

    it('opencorporates web-search maps public search rows', async () => {
        const page = pageReturning([
            { name: 'AKILI INTERACTIVE LABS, INC.', companyNumber: '1234567', jurisdictionCode: 'us_de', status: 'Active', address: '', url: 'https://opencorporates.com/companies/us_de/1234567' },
        ]);

        const rows = await getRegistry().get('opencorporates/web-search').func(page, { query: 'akili', limit: 1 });
        expect(rows[0]).toMatchObject({
            rank: 1,
            name: 'AKILI INTERACTIVE LABS, INC.',
            companyNumber: '1234567',
            jurisdictionCode: 'us_de',
        });
    });

    it('opencorporates web-company resolves jurisdiction plus company number', async () => {
        const page = pageReturning([{ field: 'name', value: 'Big Health Inc.', sourceUrl: 'https://opencorporates.com/companies/us_ca/7654321' }]);

        const rows = await getRegistry().get('opencorporates/web-company').func(page, {
            'jurisdiction-code': 'us_ca',
            'company-number-or-url': '7654321',
        });
        expect(page.goto).toHaveBeenCalledWith('https://opencorporates.com/companies/us_ca/7654321');
        expect(rows[0]).toMatchObject({ field: 'name', value: 'Big Health Inc.' });
    });

    it('companieshouse web-search maps public Companies House rows', async () => {
        const page = pageReturning([
            { companyName: 'SLEEPIO LIMITED', companyNumber: '07123456', companyStatus: 'active', address: 'London', url: 'https://find-and-update.company-information.service.gov.uk/company/07123456' },
        ]);

        const rows = await getRegistry().get('companieshouse/web-search').func(page, { query: 'sleepio', limit: 1 });
        expect(rows[0]).toMatchObject({
            rank: 1,
            companyName: 'SLEEPIO LIMITED',
            companyNumber: '07123456',
            companyStatus: 'active',
        });
    });

    it('companieshouse web-company resolves company numbers to public URLs', async () => {
        const page = pageReturning([{ field: 'Company status', value: 'Active', sourceUrl: 'https://find-and-update.company-information.service.gov.uk/company/07123456' }]);

        const rows = await getRegistry().get('companieshouse/web-company').func(page, { 'company-number-or-url': '07123456' });
        expect(page.goto).toHaveBeenCalledWith('https://find-and-update.company-information.service.gov.uk/company/07123456');
        expect(rows[0]).toMatchObject({ field: 'Company status', value: 'Active' });
    });

    it('crunchbase web-search returns visible organization links', async () => {
        const page = pageReturning({ rows: [{ name: 'Akili', url: 'https://www.crunchbase.com/organization/akili-interactive', description: 'Digital therapeutics' }] });

        const rows = await getRegistry().get('crunchbase/web-search').func(page, { query: 'akili', limit: 1 });
        expect(rows[0]).toMatchObject({
            rank: 1,
            name: 'Akili',
            url: 'https://www.crunchbase.com/organization/akili-interactive',
        });
    });

    it('crunchbase browser adapters stop on gated pages', async () => {
        const page = pageReturning({ blocked: true });

        await expect(getRegistry().get('crunchbase/web-organization').func(page, { 'slug-or-url': 'akili-interactive' }))
            .rejects.toThrow(AuthRequiredError);
    });

    it('crunchbase web-funding-rounds maps visible funding rows', async () => {
        const page = pageReturning({ rows: [{ roundName: 'Series D', announcedOn: '2021-05-01', investmentType: 'Series D', moneyRaised: '$110M', leadInvestors: '', sourceUrl: 'https://www.crunchbase.com/organization/akili-interactive/company_financials' }] });

        const rows = await getRegistry().get('crunchbase/web-funding-rounds').func(page, { 'slug-or-url': 'akili-interactive', limit: 1 });
        expect(page.goto).toHaveBeenCalledWith('https://www.crunchbase.com/organization/akili-interactive/company_financials');
        expect(rows[0]).toMatchObject({ rank: 1, roundName: 'Series D', moneyRaised: '$110M' });
    });

    it('qcc web-search returns visible company rows from a normal browser session', async () => {
        const page = pageReturning({ rows: [{ name: '深圳星康医疗科技有限公司', creditCode: '91440300MA5DLQTM8C', legalRepresentative: '张三', registeredCapital: '1000万元人民币', status: '存续', address: '深圳市', url: 'https://www.qcc.com/firm/abc.html' }] });

        const rows = await getRegistry().get('qcc/web-search').func(page, { query: '星康医疗', limit: 1 });
        expect(rows[0]).toMatchObject({
            rank: 1,
            name: '深圳星康医疗科技有限公司',
            registeredCapital: '1000万元人民币',
        });
    });

    it('qcc web-baseinfo stops on verification-gated pages', async () => {
        const page = pageReturning({ blocked: true });

        await expect(getRegistry().get('qcc/web-baseinfo').func(page, { 'firm-url': 'abc' }))
            .rejects.toThrow(AuthRequiredError);
    });

    it('itjuzi web-search maps visible company rows', async () => {
        const page = pageReturning({ rows: [{ companyName: '杭州示例健康科技有限公司', description: '慢病管理平台', city: '杭州', industry: '医疗健康', website: '', url: 'https://www.itjuzi.com/company/1' }] });

        const rows = await getRegistry().get('itjuzi/web-search').func(page, { query: '慢病管理', limit: 1 });
        expect(rows[0]).toMatchObject({
            rank: 1,
            companyName: '杭州示例健康科技有限公司',
            city: '杭州',
            industry: '医疗健康',
        });
    });

    it('itjuzi web-company returns visible field/value rows and stops on empty pages', async () => {
        const okPage = pageReturning({ rows: [{ field: 'companyName', value: '成都示例健康科技有限公司', sourceUrl: 'https://www.itjuzi.com/company/2' }] });
        const rows = await getRegistry().get('itjuzi/web-company').func(okPage, { 'company-url': '2' });
        expect(rows[0]).toMatchObject({ field: 'companyName', value: '成都示例健康科技有限公司' });

        const emptyPage = pageReturning({ rows: [] });
        await expect(getRegistry().get('itjuzi/web-company').func(emptyPage, { 'company-url': '2' }))
            .rejects.toThrow(EmptyResultError);
    });
});
