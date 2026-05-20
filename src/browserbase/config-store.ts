import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { isRecord } from '../utils.js';
import {
  type BrowserbaseAccountName,
  type BrowserbaseAccountProfile,
  type BrowserbaseConfigError,
  type BrowserbaseContextId,
  type BrowserbaseProxyName,
  type BrowserbaseProxyProfile,
  type BrowserbaseProxyRule,
  type BrowserbaseStore,
  type LoginState,
  type ProxyPasswordRef,
  type Result,
  err,
  ok,
} from './types.js';

const STORE_VERSION = 1;
const VALID_LOGIN_STATES = new Set<LoginState>(['empty', 'login-session-open', 'ready', 'invalidated', 'deleted']);

export function asBrowserbaseAccountName(value: string): BrowserbaseAccountName {
  return value as BrowserbaseAccountName;
}

export function asBrowserbaseProxyName(value: string): BrowserbaseProxyName {
  return value as BrowserbaseProxyName;
}

export function browserbaseStorePath(): string {
  const baseDir = process.env.OPENCLI_CONFIG_DIR || path.join(os.homedir(), '.opencli');
  return path.join(baseDir, 'browserbase.json');
}

export function emptyBrowserbaseStore(): BrowserbaseStore {
  return { version: STORE_VERSION, accounts: {}, proxies: {} };
}

function configError(code: BrowserbaseConfigError['code'], message: string, hint?: string): BrowserbaseConfigError {
  return { code, message, ...(hint ? { hint } : {}) };
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function parsePasswordRef(value: unknown): ProxyPasswordRef | null {
  if (!isRecord(value)) return null;
  if (value.kind === 'env') {
    const envName = nonEmptyString(value.envName);
    return envName ? { kind: 'env', envName } : null;
  }
  if (value.kind === 'plain') {
    const plain = typeof value.value === 'string' ? value.value : null;
    return plain !== null ? { kind: 'plain', value: plain } : null;
  }
  return null;
}

function parseProxyRule(value: unknown): BrowserbaseProxyRule | null {
  if (!isRecord(value)) return null;
  if (value.type === 'none') {
    const domainPattern = nonEmptyString(value.domainPattern);
    return domainPattern ? { type: 'none', domainPattern } : null;
  }
  if (value.type === 'browserbase') {
    const geo = isRecord(value.geolocation)
      ? {
        country: stringOrNull(value.geolocation.country),
        state: stringOrNull(value.geolocation.state),
        city: stringOrNull(value.geolocation.city),
      }
      : null;
    return {
      type: 'browserbase',
      geolocation: geo,
      domainPattern: stringOrNull(value.domainPattern),
    };
  }
  if (value.type === 'external') {
    const server = nonEmptyString(value.server);
    if (!server) return null;
    return {
      type: 'external',
      server,
      username: stringOrNull(value.username),
      passwordRef: parsePasswordRef(value.passwordRef),
      domainPattern: stringOrNull(value.domainPattern),
    };
  }
  return null;
}

function parseProxyProfile(name: string, value: unknown): BrowserbaseProxyProfile | null {
  if (!isRecord(value)) return null;
  const rawRules = Array.isArray(value.rules) ? value.rules : [];
  const rules = rawRules.map(parseProxyRule).filter((rule): rule is BrowserbaseProxyRule => rule !== null);
  if (rules.length === 0) return null;
  return {
    name: asBrowserbaseProxyName(nonEmptyString(value.name) ?? name),
    rules,
    updatedAtIso: nonEmptyString(value.updatedAtIso) ?? new Date(0).toISOString(),
  };
}

function parseAccountProfile(name: string, value: unknown): BrowserbaseAccountProfile | null {
  if (!isRecord(value)) return null;
  const rawName = nonEmptyString(value.name) ?? name;
  const site = nonEmptyString(value.site);
  const contextId = nonEmptyString(value.contextId);
  if (!site || !contextId) return null;
  const loginState = typeof value.loginState === 'string' && VALID_LOGIN_STATES.has(value.loginState as LoginState)
    ? value.loginState as LoginState
    : 'empty';
  return {
    name: asBrowserbaseAccountName(rawName),
    site,
    contextId: contextId as BrowserbaseContextId,
    defaultProxyName: typeof value.defaultProxyName === 'string' && value.defaultProxyName.trim()
      ? asBrowserbaseProxyName(value.defaultProxyName.trim())
      : null,
    loginState,
    lastLoginAtIso: stringOrNull(value.lastLoginAtIso),
    lastCheckedAtIso: stringOrNull(value.lastCheckedAtIso),
  };
}

export function loadBrowserbaseStore(): Result<BrowserbaseStore, BrowserbaseConfigError> {
  const target = browserbaseStorePath();
  try {
    if (!fs.existsSync(target)) return ok(emptyBrowserbaseStore());
    const parsed = JSON.parse(fs.readFileSync(target, 'utf-8')) as unknown;
    if (!isRecord(parsed)) return err(configError('INVALID_CONFIG', `${target} must contain a JSON object.`));
    const accounts: Record<string, BrowserbaseAccountProfile> = {};
    const rawAccounts = isRecord(parsed.accounts) ? parsed.accounts : {};
    for (const [name, value] of Object.entries(rawAccounts)) {
      const account = parseAccountProfile(name, value);
      if (account) accounts[account.name] = account;
    }
    const proxies: Record<string, BrowserbaseProxyProfile> = {};
    const rawProxies = isRecord(parsed.proxies) ? parsed.proxies : {};
    for (const [name, value] of Object.entries(rawProxies)) {
      const proxy = parseProxyProfile(name, value);
      if (proxy) proxies[proxy.name] = proxy;
    }
    const defaultAccountName = nonEmptyString(parsed.defaultAccountName);
    return ok({
      version: STORE_VERSION,
      accounts,
      proxies,
      ...(defaultAccountName ? { defaultAccountName: asBrowserbaseAccountName(defaultAccountName) } : {}),
    });
  } catch (error) {
    return err(configError('CONFIG_READ_FAILED', `Could not read ${target}: ${error instanceof Error ? error.message : String(error)}`));
  }
}

export function saveBrowserbaseStore(store: BrowserbaseStore): Result<void, BrowserbaseConfigError> {
  const target = browserbaseStorePath();
  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify(store, null, 2) + '\n', { encoding: 'utf-8', mode: 0o600 });
    fs.chmodSync(target, 0o600);
    return ok(undefined);
  } catch (error) {
    return err(configError('CONFIG_WRITE_FAILED', `Could not write ${target}: ${error instanceof Error ? error.message : String(error)}`));
  }
}

