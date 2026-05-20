import { afterEach, describe, expect, it, vi } from 'vitest';
import { BrowserbaseClient, asBrowserbaseContextId } from './client.js';
import type { BrowserbaseConfig, BrowserbaseProxyRule } from './types.js';

const config: BrowserbaseConfig = {
  apiKey: 'bb-key',
  projectId: 'proj_123',
  apiBaseUrl: 'https://api.browserbase.com/v1',
};

describe('BrowserbaseClient', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('creates sessions with persistent context and proxy settings', async () => {
    vi.stubEnv('PROXY_PASS', 'secret');
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      id: 'sess_123',
      status: 'RUNNING',
      connectUrl: 'wss://connect.browserbase.example/devtools',
    })));
    const client = new BrowserbaseClient(config, fetchImpl);
    const rules: BrowserbaseProxyRule[] = [{
      type: 'external',
      server: 'http://proxy.example:8080',
      username: 'u',
      passwordRef: { kind: 'env', envName: 'PROXY_PASS' },
      domainPattern: null,
    }];

    const result = await client.createSession({
      accountName: 'account-1' as never,
      contextId: asBrowserbaseContextId('ctx_123'),
      proxyName: 'proxy-1' as never,
      region: 'us-west-2',
      keepAlive: true,
      persistContext: true,
      timeoutSeconds: 1800,
    }, rules);

    expect(result).toMatchObject({ ok: true, value: { id: 'sess_123' } });
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit | undefined];
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({ 'x-bb-api-key': 'bb-key', 'content-type': 'application/json' });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      projectId: 'proj_123',
      region: 'us-west-2',
      keepAlive: true,
      timeout: 1800,
      browserSettings: {
        context: { id: 'ctx_123', persist: true },
      },
      proxies: [{
        type: 'external',
        server: 'http://proxy.example:8080',
        username: 'u',
        password: 'secret',
      }],
    });
  });

  it('fails before calling Browserbase when a proxy password env var is missing', async () => {
    const fetchImpl = vi.fn();
    const client = new BrowserbaseClient(config, fetchImpl);

    const result = await client.createSession({
      accountName: null,
      contextId: null,
      proxyName: null,
      region: 'us-west-2',
      keepAlive: false,
      persistContext: false,
      timeoutSeconds: 60,
    }, [{
      type: 'external',
      server: 'http://proxy.example:8080',
      username: null,
      passwordRef: { kind: 'env', envName: 'MISSING_PROXY_PASS' },
      domainPattern: null,
    }]);

    expect(result).toMatchObject({ ok: false, error: { code: 'PROXY_PASSWORD_ENV_MISSING' } });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('releases sessions with REQUEST_RELEASE', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}'));
    const client = new BrowserbaseClient(config, fetchImpl);

    await expect(client.releaseSession('sess_123' as never)).resolves.toMatchObject({ ok: true });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.browserbase.com/v1/sessions/sess_123',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ status: 'REQUEST_RELEASE', projectId: 'proj_123' }),
      }),
    );
  });
});
