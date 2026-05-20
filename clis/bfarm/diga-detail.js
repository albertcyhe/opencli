import { cli, Strategy } from '@jackwener/opencli/registry';
import { ArgumentError } from '@jackwener/opencli/errors';
import { bfarmFetch, bundleResources, deviceName, extensionText, firstIdentifier, manufacturer } from './utils.js';

function flatten(resource) {
    const digaId = firstIdentifier(resource, 'DigaId');
    return [
        ['fhirId', resource?.id ?? null],
        ['digaId', digaId],
        ['name', deviceName(resource)],
        ['manufacturer', manufacturer(resource)],
        ['status', resource?.status ?? null],
        ['version', resource?.version?.value ?? resource?.version ?? null],
        ['indication', extensionText(resource, 'Indikation') ?? extensionText(resource, 'Anwendungsgebiet')],
        ['description', resource?.description ?? null],
        ['sourceUrl', digaId ? `https://diga.bfarm.de/de/verzeichnis?search=${encodeURIComponent(digaId)}` : 'https://diga.bfarm.de/de/verzeichnis'],
    ].map(([field, value]) => ({ field, value }));
}

cli({
    site: 'bfarm',
    name: 'diga-detail',
    access: 'read',
    description: 'Read one BfArM DiGA DeviceDefinition by FHIR id or DiGA id (requires BFARM_DIGA_TOKEN)',
    domain: 'diga.bfarm.de',
    strategy: Strategy.PUBLIC,
    browser: false,
    args: [
        { name: 'id', positional: true, required: true, help: 'FHIR id or 5-digit DiGA id' },
    ],
    columns: ['field', 'value'],
    func: async (args) => {
        const id = String(args.id ?? '').trim();
        if (!id) throw new ArgumentError('id is required');
        const path = /^\d{5}$/.test(id)
            ? `/DeviceDefinition?identifier=${encodeURIComponent(`https://fhir.bfarm.de/Identifier/DigaId|${id}`)}`
            : `/DeviceDefinition/${encodeURIComponent(id)}`;
        const body = await bfarmFetch(path, 'bfarm diga-detail');
        const resource = body?.resourceType === 'Bundle' ? bundleResources(body)[0] : body;
        if (!resource) throw new ArgumentError(`No DiGA detail found for ${id}`);
        return flatten(resource);
    },
});
