import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRegistry } from '@jackwener/opencli/registry';
import { ConfigError, EmptyResultError } from '@jackwener/opencli/errors';
import './diga-list.js';
import './diga-detail.js';

const sampleDevice = {
    resourceType: 'DeviceDefinition',
    id: 'device-1',
    identifier: [{ system: 'https://fhir.bfarm.de/Identifier/DigaId', value: '12345' }],
    deviceName: [{ name: 'Example DiGA' }],
    owner: { display: 'Example Health GmbH' },
    status: 'active',
    extension: [{ url: 'https://fhir.bfarm.de/StructureDefinition/Indikation', valueString: 'Depression' }],
    description: 'Digital health application for testing.',
};

afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

describe('bfarm diga-list', () => {
    const cmd = getRegistry().get('bfarm/diga-list');

    it('requires a BfArM API token before fetching', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        await expect(cmd.func({ limit: 1 })).rejects.toThrow(ConfigError);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('maps FHIR DeviceDefinition bundle entries', async () => {
        vi.stubEnv('BFARM_DIGA_TOKEN', 'token-1');
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
            resourceType: 'Bundle',
            entry: [{ resource: sampleDevice }],
        }), { status: 200 })));

        const rows = await cmd.func({ limit: 1 });
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            fhirId: 'device-1',
            digaId: '12345',
            name: 'Example DiGA',
            manufacturer: 'Example Health GmbH',
            indication: 'Depression',
        });
    });

    it('promotes empty FHIR bundles to EmptyResultError', async () => {
        vi.stubEnv('BFARM_DIGA_TOKEN', 'token-1');
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
            resourceType: 'Bundle',
            entry: [],
        }), { status: 200 })));

        await expect(cmd.func({ limit: 1 })).rejects.toThrow(EmptyResultError);
    });
});

describe('bfarm diga-detail', () => {
    const cmd = getRegistry().get('bfarm/diga-detail');

    it('returns field/value detail rows for a DiGA id lookup', async () => {
        vi.stubEnv('BFARM_DIGA_TOKEN', 'token-1');
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
            resourceType: 'Bundle',
            entry: [{ resource: sampleDevice }],
        }), { status: 200 })));

        const rows = await cmd.func({ id: '12345' });
        expect(rows).toContainEqual({ field: 'name', value: 'Example DiGA' });
        expect(rows).toContainEqual({ field: 'manufacturer', value: 'Example Health GmbH' });
        expect(rows).toContainEqual({ field: 'indication', value: 'Depression' });
    });
});
