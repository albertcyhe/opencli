import { cli, Strategy } from '@jackwener/opencli/registry';
import { bfarmFetch, bundleResources, deviceName, ensureNonEmpty, extensionText, firstIdentifier, manufacturer } from './utils.js';

cli({
    site: 'bfarm',
    name: 'diga-list',
    access: 'read',
    description: 'List BfArM DiGA FHIR DeviceDefinition records (requires BFARM_DIGA_TOKEN)',
    domain: 'diga.bfarm.de',
    strategy: Strategy.PUBLIC,
    browser: false,
    args: [
        { name: 'limit', type: 'int', default: 100, help: 'Max rows requested with _count (default 100)' },
    ],
    columns: ['rank', 'fhirId', 'digaId', 'name', 'manufacturer', 'status', 'indication', 'sourceUrl'],
    func: async (args) => {
        const limit = Math.max(1, Math.min(Number(args.limit) || 100, 500));
        const profile = encodeURIComponent('https://fhir.bfarm.de/StructureDefinition/HealthApp');
        const body = await bfarmFetch(`/DeviceDefinition?_profile=${profile}&_count=${limit}`, 'bfarm diga-list');
        const resources = ensureNonEmpty(bundleResources(body), 'bfarm diga-list');
        return resources.map((r, i) => {
            const digaId = firstIdentifier(r, 'DigaId');
            return {
                rank: i + 1,
                fhirId: r?.id ?? null,
                digaId,
                name: deviceName(r),
                manufacturer: manufacturer(r),
                status: r?.status ?? null,
                indication: extensionText(r, 'Indikation') ?? extensionText(r, 'Anwendungsgebiet'),
                sourceUrl: digaId ? `https://diga.bfarm.de/de/verzeichnis?search=${encodeURIComponent(digaId)}` : 'https://diga.bfarm.de/de/verzeichnis',
            };
        });
    },
});