export function upsertAccountProfile(
  store: BrowserbaseStore,
  profile: BrowserbaseAccountProfile,
): BrowserbaseStore {
  return {
    ...store,
    accounts: {
      ...store.accounts,
      [profile.name]: profile,
    },
  };
}

export function removeAccountProfile(
  store: BrowserbaseStore,
  name: BrowserbaseAccountName,
): BrowserbaseStore {
  const accounts = { ...store.accounts };
  delete accounts[name];
  const next: BrowserbaseStore = { ...store, accounts };
  if (next.defaultAccountName === name) {
    const { defaultAccountName: _drop, ...rest } = next;
    return rest;
  }
  return next;
}

export function upsertProxyProfile(
  store: BrowserbaseStore,
  proxy: BrowserbaseProxyProfile,
): BrowserbaseStore {
  return {
    ...store,
    proxies: {
      ...store.proxies,
      [proxy.name]: proxy,
    },
  };
}

export function removeProxyProfile(
  store: BrowserbaseStore,
  name: BrowserbaseProxyName,
  options: { force?: boolean } = {},
): Result<BrowserbaseStore, BrowserbaseConfigError> {
  const users = Object.values(store.accounts).filter((account) => account.defaultProxyName === name);
  if (users.length > 0 && !options.force) {
    return err(configError(
      'PROXY_IN_USE',
      `Browserbase proxy "${name}" is still used by ${users.length} account(s).`,
      'Run with --force to remove it and clear those account proxy references.',
    ));
  }
  const proxies = { ...store.proxies };
  delete proxies[name];
  const accounts = Object.fromEntries(Object.entries(store.accounts).map(([accountName, account]) => [
    accountName,
    account.defaultProxyName === name ? { ...account, defaultProxyName: null } : account,
  ]));
  return ok({ ...store, proxies, accounts });
}

export function redactProxyProfile(profile: BrowserbaseProxyProfile): BrowserbaseProxyProfile {
  return {
    ...profile,
    rules: profile.rules.map((rule) => {
      if (rule.type !== 'external' || !rule.passwordRef) return rule;
      return {
        ...rule,
        passwordRef: rule.passwordRef.kind === 'env'
          ? { kind: 'env', envName: rule.passwordRef.envName }
          : { kind: 'plain', value: '[REDACTED]' },
      };
    }),
  };
}
