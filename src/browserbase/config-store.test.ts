import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  asBrowserbaseAccountName,
  asBrowserbaseProxyName,
  browserbaseStorePath,
  emptyBrowserbaseStore,
  loadBrowserbaseStore,
  redactProxyProfile,
  removeProxyProfile,
  saveBrowserbaseStore,
  upsertAccountProfile,
  upsertProxyProfile,
} from './config-store.js';

describe('browserbase config store', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('writes browserbase.json with user-only permissions', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'opencli-browserbase-'));
    vi.stubEnv('OPENCLI_CONFIG_DIR', dir);

    const result = saveBrowserbaseStore(emptyBrowserbaseStore());

    expect(result).toMatchObject({ ok: true });
    expect(fs.statSync(browserbaseStorePath()).mode & 0o777).toBe(0o600);
    expect(loadBrowserbaseStore()).toMatchObject({ ok: true, value: { version: 1 } });
  });

  it('redacts plaintext proxy passwords in output helpers', () => {
    const proxy = {
      name: asBrowserbaseProxyName('dc1'),
      updatedAtIso: '2026-01-01T00:00:00.000Z',
      rules: [{
        type: 'external' as const,
        server: 'http://proxy.example:8080',
        username: 'user',
        passwordRef: { kind: 'plain' as const, value: 'secret' },
        domainPattern: null,
      }],
    };

    expect(redactProxyProfile(proxy).rules[0]).toMatchObject({
      passwordRef: { kind: 'plain', value: '[REDACTED]' },
    });
  });

  it('rejects deleting an in-use proxy unless forced', () => {
    let store = emptyBrowserbaseStore();
    store = upsertProxyProfile(store, {
      name: asBrowserbaseProxyName('us-ny'),
      updatedAtIso: '2026-01-01T00:00:00.000Z',
      rules: [{ type: 'browserbase', geolocation: null, domainPattern: null }],
    });
    store = upsertAccountProfile(store, {
      name: asBrowserbaseAccountName('x-main-1'),
      site: 'x',
      contextId: 'ctx_123' as never,
      defaultProxyName: asBrowserbaseProxyName('us-ny'),
      loginState: 'ready',
      lastLoginAtIso: null,
      lastCheckedAtIso: null,
    });

    expect(removeProxyProfile(store, asBrowserbaseProxyName('us-ny'))).toMatchObject({
      ok: false,
      error: { code: 'PROXY_IN_USE' },
    });
    expect(removeProxyProfile(store, asBrowserbaseProxyName('us-ny'), { force: true })).toMatchObject({
      ok: true,
      value: {
        proxies: {},
        accounts: {
          'x-main-1': { defaultProxyName: null },
        },
      },
    });
  });
});
