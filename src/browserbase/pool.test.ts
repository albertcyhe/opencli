import { describe, expect, it, vi } from 'vitest';
import { BrowserbaseAccountSessionPool } from './pool.js';
import type { BrowserbaseClient } from './client.js';
import type { BrowserbaseStore } from './types.js';

const store: BrowserbaseStore = {
  version: 1,
  accounts: {
    'x-main-1': {
      name: 'x-main-1' as never,
      site: 'x',
      contextId: 'ctx_123' as never,
      defaultProxyName: null,
      loginState: 'ready',
      lastLoginAtIso: null,
      lastCheckedAtIso: null,
    },
  },
  proxies: {},
};

describe('BrowserbaseAccountSessionPool', () => {
  it('creates exclusive leases and releases non-keepalive sessions', async () => {
    const createSession = vi.fn(async () => ({
      ok: true as const,
      value: {
        id: 'sess_123' as never,
        status: 'RUNNING' as const,
        connectUrl: 'wss://connect.browserbase.example/devtools',
        contextId: 'ctx_123' as never,
        projectId: 'proj_123',
        createdAtIso: null,
        updatedAtIso: null,
        startedAtIso: null,
        expiresAtIso: null,
        endedAtIso: null,
        keepAlive: false,
        region: 'us-west-2' as const,
        proxyBytes: null,
      },
    }));
    const releaseSession = vi.fn(async () => ({ ok: true as const, value: undefined }));
    const client = { createSession, releaseSession } as unknown as BrowserbaseClient;
    const pool = new BrowserbaseAccountSessionPool(client, { store, maxSessions: 1, waitIntervalMs: 1 });

    const lease = await pool.acquire({
      accountName: 'x-main-1' as never,
      keepAlive: false,
      persistContext: true,
      timeoutSeconds: 1800,
      region: 'us-west-2',
    });

    expect(lease).toMatchObject({ ok: true, value: { sessionId: 'sess_123', accountName: 'x-main-1' } });
    expect(createSession).toHaveBeenCalledWith(expect.objectContaining({
      accountName: 'x-main-1',
      contextId: 'ctx_123',
      persistContext: true,
    }), []);
    if (!lease.ok) throw new Error('expected lease');
    await expect(pool.release(lease.value, { status: 'success' })).resolves.toMatchObject({ ok: true });
    expect(releaseSession).toHaveBeenCalledWith('sess_123');
  });

  it('reports missing accounts without creating sessions', async () => {
    const client = {
      createSession: vi.fn(),
      releaseSession: vi.fn(),
    } as unknown as BrowserbaseClient;
    const pool = new BrowserbaseAccountSessionPool(client, { store, maxSessions: 1 });

    await expect(pool.acquire({
      accountName: 'missing' as never,
      keepAlive: false,
      persistContext: true,
      timeoutSeconds: 1800,
      region: 'us-west-2',
    })).resolves.toMatchObject({ ok: false, error: { code: 'ACCOUNT_NOT_FOUND' } });
  });
});
