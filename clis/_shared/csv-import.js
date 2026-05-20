import fs from 'node:fs/promises';
import { ArgumentError, CommandExecutionError, EmptyResultError } from '@jackwener/opencli/errors';

export function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];
        const next = text[i + 1];
        if (quoted) {
            if (ch === '"' && next === '"') {
                cell += '"';
                i += 1;
            } else if (ch === '"') {
                quoted = false;
            } else {
                cell += ch;
            }
        } else if (ch === '"') {
            quoted = true;
        } else if (ch === ',') {
            row.push(cell);
            cell = '';
        } else if (ch === '\n') {
            row.push(cell);
            rows.push(row);
            row = [];
            cell = '';
        } else if (ch !== '\r') {
            cell += ch;
        }
    }
    if (cell || row.length) {
        row.push(cell);
        rows.push(row);
    }
    return rows.filter(r => r.some(c => String(c).trim() !== ''));
}

export async function readCsvObjects(file) {
    const path = String(file ?? '').trim();
    if (!path) throw new ArgumentError('--file is required');
    let text;
    try {
        text = await fs.readFile(path, 'utf8');
    } catch (err) {
        throw new CommandExecutionError(`Could not read CSV file ${path}: ${err.message}`);
    }
    const rows = parseCsv(text);
    if (rows.length < 2) throw new EmptyResultError('csv import', 'CSV file must contain a header row and at least one data row.');
    const headers = rows[0].map(h => String(h).trim());
    return rows.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])));
}

export function pick(obj, names) {
    for (const name of names) {
        if (obj[name] !== undefined && String(obj[name]).trim() !== '') return String(obj[name]).trim();
    }
    return null;
}
