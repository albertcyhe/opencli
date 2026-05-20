import { ConfigError } from '../errors.js';
import { asBrowserbaseContextId, BrowserbaseClient } from './client.js';
import {
  asBrowserbaseAccountName,
  asBrowserbaseProxyName,
  loadBrowserbaseStore,
  removeAccountProfile,
  saveBrowserbaseStore,
  upsertAccountProfile,
} from './config-store.js';
import {
  type BrowserbaseAccountName,
  type BrowserbaseAccountProfile,
  type BrowserbaseApiError,
  type BrowserbaseContextId,
  type BrowserbaseProxyName,
  type BrowserbaseRegion,
  type LoginState,
  type Result,
  err,
  ok,
} from './types.js';

export interface BrowserbaseAccountError {
  readonly code:
    | 'ACCOUNT_NOT_FOUND'
    | 'PROXY_NOT_FOUND'
    | 'CONTEXT_CREATE_FAILED'
    | 'CONTEXT_DELETE_FAILED'
    | 'SESSION_CREATE_FAILED'
    | 'LIVE_URL_FAILED'
    | 'CONFIG_FAILED';
  readonly message: string;
  readonly hint?: string;
}

export interface CreateAccountInput {
  readonly name: BrowserbaseAccountName;
  readonly site: string;
  readonly proxyName: BrowserbaseProxyName | null;
}

export interface LoginSessionOptions {
  readonly keepAlive: boolean;
  readonly timeoutSeconds: number;
  readonly region: BrowserbaseRegion;
  readonly persistContext: boolean;
  readonly proxyNameOverride: BrowserbaseProxyName | null;
}

export interface LoginSessionResult {
  readonly account: BrowserbaseAccountProfile;
  readonly sessionId: string;
  readonly liveUrl: string;
  readonly connectUrl: string | null;
}

export interface ClearLoginOptions {
  readonly recreateContext: boolean;
  readonly deleteOldContext: boolean;
}

export interface DeleteAccountOptions {
  readonly deleteContext: boolean;
}

export interface BrowserbaseAccountDeps {
  readonly client: BrowserbaseClient;
  readonly projectId: string;
  readonly now: () => Date;
}

function accountError(code: BrowserbaseAccountError['code'], message: string, hint?: string): BrowserbaseAccountError {
  return { code, message, ...(hint ? { hint } : {}) };
}

function apiToAccountError(code: BrowserbaseAccountError['code'], error: BrowserbaseApiError): BrowserbaseAccountError {
  return accountError(code, error.message, error.hint);
}

function requireStore() {
  const store = loadBrowserbaseStore();
  if (!store.ok) {
    throw new ConfigError(store.error.message, store.error.hint);
  }
  return store.value;
}

function saveStoreOrThrow(store: ReturnType<typeof requireStore>): void {
  const saved = saveBrowserbaseStore(store);
  if (!saved.ok) throw new ConfigError(saved.error.message, saved.error.hint);
}

export async function createBrowserbaseAccount(
  input: CreateAccountInput,
  deps: BrowserbaseAccountDeps,
): Promise<Result<BrowserbaseAccountProfile, BrowserbaseAccountError>> {
  const store = requireStore();
  if (input.proxyName && !store.proxies[input.proxyName]) {
    return err(accountError('PROXY_NOT_FOUND', `Browserbase proxy "${input.proxyName}" is not configured.`));
  }
  const context = await deps.client.createContext(deps.projectId);
  if (!context.ok) return err(apiToAccountError('CONTEXT_CREATE_FAILED', context.error));
  const profile: BrowserbaseAccountProfile = {
    name: input.name,
    site: input.site,
    contextId: context.value.id,
    defaultProxyName: input.proxyName,
    loginState: 'empty',
    lastLoginAtIso: null,
    lastCheckedAtIso: null,
  };
  saveStoreOrThrow(upsertAccountProfile(store, profile));
  return ok(profile);
}

export async function openLoginSession(
  accountName: BrowserbaseAccountName,
  options: LoginSessionOptions,
  deps: BrowserbaseAccountDeps,
): Promise<Result<LoginSessionResult, BrowserbaseAccountError>> {
  const store = requireStore();
  const account = store.accounts[accountName];
  if (!account) return err(accountError('ACCOUNT_NOT_FOUND', `Browserbase account "${accountName}" is not configured.`));
  const proxyName = options.proxyNameOverride ?? account.defaultProxyName;
  const proxy = proxyName ? store.proxies[proxyName] : null;
  if (proxyName && !proxy) return err(accountError('PROXY_NOT_FOUND', `Browserbase proxy "${proxyName}" is not configured.`));
  const session = await deps.client.createSession({
    accountName,
    contextId: account.contextId,
    proxyName,
    region: options.region,
    keepAlive: options.keepAlive,
    persistContext: options.persistContext,
    timeoutSeconds: options.timeoutSeconds,
  }, proxy?.rules ?? []);
  if (!session.ok) return err(apiToAccountError('SESSION_CREATE_FAILED', session.error));
  const liveUrls = await deps.client.getLiveUrls(session.value.id);
  if (!liveUrls.ok) return err(apiToAccountError('LIVE_URL_FAILED', liveUrls.error));
  const updated: BrowserbaseAccountProfile = {
    ...account,
    loginState: 'login-session-open',
    lastLoginAtIso: deps.now().toISOString(),
  };
  saveStoreOrThrow(upsertAccountProfile(store, updated));
  return ok({
    account: updated,
    sessionId: session.value.id,
    liveUrl: liveUrls.value.debuggerFullscreenUrl,
    connectUrl: session.value.connectUrl,
  });
}

