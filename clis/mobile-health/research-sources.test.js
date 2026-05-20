import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRegistry } from '@jackwener/opencli/registry';
import '../opencorporates/search.js';
import '../opencorporates/company.js';
import '../companieshouse/search.js';
import '../companieshouse/company.js';
import '../sec/company.js';
import '../sec/filings.js';
import '../sec/form-d.js';
import '../qcc/search.js';
import '../qcc/baseinfo.js';
import '../crunchbase/organization.js';
import '../crunchbase/funding-rounds.js';
import '../itjuzi/company.js';
import '../itjuzi/financing.js';

afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

describe('opencorporates company adapters', () => {
    it('maps search result companies with registry links', async () => {
        vi.stubEnv('OPENCORPORATES_API_TOKEN', 'token-1');
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
            results: {
                companies: [{ company: {
                    name: 'AKILI INTERACTIVE LABS, INC.',
                    company_number: '1234567',
                    jurisdiction_code: 'us_de',
                    current_status: 'Active',
                    opencorporates_url: 'https://opencorporates.com/companies/us_de/1234567',
                } }],
            },
        }), { status: 200 })));

        const rows = await getRegistry().get('opencorporates/search').func({ query: 'akili', limit: 1 });
        expect(rows).toEqual([expect.objectContaining({
            rank: 1,
            name: 'AKILI INTERACTIVE LABS, INC.',
            companyNumber: '1234567',
            jurisdictionCode: 'us_de',
            status: 'Active',
        })]);
    });

    it('maps one OpenCorporates company profile', async () => {
        vi.stubEnv('OPENCORPORATES_API_TOKEN', 'token-1');
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
            results: { company: {
                name: 'Big Health Inc.',
                company_number: '7654321',
                jurisdiction_code: 'us_ca',
                company_type: 'Stock Corporation',
                incorporation_date: '2010-01-01',
            } },
        }), { status: 200 })));

        const rows = await getRegistry().get('opencorporates/company').func({ 'jurisdiction-code': 'us_ca', 'company-number': '7654321' });
        expect(rows[0]).toMatchObject({
            name: 'Big Health Inc.',
            companyNumber: '7654321',
            companyType: 'Stock Corporation',
            incorporationDate: '2010-01-01',
        });
    });
});

describe('companieshouse company adapters', () => {
    it('maps UK company search results', async () => {
        vi.stubEnv('COMPANIES_HOUSE_API_KEY', 'key-1');
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
            items: [{
                title: 'SLEEPIO LIMITED',
                company_number: '07123456',
                company_status: 'active',
                company_type: 'ltd',
                links: { self: '/company/07123456' },
            }],
        }), { status: 200 })));

        const rows = await getRegistry().get('companieshouse/search').func({ query: 'sleepio', limit: 1 });
        expect(rows[0]).toMatchObject({
            companyName: 'SLEEPIO LIMITED',
            companyNumber: '07123456',
            companyStatus: 'active',
            url: 'https://find-and-update.company-information.service.gov.uk/company/07123456',
        });
    });

    it('maps one UK company profile into field/value rows', async () => {
        vi.stubEnv('COMPANIES_HOUSE_API_KEY', 'key-1');
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
            company_name: 'SLEEPIO LIMITED',
            company_number: '07123456',
            company_status: 'active',
            type: 'ltd',
            date_of_creation: '2010-02-03',
            registered_office_address: { address_line_1: '1 Street', locality: 'London', postal_code: 'SW1A 1AA' },
            sic_codes: ['62012'],
        }), { status: 200 })));

        const rows = await getRegistry().get('companieshouse/company').func({ 'company-number': '07123456' });
        expect(rows).toContainEqual(expect.objectContaining({ field: 'companyName', value: 'SLEEPIO LIMITED' }));
        expect(rows).toContainEqual(expect.objectContaining({ field: 'sicCodes', value: '62012' }));
    });
});

describe('sec company and filings adapters', () => {
    const submissions = {
        filings: {
            recent: {
                form: ['D', '10-K'],
                accessionNumber: ['0001234567-24-000001', '0001234567-24-000002'],
                filingDate: ['2024-01-15', '2024-02-20'],
                reportDate: ['2024-01-01', '2023-12-31'],
                primaryDocument: ['primary.xml', 'form10k.htm'],
                primaryDocDescription: ['Form D', 'Annual report'],
            },
        },
    };

    it('searches the SEC ticker index by company name', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
            0: { cik_str: 1234567, ticker: 'AKLI', title: 'AKILI, INC.' },
        }), { status: 200 })));

        const rows = await getRegistry().get('sec/company').func({ query: 'akili', limit: 1 });
        expect(rows[0]).toMatchObject({
            cik: '0001234567',
            ticker: 'AKLI',
            title: 'AKILI, INC.',
            sourceUrl: 'https://www.sec.gov/edgar/browse/?CIK=1234567',
        });
    });

    it('filters recent filings by requested form', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(submissions), { status: 200 })));

        const rows = await getRegistry().get('sec/filings').func({ cik: '1234567', form: 'D', limit: 1 });
        expect(rows).toEqual([expect.objectContaining({
            form: 'D',
            accessionNumber: '0001234567-24-000001',
            sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1234567/000123456724000001/primary.xml',
        })]);
    });

    it('returns recent Form D filings through the shortcut adapter', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(submissions), { status: 200 })));

        const rows = await getRegistry().get('sec/form-d').func({ cik: '1234567', limit: 5 });
        expect(rows).toHaveLength(1);
        expect(rows[0].form).toBe('D');
    });
});

