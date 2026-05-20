import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError, EmptyResultError } from '@jackwener/opencli/errors';
import { boundedInt, registrationSearch } from './utils.js';

cli({
    site: 'nmpa',
    name: 'device-registration-search',
    access: 'read',
    description: 'Search NMPA domestic medical device registration records via the official government-service endpoint',
    domain: 'app.gjzwfw.gov.cn',
    strategy: Strategy.PUBLIC,
    browser: false,
    args: [
        { name: 'product-name', help: 'Product name / 产品名称' },
        { name: 'registrant', help: 'Registrant name / 注册人名称' },
        { name: 'registration-number', help: 'Registration certificate number / 注册证编号' },
        { name: 'limit', type: 'int', default: 25, help: 'Max rows (1-100, default 25)' },
    ],
    columns: ['rank', 'registrationNumber', 'registrant', 'registeredAddress', 'manufacturingAddress', 'productName', 'productClass', 'model', 'intendedUse', 'approvalDate', 'expiryDate', 'attachmentUrl', 'sourceUrl'],
    func: async (args) => {
        const productName = String(args['product-name'] ?? '').trim();
        const registrant = String(args.registrant ?? '').trim();
        const registrationNumber = String(args['registration-number'] ?? '').trim();
        if (!productName && !registrant && !registrationNumber) {
            throw new ArgumentError('Pass at least one of --product-name, --registrant, or --registration-number');
        }
        const limit = boundedInt(args.limit, 25, 100);
        const rows = await registrationSearch({ productName, registrant, registrationNumber });
        if (!rows.length) {
            throw new EmptyResultError('nmpa device-registration-search', 'NMPA returned no domestic medical-device registration records for the supplied filters.');
        }
        return rows.slice(0, limit).map((r, i) => ({
            rank: i + 1,
            registrationNumber: r?.zczh ?? null,
            registrant: r?.zcsqr ?? null,
            registeredAddress: r?.sczdz ?? null,
            manufacturingAddress: r?.scdz ?? null,
            productName: r?.cpmc ?? null,
            productClass: r?.cplb ?? null,
            model: r?.ggxh ?? null,
            intendedUse: r?.cpsyfw ?? null,
            approvalDate: r?.pzrq ?? null,
            expiryDate: r?.pzyxq ?? null,
            attachmentUrl: r?.fj ?? null,
            sourceUrl: 'https://app.gjzwfw.gov.cn/jmopen/webapp/html5/apigcylqxcpzccx/index.html',
        }));
    },
});
