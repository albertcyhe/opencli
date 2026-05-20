export type Result<TValue, TError> =
  | { readonly ok: true; readonly value: TValue }
  | { readonly ok: false; readonly error: TError };

export function ok<TValue>(value: TValue): Result<TValue, never> {
  return { ok: true, value };
}

export function err<TError>(error: TError): Result<never, TError> {
  return { ok: false, error };
}

export type BrowserbaseContextId = string & { readonly __brand: 'BrowserbaseContextId' };
export type BrowserbaseSessionId = string & { readonly __brand: 'BrowserbaseSessionId' };
export type BrowserbaseAccountName = string & { readonly __brand: 'BrowserbaseAccountName' };
export type BrowserbaseProxyName = string & { readonly __brand: 'BrowserbaseProxyName' };
export type BrowserbaseLeaseId = string & { readonly __brand: 'BrowserbaseLeaseId' };

export type LoginState = 'empty' | 'login-session-open' | 'ready' | 'invalidated' | 'deleted';

export type BrowserbaseRegion = 'us-west-2' | 'us-east-1' | 'eu-central-1' | 'ap-southeast-1';

export type BrowserbaseSessionStatus = 'PENDING' | 'RUNNING' | 'ERROR' | 'TIMED_OUT' | 'COMPLETED';

export interface BrowserbaseGeolocation {
  readonly country: string | null;
  readonly state: string | null;
  readonly city: string | null;
}

export type ProxyPasswordRef =
  | { readonly kind: 'env'; readonly envName: string }
  | { readonly kind: 'plain'; readonly value: string };

export type BrowserbaseProxyRule =
  | {
      readonly type: 'none';
      readonly domainPattern: string;
    }
  | {
      readonly type: 'browserbase';
      readonly geolocation: BrowserbaseGeolocation | null;
      readonly domainPattern: string | null;
    }
  | {
      readonly type: 'external';
      readonly server: string;
      readonly username: string | null;
      readonly passwordRef: ProxyPasswordRef | null;
      readonly domainPattern: string | null;
    };

export interface BrowserbaseProxyProfile {
  readonly name: BrowserbaseProxyName;
  readonly rules: ReadonlyArray<BrowserbaseProxyRule>;
  readonly updatedAtIso: string;
}

export interface BrowserbaseAccountProfile {
  readonly name: BrowserbaseAccountName;
  readonly site: string;
  readonly contextId: BrowserbaseContextId;
  readonly defaultProxyName: BrowserbaseProxyName | null;
  readonly loginState: LoginState;
  readonly lastLoginAtIso: string | null;
  readonly lastCheckedAtIso: string | null;
}

export interface BrowserbaseStore {
  readonly version: 1;
  readonly accounts: Readonly<Record<string, BrowserbaseAccountProfile>>;
  readonly proxies: Readonly<Record<string, BrowserbaseProxyProfile>>;
  readonly defaultAccountName?: BrowserbaseAccountName;
}

export interface BrowserbaseConfig {
  readonly apiKey: string;
  readonly projectId: string | null;
  readonly apiBaseUrl: string;
}

export interface BrowserbaseCliOptions {
  readonly apiKey?: string;
  readonly projectId?: string;
  readonly apiBaseUrl?: string;
}

export interface BrowserbaseContext {
  readonly id: BrowserbaseContextId;
  readonly projectId: string | null;
  readonly createdAtIso: string | null;
  readonly updatedAtIso: string | null;
}

export interface BrowserbaseSessionCreateRequest {
  readonly accountName: BrowserbaseAccountName | null;
  readonly contextId: BrowserbaseContextId | null;
  readonly proxyName: BrowserbaseProxyName | null;
  readonly region: BrowserbaseRegion;
  readonly keepAlive: boolean;
  readonly persistContext: boolean;
  readonly timeoutSeconds: number;
}

export interface BrowserbaseSession {
  readonly id: BrowserbaseSessionId;
  readonly status: BrowserbaseSessionStatus;
  readonly connectUrl: string | null;
  readonly contextId: BrowserbaseContextId | null;
  readonly projectId: string | null;
  readonly createdAtIso: string | null;
  readonly updatedAtIso: string | null;
  readonly startedAtIso: string | null;
  readonly expiresAtIso: string | null;
  readonly endedAtIso: string | null;
  readonly keepAlive: boolean;
  readonly region: BrowserbaseRegion | null;
  readonly proxyBytes: number | null;
}

export interface BrowserbaseLivePage {
  readonly id: string;
  readonly url: string;
  readonly title: string;
  readonly debuggerUrl: string;
  readonly debuggerFullscreenUrl: string;
}

export interface BrowserbaseLiveUrls {
  readonly debuggerFullscreenUrl: string;
  readonly debuggerUrl: string;
  readonly wsUrl: string;
  readonly pages: ReadonlyArray<BrowserbaseLivePage>;
}

export type BrowserbaseApiErrorCode =
  | 'MISSING_API_KEY'
  | 'MISSING_PROJECT_ID'
  | 'INVALID_RESPONSE'
  | 'API_ERROR'
  | 'NOT_FOUND'
  | 'QUOTA_EXHAUSTED'
  | 'SESSION_NOT_RUNNING'
  | 'CONNECT_URL_MISSING'
  | 'PROXY_PASSWORD_ENV_MISSING';

export interface BrowserbaseApiError {
  readonly code: BrowserbaseApiErrorCode;
  readonly message: string;
  readonly status?: number;
  readonly hint?: string;
}

export interface BrowserbaseConfigError {
  readonly code:
    | 'CONFIG_READ_FAILED'
    | 'CONFIG_WRITE_FAILED'
    | 'INVALID_CONFIG'
    | 'INVALID_ACCOUNT'
    | 'INVALID_PROXY'
    | 'PROXY_IN_USE';
  readonly message: string;
  readonly hint?: string;
}

export interface BrowserbasePoolError {
  readonly code:
    | 'ACCOUNT_NOT_FOUND'
    | 'PROXY_NOT_FOUND'
    | 'POOL_CLOSED'
    | 'ACQUIRE_FAILED'
    | 'RELEASE_FAILED';
  readonly message: string;
  readonly hint?: string;
}

export interface BrowserLease {
  readonly leaseId: BrowserbaseLeaseId;
  readonly sessionId: BrowserbaseSessionId;
  readonly accountName: BrowserbaseAccountName;
  readonly connectUrl: string;
  readonly contextId: BrowserbaseContextId;
  readonly proxyName: BrowserbaseProxyName | null;
  readonly keepAlive: boolean;
}

export interface AccountLeaseRequest {
  readonly accountName: BrowserbaseAccountName;
  readonly keepAlive: boolean;
  readonly persistContext: boolean;
  readonly timeoutSeconds: number;
  readonly region: BrowserbaseRegion;
}

export interface BrowserLeaseOutcome {
  readonly status: 'success' | 'failed';
  readonly errorMessage?: string;
}

export interface FetchLike {
  (input: string, init?: RequestInit): Promise<Response>;
}

export type CommandArgValue = string | number | boolean | null;
export type CommandArgsMap = Readonly<Record<string, CommandArgValue>>;

export interface RunJobSpec {
  readonly id: string;
  readonly command: string;
  readonly args: CommandArgsMap;
  readonly accountName: BrowserbaseAccountName | null;
  readonly timeoutSeconds: number | null;
}
