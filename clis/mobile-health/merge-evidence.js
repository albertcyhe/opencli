import fs from 'node:fs/promises';
import path from 'node:path';
import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError, CommandExecutionError, EmptyResultError } from '@jackwener/opencli/errors';
import { parseCsv, pick } from '../_shared/csv-import.js';

const COMPANY_KEYS = ['companyName', 'company', 'applicant', 'manufacturer', 'registrant', 'recallingFirm', 'name', 'title', 'labelerName', '企业名称', '公司名称', '注册人名称'];
const PRODUCT_KEYS = ['productName', 'deviceName', 'brandName', 'productOrPipeline', 'title', '产品名称', '产品名称/通用名称'];
const CAPITAL_KEYS = ['registeredCapital', 'registered_capital', 'RegistCapi', '注册资本'];
const BUSINESS_KEYS = ['businessScope', 'description', 'shortDescription', '业务范围', '简介'];

async function listInputFiles(raw) {
    const target = String(raw ?? '').trim();
    if (!target) throw new ArgumentError('--input is required');
    const stat = await fs.stat(target).catch(err => {
        throw new CommandExecutionError(`Cannot access ${target}: ${err.message}`);
    });
    if (stat.isDirectory()) {
        const names = await fs.readdir(target);
        return names
            .filter(n => /\.(json|csv)$/i.test(n))
            .map(n => path.join(target, n));
    }
    return [target];
}

function rowsFromJson(value) {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.rows)) return value.rows;
    if (Array.isArray(value?.results)) return value.results;
    if (Array.isArray(value?.data)) return value.data;
    return [];
}

async function readRows(file) {
    const text = await fs.readFile(file, 'utf8');
    if (/\.csv$/i.test(file)) {
        const rows = parseCsv(text);
        const headers = rows[0] ?? [];
        return rows.slice(1).map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])));
    }
    const parsed = JSON.parse(text);
    return rowsFromJson(parsed);
}

function normalizeCompanyName(row) {
    const company = pick(row, COMPANY_KEYS);
    if (!company) return null;
    return company.replace(/\s+/g, ' ').trim();
}

function evidenceSource(row, file) {
    return row.sourceUrl ?? row.url ?? row.memberUrl ?? row.opencorporatesUrl ?? row.registryUrl ?? file;
}

function makeEvidenceRow(row, file, index) {
    const companyName = normalizeCompanyName(row);
    return {
        table: 'source_evidence',
        companyName,
        jurisdiction: row.jurisdictionCode ?? row.country ?? row.state ?? null,
        city: row.city ?? null,
        registeredCapital: pick(row, CAPITAL_KEYS),
        businessScope: pick(row, BUSINESS_KEYS),
        productName: pick(row, PRODUCT_KEYS),
        round: row.round ?? row.roundName ?? row.investmentType ?? null,
        amount: row.amount ?? row.moneyRaised ?? row.lastFinancingSize ?? null,
        sourceType: path.basename(file).replace(/\.(json|csv)$/i, ''),
        sourceUrl: evidenceSource(row, file),
        confidence: companyName ? 0.55 : 0.25,
        evidenceCount: 1,
        rowIndex: index + 1,
    };
}

function companyRows(evidence) {
    const byName = new Map();
    for (const e of evidence) {
        if (!e.companyName) continue;
        const key = e.companyName.toLowerCase();
        const current = byName.get(key) ?? { ...e, table: 'companies_master', evidenceCount: 0, confidence: 0 };
        current.evidenceCount += 1;
        current.confidence = Math.min(0.95, Math.max(current.confidence, 0.45 + current.evidenceCount * 0.1));
        current.registeredCapital ||= e.registeredCapital;
        current.businessScope ||= e.businessScope;
        current.jurisdiction ||= e.jurisdiction;
        current.city ||= e.city;
        current.sourceUrl ||= e.sourceUrl;
        byName.set(key, current);
    }
    return [...byName.values()];
}

function productRows(evidence) {
    return evidence
        .filter(e => e.companyName && e.productName)
        .map(e => ({ ...e, table: 'products', evidenceCount: 1, confidence: Math.max(e.confidence, 0.6) }));
}

function financingRows(evidence) {
    return evidence
        .filter(e => e.companyName && (e.round || e.amount))
        .map(e => ({ ...e, table: 'financing_events', evidenceCount: 1, confidence: Math.max(e.confidence, 0.6) }));
}

cli({
    site: 'mobile-health',
    name: 'merge-evidence',
    access: 'read',
    description: 'Merge OpenCLI research exports into normalized mobile-health company evidence tables',
    strategy: Strategy.LOCAL,
    browser: false,
    args: [
        { name: 'input', positional: true, required: true, help: 'JSON/CSV file or directory of OpenCLI exports' },
        { name: 'table', default: 'companies', choices: ['companies', 'products', 'financing', 'evidence'], help: 'Output logical table' },
        { name: 'limit', type: 'int', default: 1000, help: 'Max rows (default 1000)' },
    ],
    columns: ['table', 'companyName', 'jurisdiction', 'city', 'registeredCapital', 'businessScope', 'productName', 'round', 'amount', 'sourceType', 'sourceUrl', 'confidence', 'evidenceCount'],
    func: async (args) => {
        const files = await listInputFiles(args.input);
        const evidence = [];
        for (const file of files) {
            const rows = await readRows(file).catch(err => {
                throw new CommandExecutionError(`Could not parse ${file}: ${err.message}`);
            });
            rows.forEach((row, i) => evidence.push(makeEvidenceRow(row, file, i)));
        }
        if (!evidence.length) throw new EmptyResultError('mobile-health merge-evidence', 'No JSON/CSV rows were found.');
        const table = String(args.table ?? 'companies');
        const limit = Math.max(1, Math.min(Number(args.limit) || 1000, 10000));
        const rows = table === 'products'
            ? productRows(evidence)
            : table === 'financing'
                ? financingRows(evidence)
                : table === 'evidence'
                    ? evidence
                    : companyRows(evidence);
        return rows.slice(0, limit).map(({ rowIndex, ...r }) => r);
    },
});