describe('qcc company adapters', () => {
    it('maps Qichacha fuzzy search rows', async () => {
        vi.stubEnv('QCC_API_KEY', 'key-1');
        vi.stubEnv('QCC_SECRET_KEY', 'secret-1');
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
            Status: '200',
            Result: [{
                Name: '深圳星康医疗科技有限公司',
                CreditCode: '91440300EXAMPLE',
                RegistCapi: '1000万元人民币',
                Scope: '医疗软件研发',
                KeyNo: 'abc',
            }],
        }), { status: 200 })));

        const rows = await getRegistry().get('qcc/search').func({ query: '星康医疗', limit: 1 });
        expect(rows[0]).toMatchObject({
            name: '深圳星康医疗科技有限公司',
            creditCode: '91440300EXAMPLE',
            registeredCapital: '1000万元人民币',
            businessScope: '医疗软件研发',
            sourceUrl: 'https://www.qcc.com/firm/abc.html',
        });
    });

    it('maps Qichacha baseinfo object responses', async () => {
        vi.stubEnv('QCC_API_KEY', 'key-1');
        vi.stubEnv('QCC_SECRET_KEY', 'secret-1');
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
            Status: '200',
            Result: {
                Name: '杭州示例健康科技有限公司',
                OperName: '张三',
                RegisteredCapital: '500万元人民币',
                BusinessScope: '数字疗法软件开发',
            },
        }), { status: 200 })));

        const rows = await getRegistry().get('qcc/baseinfo').func({ keyword: '杭州示例健康科技有限公司' });
        expect(rows[0]).toMatchObject({
            name: '杭州示例健康科技有限公司',
            operName: '张三',
            registeredCapital: '500万元人民币',
            businessScope: '数字疗法软件开发',
        });
    });
});

describe('crunchbase organization adapters', () => {
    it('maps Crunchbase organization fields', async () => {
        vi.stubEnv('CRUNCHBASE_API_KEY', 'key-1');
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
            properties: {
                identifier: { value: 'Akili', permalink: 'akili-interactive' },
                short_description: 'Digital therapeutics company',
                website_url: 'https://www.akiliinteractive.com',
                founded_on: { value: '2011-01-01' },
                num_funding_rounds: 5,
                funding_total: { value_usd: 100000000, currency: 'USD' },
            },
        }), { status: 200 })));

        const rows = await getRegistry().get('crunchbase/organization').func({ id: 'akili-interactive' });
        expect(rows).toContainEqual(expect.objectContaining({
            field: 'name',
            value: 'Akili',
            sourceUrl: 'https://www.crunchbase.com/organization/akili-interactive',
        }));
        expect(rows).toContainEqual(expect.objectContaining({ field: 'numFundingRounds', value: 5 }));
    });

    it('maps Crunchbase funding rounds', async () => {
        vi.stubEnv('CRUNCHBASE_API_KEY', 'key-1');
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
            cards: {
                raised_funding_rounds: [{
                    properties: {
                        identifier: { value: 'Series B', permalink: 'akili-series-b' },
                        announced_on: { value: '2024-01-01' },
                        investment_type: 'series_b',
                        money_raised: { value_usd: 10000000, currency: 'USD' },
                        lead_investor_identifiers: [{ value: 'Example Ventures' }],
                    },
                }],
            },
        }), { status: 200 })));

        const rows = await getRegistry().get('crunchbase/funding-rounds').func({ id: 'akili-interactive', limit: 1 });
        expect(rows[0]).toMatchObject({
            roundName: 'Series B',
            announcedOn: '2024-01-01',
            investmentType: 'series_b',
            moneyRaised: '10000000 USD',
            leadInvestors: 'Example Ventures',
        });
    });
});

describe('itjuzi licensed adapters', () => {
    it('maps licensed IT桔子 company rows', async () => {
        vi.stubEnv('ITJUZI_API_BASE', 'https://licensed.example.test');
        vi.stubEnv('ITJUZI_API_KEY', 'key-1');
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
            data: [{ companyName: '杭州示例健康科技有限公司', description: '慢病管理平台', city: '杭州', industry: '医疗健康' }],
        }), { status: 200 })));

        const rows = await getRegistry().get('itjuzi/company').func({ query: '慢病管理', limit: 1 });
        expect(rows[0]).toMatchObject({
            companyName: '杭州示例健康科技有限公司',
            description: '慢病管理平台',
            city: '杭州',
            industry: '医疗健康',
            source: 'itjuzi-api',
        });
    });

    it('maps licensed IT桔子 financing rows', async () => {
        vi.stubEnv('ITJUZI_API_BASE', 'https://licensed.example.test');
        vi.stubEnv('ITJUZI_API_KEY', 'key-1');
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
            results: [{ companyName: '成都示例健康科技有限公司', round: 'A轮', amount: '数千万人民币', investors: ['示例资本'] }],
        }), { status: 200 })));

        const rows = await getRegistry().get('itjuzi/financing').func({ query: '数字疗法', limit: 1 });
        expect(rows[0]).toMatchObject({
            companyName: '成都示例健康科技有限公司',
            round: 'A轮',
            amount: '数千万人民币',
            investors: '示例资本',
            source: 'itjuzi-api',
        });
    });
});
