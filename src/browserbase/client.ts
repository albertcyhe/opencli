import { isRecord } from '../utils.js';
import {
  type BrowserbaseApiError,
  type BrowserbaseCliOptions,
  type BrowserbaseConfig,
  type BrowserbaseContext,
  type BrowserbaseContextId,
  type BrowserbaseLivePage,
  type BrowserbaseLiveUrls,
  type BrowserbaseProxyRule,
  type BrowserbaseRegion,
  type BrowserbaseSession,
  type BrowserbaseSessionCreateRequest,
  type BrowserbaseSessionId,
  type BrowserbaseSessionStatus,
  type FetchLike,
  type Result,
  err,
  ok,
} from './types.js';

const DEFAULT_API_BASE = 'https://api.browserbase.com/v1';
const VALID_REGIONS = new Set<BrowserbaseRegion>(['us-west-2', 'us-east-1', 'eu-central-1', 'ap-southeast-1']);
const VALID_STATUSES = new Set<BrowserbaseSessionStatus>(['PENDING', 'RUNNING', 'ERROR', 'TIMED_OUT', 'COMPLETED']);

type JsonObject = Record<string, unknown>;

export function asBrowserbaseSessionId(value: string): BrowserbaseSessionId {
  return value as BrowserbaseSessionId;
}

export function asBrowserbaseContextId(value: string): BrowserbaseContextId {
  return value as BrowserbaseContextId;
}

export function resolveBrowserbaseConfig(
  env: NodeJS.ProcessEnv = process.env,
  cli: BrowserbaseCliOptions = {},
): Result<BrowserbaseConfig, BrowserbaseApiError> {
  const apiKey = cli.apiKey?.trim() || env.BROWSERBASE_API_KEY?.trim();
  if (!apiKey) {
    return err({
      code: 'MISSING_API_KEY',
      message: 'BROWSERBASE_API_KEY not set.',
      hint: 'Set it with: export BROWSERBASE_API_KEY=your_key',
    });
  }
  const projectId = cli.projectId?.trim() || env.BROWSERBASE_PROJECT_ID?.trim() || null;
  const apiBaseUrl = cli.apiBaseUrl?.trim() || env.BROWSERBASE_API_BASE_URL?.trim() || DEFAULT_API_BASE;
  return ok({ apiKey, projectId, apiBaseUrl: apiBaseUrl.replace(/\/$/, '') });
}

export function parseBrowserbaseSessionId(raw: string): Result<BrowserbaseSessionId, BrowserbaseApiError> {
  const value = raw.trim();
  if (!value) {
    return err({ code: 'INVALID_RESPONSE', message: 'Browserbase session id is empty.' });
  }
  return ok(asBrowserbaseSessionId(value));
}

function apiError(code: BrowserbaseApiError['code'], message: string, status?: number, hint?: string): BrowserbaseApiError {
  return { code, message, ...(status !== undefined ? { status } : {}), ...(hint ? { hint } : {}) };
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) return null;
  return JSON.parse(text) as unknown;
}

function mapHttpError(status: number, fallback: string): BrowserbaseApiError {
  if (status === 404 || status === 400) return apiError('NOT_FOUND', fallback, status);
  if (status === 429) return apiError('QUOTA_EXHAUSTED', 'Browserbase concurrent session or rate limit exhausted.', status);
  return apiError('API_ERROR', `Browserbase API error: HTTP ${status}`, status);
}