export async function clearAccountLoginState(
  accountName: BrowserbaseAccountName,
  options: ClearLoginOptions,
  deps: BrowserbaseAccountDeps,
): Promise<Result<BrowserbaseAccountProfile, BrowserbaseAccountError>> {
  const store = requireStore();
  const account = store.accounts[accountName];
  if (!account) return err(accountError('ACCOUNT_NOT_FOUND', `Browserbase account "${accountName}" is not configured.`));
  if (!options.recreateContext) {
    const updated: BrowserbaseAccountProfile = { ...account, loginState: 'empty', lastLoginAtIso: null };
    saveStoreOrThrow(upsertAccountProfile(store, updated));
    return ok(updated);
  }
  if (options.deleteOldContext) {
    const deleted = await deps.client.deleteContext(account.contextId);
    if (!deleted.ok && deleted.error.code !== 'NOT_FOUND') return err(apiToAccountError('CONTEXT_DELETE_FAILED', deleted.error));
  }
  const context = await deps.client.createContext(deps.projectId);
  if (!context.ok) return err(apiToAccountError('CONTEXT_CREATE_FAILED', context.error));
  const updated: BrowserbaseAccountProfile = {
    ...account,
    contextId: context.value.id,
    loginState: 'empty',
    lastLoginAtIso: null,
  };
  saveStoreOrThrow(upsertAccountProfile(store, updated));
  return ok(updated);
}

export async function deleteBrowserbaseAccount(
  accountName: BrowserbaseAccountName,
  options: DeleteAccountOptions,
  deps: BrowserbaseAccountDeps,
): Promise<Result<void, BrowserbaseAccountError>> {
  const store = requireStore();
  const account = store.accounts[accountName];
  if (!account) return err(accountError('ACCOUNT_NOT_FOUND', `Browserbase account "${accountName}" is not configured.`));
  if (options.deleteContext) {
    const deleted = await deps.client.deleteContext(account.contextId);
    if (!deleted.ok && deleted.error.code !== 'NOT_FOUND') return err(apiToAccountError('CONTEXT_DELETE_FAILED', deleted.error));
  }
  saveStoreOrThrow(removeAccountProfile(store, accountName));
  return ok(undefined);
}

export function markBrowserbaseAccount(
  accountName: string,
  loginState: LoginState,
  opts: { checked?: boolean } = {},
): BrowserbaseAccountProfile {
  const store = requireStore();
  const normalized = asBrowserbaseAccountName(accountName);
  const account = store.accounts[normalized];
  if (!account) throw new ConfigError(`Browserbase account "${accountName}" is not configured.`);
  const updated: BrowserbaseAccountProfile = {
    ...account,
    loginState,
    ...(opts.checked ? { lastCheckedAtIso: new Date().toISOString() } : {}),
  };
  saveStoreOrThrow(upsertAccountProfile(store, updated));
  return updated;
}

export function setBrowserbaseAccountProxy(accountName: string, proxyName: string | null): BrowserbaseAccountProfile {
  const store = requireStore();
  const normalizedAccount = asBrowserbaseAccountName(accountName);
  const account = store.accounts[normalizedAccount];
  if (!account) throw new ConfigError(`Browserbase account "${accountName}" is not configured.`);
  const normalizedProxy = proxyName ? asBrowserbaseProxyName(proxyName) : null;
  if (normalizedProxy && !store.proxies[normalizedProxy]) {
    throw new ConfigError(`Browserbase proxy "${proxyName}" is not configured.`);
  }
  const updated: BrowserbaseAccountProfile = { ...account, defaultProxyName: normalizedProxy };
  saveStoreOrThrow(upsertAccountProfile(store, updated));
  return updated;
}

export function createLocalAccountProfile(
  name: string,
  site: string,
  contextId: string,
  proxyName: string | null,
): BrowserbaseAccountProfile {
  return {
    name: asBrowserbaseAccountName(name),
    site,
    contextId: asBrowserbaseContextId(contextId),
    defaultProxyName: proxyName ? asBrowserbaseProxyName(proxyName) : null,
    loginState: 'empty',
    lastLoginAtIso: null,
    lastCheckedAtIso: null,
  };
}
