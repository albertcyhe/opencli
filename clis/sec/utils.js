import { CommandExecutionError, EmptyResultError } from '@jackwener/opencli/errors';

const UA = process.env.SEC_USER_AGENT || 'opencli research contact@example.com';

export function cik10(raw) {
    return String(raw ?? '').replace(/^CIK/i, '').replace(/\D/g, '').padStart(10, '0');
}

export async function secJson(url, label) {
    let resp;
    try {
        resp = await fetch(url, { headers: { accept: 'application/json', 'User-Agent': UA } });
    } catch (err) {
        throw new CommandExecutionError(`${label} request failed: ${err.message}`);
    }
    if (!resp.ok) throw new CommandExecutionError(`${label} returned HTTP ${resp.status}`);
    return resp.json();
}

export function ensure(rows, label) {
    if (!rows.length) throw new EmptyResultError(label, `${label} returned no SEC records.`);
    return rows;
}

export function filingsFromSubmission(body) {
    const recent = body?.filings?.recent ?? {};
    const forms = recent.form ?? [];
    return forms.map((form, i) => ({
        form,
        accessionNumber: recent.accessionNumber?.[i] ?? null,
        filingDate: recent.filingDate?.[i] ?? null,
        reportDate: recent.reportDate?.[i] ?? null,
        primaryDocument: recent.primaryDocument?.[i] ?? null,
        primaryDocDescription: recent.primaryDocDescription?.[i] ?? null,
    }));
}

export function filingUrl(cik, accession, doc) {
    if (!accession) return null;
    const compact = String(accession).replace(/-/g, '');
    const base = `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${compact}`;
    return doc ? `${base}/${doc}` : base;
}