function stringField(data: JsonObject, key: string): string | null {
  const value = data[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function numberField(data: JsonObject, key: string): number | null {
  const value = data[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function boolField(data: JsonObject, key: string): boolean {
  return data[key] === true;
}

function parseRegion(value: unknown): BrowserbaseRegion | null {
  return typeof value === 'string' && VALID_REGIONS.has(value as BrowserbaseRegion)
    ? value as BrowserbaseRegion
    : null;
}

function parseStatus(value: unknown): BrowserbaseSessionStatus {
  return typeof value === 'string' && VALID_STATUSES.has(value as BrowserbaseSessionStatus)
    ? value as BrowserbaseSessionStatus
    : 'ERROR';
}

function parseContext(data: unknown): Result<BrowserbaseContext, BrowserbaseApiError> {
  if (!isRecord(data) || typeof data.id !== 'string') {
    return err(apiError('INVALID_RESPONSE', 'Browserbase context response did not include an id.'));
  }
  return ok({
    id: asBrowserbaseContextId(data.id),
    projectId: stringField(data, 'projectId'),
    createdAtIso: stringField(data, 'createdAt'),
    updatedAtIso: stringField(data, 'updatedAt'),
  });
}

function parseSession(data: unknown, fallbackId?: BrowserbaseSessionId): Result<BrowserbaseSession, BrowserbaseApiError> {
  if (!isRecord(data) || (typeof data.id !== 'string' && !fallbackId)) {
    return err(apiError('INVALID_RESPONSE', 'Browserbase session response did not include an id.'));
  }
  const id = typeof data.id === 'string' ? asBrowserbaseSessionId(data.id) : fallbackId!;
  return ok({
    id,
    status: parseStatus(data.status),
    connectUrl: stringField(data, 'connectUrl'),
    contextId: typeof data.contextId === 'string' && data.contextId.trim()
      ? asBrowserbaseContextId(data.contextId)
      : null,
    projectId: stringField(data, 'projectId'),
    createdAtIso: stringField(data, 'createdAt'),
    updatedAtIso: stringField(data, 'updatedAt'),
    startedAtIso: stringField(data, 'startedAt'),
    expiresAtIso: stringField(data, 'expiresAt'),
    endedAtIso: stringField(data, 'endedAt'),
    keepAlive: boolField(data, 'keepAlive'),
    region: parseRegion(data.region),
    proxyBytes: numberField(data, 'proxyBytes'),
  });
}

function parseLiveUrls(data: unknown): Result<BrowserbaseLiveUrls, BrowserbaseApiError> {
  if (!isRecord(data)) {
    return err(apiError('INVALID_RESPONSE', 'Browserbase live URL response was not an object.'));
  }
  const debuggerFullscreenUrl = stringField(data, 'debuggerFullscreenUrl');
  const debuggerUrl = stringField(data, 'debuggerUrl');
  const wsUrl = stringField(data, 'wsUrl');
  if (!debuggerFullscreenUrl || !debuggerUrl || !wsUrl) {
    return err(apiError('INVALID_RESPONSE', 'Browserbase live URL response is missing required URLs.'));
  }
  const pages: BrowserbaseLivePage[] = Array.isArray(data.pages)
    ? data.pages.filter(isRecord).map((page) => ({
      id: stringField(page, 'id') ?? '',
      url: stringField(page, 'url') ?? '',
      title: stringField(page, 'title') ?? '',
      debuggerUrl: stringField(page, 'debuggerUrl') ?? '',
      debuggerFullscreenUrl: stringField(page, 'debuggerFullscreenUrl') ?? '',
    }))
    : [];
  return ok({ debuggerFullscreenUrl, debuggerUrl, wsUrl, pages });
}

function proxyRuleToApi(rule: BrowserbaseProxyRule): Result<JsonObject, BrowserbaseApiError> {
  if (rule.type === 'none') {
    return ok({ type: 'none', domainPattern: rule.domainPattern });
  }
  if (rule.type === 'browserbase') {
    const geolocation = rule.geolocation
      ? Object.fromEntries(Object.entries(rule.geolocation).filter(([, value]) => value !== null && value !== ''))
      : undefined;
    return ok({
      type: 'browserbase',
      ...(geolocation && Object.keys(geolocation).length > 0 ? { geolocation } : {}),
      ...(rule.domainPattern ? { domainPattern: rule.domainPattern } : {}),
    });
  }
  const password = rule.passwordRef?.kind === 'plain'
    ? rule.passwordRef.value
    : rule.passwordRef?.kind === 'env'
      ? process.env[rule.passwordRef.envName]
      : undefined;
  if (rule.passwordRef?.kind === 'env' && !password) {
    return err(apiError(
      'PROXY_PASSWORD_ENV_MISSING',
      `Proxy password env var ${rule.passwordRef.envName} is not set.`,
      undefined,
      `Set ${rule.passwordRef.envName} before creating a Browserbase session.`,
    ));
  }
  return ok({
    type: 'external',
    server: rule.server,
    ...(rule.username ? { username: rule.username } : {}),
    ...(password ? { password } : {}),
    ...(rule.domainPattern ? { domainPattern: rule.domainPattern } : {}),
  });
}

function proxyRulesToApi(rules: ReadonlyArray<BrowserbaseProxyRule>): Result<JsonObject[] | undefined, BrowserbaseApiError> {
  if (rules.length === 0) return ok(undefined);
  const out: JsonObject[] = [];
  for (const rule of rules) {
    const mapped = proxyRuleToApi(rule);
    if (!mapped.ok) return mapped;
    out.push(mapped.value);
  }
  return ok(out);
}

export class BrowserbaseClient {
  constructor(
    private readonly config: BrowserbaseConfig,
    private readonly fetchImpl: FetchLike = globalThis.fetch.bind(globalThis),
  ) {}

  async createContext(projectId: string): Promise<Result<BrowserbaseContext, BrowserbaseApiError>> {
    if (!projectId.trim()) {
      return err(apiError('MISSING_PROJECT_ID', 'BROWSERBASE_PROJECT_ID is required to create a Browserbase context.'));
    }
    const response = await this.fetchImpl(`${this.config.apiBaseUrl}/contexts`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ projectId }),
    });
    if (!response.ok) return err(mapHttpError(response.status, 'Browserbase context was not found.'));
    return parseContext(await readJson(response));
  }

  async getContext(contextId: BrowserbaseContextId): Promise<Result<BrowserbaseContext, BrowserbaseApiError>> {
    const response = await this.fetchImpl(`${this.config.apiBaseUrl}/contexts/${contextId}`, {
      headers: this.authHeaders(),
    });
    if (!response.ok) return err(mapHttpError(response.status, `Browserbase context "${contextId}" not found.`));
    return parseContext(await readJson(response));
  }

  async deleteContext(contextId: BrowserbaseContextId): Promise<Result<void, BrowserbaseApiError>> {
    const response = await this.fetchImpl(`${this.config.apiBaseUrl}/contexts/${contextId}`, {
      method: 'DELETE',
      headers: this.authHeaders(),
    });
    if (!response.ok) return err(mapHttpError(response.status, `Browserbase context "${contextId}" not found.`));
    return ok(undefined);
  }

  async createSession(
    request: BrowserbaseSessionCreateRequest,
    proxyRules: ReadonlyArray<BrowserbaseProxyRule>,
  ): Promise<Result<BrowserbaseSession, BrowserbaseApiError>> {
    const proxies = proxyRulesToApi(proxyRules);
    if (!proxies.ok) return proxies;
    const body: JsonObject = {
      ...(this.config.projectId ? { projectId: this.config.projectId } : {}),
      region: request.region,
      keepAlive: request.keepAlive,
      timeout: request.timeoutSeconds,
      ...(proxies.value ? { proxies: proxies.value } : {}),
      ...(request.accountName ? { userMetadata: { opencliAccount: request.accountName } } : {}),
    };
    if (request.contextId) {
      body.browserSettings = {
        context: {
          id: request.contextId,
          persist: request.persistContext,
        },
      };
    }
    const response = await this.fetchImpl(`${this.config.apiBaseUrl}/sessions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!response.ok) return err(mapHttpError(response.status, 'Browserbase session could not be created.'));
    return parseSession(await readJson(response));
  }

  async getSession(sessionId: BrowserbaseSessionId): Promise<Result<BrowserbaseSession, BrowserbaseApiError>> {
    const response = await this.fetchImpl(`${this.config.apiBaseUrl}/sessions/${sessionId}`, {
      headers: this.authHeaders(),
    });
    if (!response.ok) return err(mapHttpError(response.status, `Browserbase session "${sessionId}" not found.`));
    return parseSession(await readJson(response), sessionId);
  }

  async listSessions(): Promise<Result<ReadonlyArray<BrowserbaseSession>, BrowserbaseApiError>> {
    const response = await this.fetchImpl(`${this.config.apiBaseUrl}/sessions`, {
      headers: this.authHeaders(),
    });
    if (!response.ok) return err(mapHttpError(response.status, 'Browserbase sessions could not be listed.'));
    const data = await readJson(response);
    if (!Array.isArray(data)) return err(apiError('INVALID_RESPONSE', 'Browserbase list sessions response was not an array.'));
    const sessions: BrowserbaseSession[] = [];
    for (const item of data) {
      const parsed = parseSession(item);
      if (!parsed.ok) return parsed;
      sessions.push(parsed.value);
    }
    return ok(sessions);
  }

  async releaseSession(sessionId: BrowserbaseSessionId): Promise<Result<void, BrowserbaseApiError>> {
    const response = await this.fetchImpl(`${this.config.apiBaseUrl}/sessions/${sessionId}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        status: 'REQUEST_RELEASE',
        ...(this.config.projectId ? { projectId: this.config.projectId } : {}),
      }),
    });
    if (!response.ok) return err(mapHttpError(response.status, `Browserbase session "${sessionId}" could not be released.`));
    return ok(undefined);
  }

  async getLiveUrls(sessionId: BrowserbaseSessionId): Promise<Result<BrowserbaseLiveUrls, BrowserbaseApiError>> {
    const response = await this.fetchImpl(`${this.config.apiBaseUrl}/sessions/${sessionId}/debug`, {
      headers: this.authHeaders(),
    });
    if (!response.ok) return err(mapHttpError(response.status, `Browserbase session "${sessionId}" live URLs could not be loaded.`));
    return parseLiveUrls(await readJson(response));
  }

  private headers(): HeadersInit {
    return {
      ...this.authHeaders(),
      'content-type': 'application/json',
    };
  }

  private authHeaders(): HeadersInit {
    return { 'x-bb-api-key': this.config.apiKey };
  }
}
