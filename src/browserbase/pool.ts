import { sleep } from '../utils.js';
import { BrowserbaseClient } from './client.js';
import {
  type AccountLeaseRequest,
  type BrowserLease,
  type BrowserLeaseOutcome,
  type BrowserbaseAccountName,
  type BrowserbasePoolError,
  type BrowserbaseStore,
  type Result,
  err,
  ok,
} from './types.js';

export interface BrowserbasePoolOptions {
  readonly store: BrowserbaseStore;
  readonly maxSessions: number;
  readonly waitIntervalMs?: number;
}

function poolError(code: BrowserbasePoolError['code'], message: string, hint?: string): BrowserbasePoolError {
  return { code, message, ...(hint ? { hint } : {}) };
}

function leaseId(): string {
  return `lease_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export class BrowserbaseAccountSessionPool {
  private readonly activeAccounts = new Set<string>();
  private activeSessions = 0;
  private closed = false;

  constructor(
    private readonly client: BrowserbaseClient,
    private readonly options: BrowserbasePoolOptions,
  ) {}

  async acquire(request: AccountLeaseRequest): Promise<Result<BrowserLease, BrowserbasePoolError>> {
    if (this.closed) return err(poolError('POOL_CLOSED', 'Browserbase session pool is already closed.'));
    const account = this.options.store.accounts[request.accountName];
    if (!account) return err(poolError('ACCOUNT_NOT_FOUND', `Browserbase account "${request.accountName}" is not configured.`));
    const proxy = account.defaultProxyName ? this.options.store.proxies[account.defaultProxyName] : null;
    if (account.defaultProxyName && !proxy) {
      return err(poolError('PROXY_NOT_FOUND', `Browserbase proxy "${account.defaultProxyName}" is not configured.`));
    }

    await this.waitForCapacity(request.accountName);
    this.activeAccounts.add(request.accountName);
    this.activeSessions += 1;

    const session = await this.client.createSession({
      accountName: request.accountName,
      contextId: account.contextId,
      proxyName: account.defaultProxyName,
      region: request.region,
      keepAlive: request.keepAlive,
      persistContext: request.persistContext,
      timeoutSeconds: request.timeoutSeconds,
    }, proxy?.rules ?? []);

    if (!session.ok) {
      this.activeAccounts.delete(request.accountName);
      this.activeSessions = Math.max(0, this.activeSessions - 1);
      return err(poolError('ACQUIRE_FAILED', session.error.message, session.error.hint));
    }
    if (!session.value.connectUrl) {
      this.activeAccounts.delete(request.accountName);
      this.activeSessions = Math.max(0, this.activeSessions - 1);
      return err(poolError('ACQUIRE_FAILED', `Browserbase session "${session.value.id}" did not include a connectUrl.`));
    }
    return ok({
      leaseId: leaseId() as BrowserLease['leaseId'],
      sessionId: session.value.id,
      accountName: request.accountName,
      connectUrl: session.value.connectUrl,
      contextId: account.contextId,
      proxyName: account.defaultProxyName,
      keepAlive: request.keepAlive,
    });
  }

  async release(
    lease: BrowserLease,
    _outcome: BrowserLeaseOutcome,
  ): Promise<Result<void, BrowserbasePoolError>> {
    this.activeAccounts.delete(lease.accountName);
    this.activeSessions = Math.max(0, this.activeSessions - 1);
    if (lease.keepAlive) return ok(undefined);
    const released = await this.client.releaseSession(lease.sessionId);
    if (!released.ok) return err(poolError('RELEASE_FAILED', released.error.message, released.error.hint));
    return ok(undefined);
  }

  async close(): Promise<Result<void, BrowserbasePoolError>> {
    this.closed = true;
    return ok(undefined);
  }

  private async waitForCapacity(accountName: BrowserbaseAccountName): Promise<void> {
    const interval = this.options.waitIntervalMs ?? 100;
    while (
      !this.closed &&
      (this.activeSessions >= this.options.maxSessions || this.activeAccounts.has(accountName))
    ) {
      await sleep(interval);
    }
  }
}
