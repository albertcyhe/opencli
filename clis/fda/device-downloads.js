// FDA device-downloads — stable links to FDA downloadable medical-device datasets.
import { cli, Strategy } from '@jackwener/opencli/registry';

const SOURCE = 'https://www.fda.gov/medical-devices/510k-clearances/downloadable-510k-files';
const FTP = 'https://www.accessdata.fda.gov/premarket/ftparea';

const ROWS = [
    ['current-month-510k', 'Most current month', 'PMNLSTMN.ZIP', `${FTP}/PMNLSTMN.ZIP`, 'Replaced monthly, usually on the 5th'],
    ['510k-1996-current', '1996-current', 'PMN96CUR.ZIP', `${FTP}/PMN96CUR.ZIP`, 'Main historical 510(k) fixed-width file'],
    ['510k-1991-1995', '1991-1995', 'PMN9195.ZIP', `${FTP}/PMN9195.ZIP`, 'Historical 510(k) fixed-width file'],
    ['510k-1986-1990', '1986-1990', 'PMN8690.ZIP', `${FTP}/PMN8690.ZIP`, 'Historical 510(k) fixed-width file'],
    ['510k-1981-1985', '1981-1985', 'PMN8185.ZIP', `${FTP}/PMN8185.ZIP`, 'Historical 510(k) fixed-width file'],
    ['510k-1976-1980', '1976-1980', 'PMN7680.ZIP', `${FTP}/PMN7680.ZIP`, 'Historical 510(k) fixed-width file'],
];

cli({
    site: 'fda',
    name: 'device-downloads',
    access: 'read',
    description: 'List official FDA downloadable 510(k) device clearance files',
    domain: 'fda.gov',
    strategy: Strategy.PUBLIC,
    browser: false,
    args: [],
    columns: ['rank', 'dataset', 'period', 'fileName', 'format', 'url', 'sourceUrl', 'notes'],
    func: async () => ROWS.map(([dataset, period, fileName, url, notes], i) => ({
        rank: i + 1,
        dataset,
        period,
        fileName,
        format: 'zip/fixed-width',
        url,
        sourceUrl: SOURCE,
        notes,
    })),
});
