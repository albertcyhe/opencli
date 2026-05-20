import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { Command, InvalidArgumentError } from 'commander';
import { executeCommand } from '../execution.js';
import { ConfigError, EXIT_CODES, getErrorMessage } from '../errors.js';
import { getRegistry } from '../registry.js';
import {
  BrowserbaseClient,
  asBrowserbaseAccountName,
  asBrowserbaseContextId,
  asBrowserbaseProxyName,
  asBrowserbaseSessionId,
  createBrowserbaseAccount,
  deleteBrowserbaseAccount,
  clearAccountLoginState,
  createLocalAccountProfile,
  loadBrowserbaseStore,
  markBrowserbaseAccount,
  openLoginSession,
  redactProxyProfile,
  removeProxyProfile,
  resolveBrowserbaseConfig,
  saveBrowserbaseStore,
  setBrowserbaseAccountProxy,
  upsertAccountProfile,
  upsertProxyProfile,
  type BrowserbaseAccountProfile,
  type BrowserbaseProxyName,
  type BrowserbaseProxyProfile,
  type BrowserbaseProxyRule,
  type BrowserbaseRegion,
  type CommandArgsMap,
  type LoginState,
  type ProxyPasswordRef,
} from '../browserbase.js';

const DEFAULT_REGION: BrowserbaseRegion = 'us-west-2';
const DEFAULT_SESSION_TIMEOUT = 1800;

type BrowserbaseDeps = {
  client: BrowserbaseClient;
  projectId: string;
  now: () => Date;
};

function runBrowserbaseAction<Args extends unknown[]>(
  fn: (...args: Args) => Promise<void> | void,
): (...args: Args) => Promise<void> {
  return async (...args: Args) => {
    try {
      await fn(...args);
    } catch (error) {
      console.error(`Error: ${getErrorMessage(error)}`);
      if (error instanceof ConfigError) process.exitCode = error.exitCode;
      else process.exitCode = EXIT_CODES.GENERIC_ERROR;
    }
  };
}

function json(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

function parsePositiveInteger(value: string, label: string): number {
  if (!/^\d+$/.test(value)) throw new InvalidArgumentError(`${label} must be a positive integer.`);
  const parsed = Number.parseInt(value, 10);
  if (parsed <= 0) throw new InvalidArgumentError(`${label} must be a positive integer.`);
  return parsed;
}

function parseRegion(value: string | undefined): BrowserbaseRegion {
  const region = value ?? DEFAULT_REGION;
  if (region === 'us-west-2' || region === 'us-east-1' || region === 'eu-central-1' || region === 'ap-southeast-1') {
    return region;
  }
  throw new InvalidArgumentError(`--region must be one of: us-west-2, us-east-1, eu-central-1, ap-southeast-1.`);
}

function requireDeps(): BrowserbaseDeps {
  const config = resolveBrowserbaseConfig();
  if (!config.ok) throw new ConfigError(config.error.message, config.error.hint);
  if (!config.value.projectId) {
    throw new ConfigError(
      'BROWSERBASE_PROJECT_ID is required for context/account operations.',
      'Set it with: export BROWSERBASE_PROJECT_ID=your_project_id',
    );
  }
  return {
    client: new BrowserbaseClient(config.value),
    projectId: config.value.projectId,
    now: () => new Date(),
  };
}

function requireClient(): BrowserbaseClient {
  const config = resolveBrowserbaseConfig();
  if (!config.ok) throw new ConfigError(config.error.message, config.error.hint);
  return new BrowserbaseClient(config.value);
}

function requireStore() {
  const store = loadBrowserbaseStore();
  if (!store.ok) throw new ConfigError(store.error.message, store.error.hint);
  return store.value;
}

function saveStoreOrThrow(store: ReturnType<typeof requireStore>): void {
  const saved = saveBrowserbaseStore(store);
  if (!saved.ok) throw new ConfigError(saved.error.message, saved.error.hint);
}

function openExternalUrl(url: string): void {
  const command = process.platform === 'darwin'
    ? 'open'
    : process.platform === 'win32'
      ? 'cmd'
      : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  const child = spawn(command, args, { detached: true, stdio: 'ignore' });
  child.unref();
}

async function waitForLoginConfirmation(message: string): Promise<void> {
  const rl = createInterface({ input, output });
  try {
    await rl.question(message);
  } finally {
    rl.close();
  }
}

function proxyPasswordRef(opts: { passwordEnv?: string; password?: string; storePasswordPlaintext?: boolean }): ProxyPasswordRef | null {
  if (opts.passwordEnv?.trim()) return { kind: 'env', envName: opts.passwordEnv.trim() };
  if (opts.password?.trim()) {
    if (!opts.storePasswordPlaintext) {
      throw new ConfigError('Refusing to store proxy password plaintext.', 'Use --password-env, or pass --store-password-plaintext explicitly.');
    }
    return { kind: 'plain', value: opts.password };
  }
  return null;
}

function buildProxyProfile(
  name: string,
  opts: {
    type?: string;
    country?: string;
    state?: string;
    city?: string;
    domainPattern?: string;
    server?: string;
    username?: string;
    passwordEnv?: string;
    password?: string;
    storePasswordPlaintext?: boolean;
  },
  existing?: BrowserbaseProxyProfile,
): BrowserbaseProxyProfile {
  const type = opts.type ?? existing?.rules[0]?.type ?? 'browserbase';
  let rule: BrowserbaseProxyRule;
  if (type === 'none') {
    if (!opts.domainPattern?.trim()) throw new ConfigError('--domain-pattern is required for proxy type "none".');
    rule = { type: 'none', domainPattern: opts.domainPattern.trim() };
  } else if (type === 'browserbase') {
    const geolocation = opts.country || opts.state || opts.city
      ? {
        country: opts.country?.trim() || null,
        state: opts.state?.trim() || null,
        city: opts.city?.trim() || null,
      }
      : existing?.rules[0]?.type === 'browserbase'
        ? existing.rules[0].geolocation
        : null;
    rule = {
      type: 'browserbase',
      geolocation,
      domainPattern: opts.domainPattern?.trim() || (existing?.rules[0]?.type === 'browserbase' ? existing.rules[0].domainPattern : null),
    };
  } else if (type === 'external') {
    const existingExternal = existing?.rules[0]?.type === 'external' ? existing.rules[0] : null;
    const server = opts.server?.trim() || existingExternal?.server;
    if (!server) throw new ConfigError('--server is required for proxy type "external".');
    rule = {
      type: 'external',
      server,
      username: opts.username?.trim() || existingExternal?.username || null,
      passwordRef: proxyPasswordRef(opts) ?? existingExternal?.passwordRef ?? null,
      domainPattern: opts.domainPattern?.trim() || existingExternal?.domainPattern || null,
    };
  } else {
    throw new ConfigError('--type must be one of: browserbase, external, none.');
  }
  return {
    name: asBrowserbaseProxyName(name),
    rules: [rule],
    updatedAtIso: new Date().toISOString(),
  };
}

function outputAccount(account: BrowserbaseAccountProfile): Record<string, unknown> {
  return {
    name: account.name,
    site: account.site,
    contextId: account.contextId,
    defaultProxyName: account.defaultProxyName,
    loginState: account.loginState,
    lastLoginAtIso: account.lastLoginAtIso,
    lastCheckedAtIso: account.lastCheckedAtIso,
  };
}

function outputProxy(profile: BrowserbaseProxyProfile, showSensitive: boolean): BrowserbaseProxyProfile {
  return showSensitive ? profile : redactProxyProfile(profile);
}

function outputSessionWithSensitivity<T extends { connectUrl: string | null }>(
  session: T,
  showSensitive: boolean,
): T {
  return showSensitive ? session : { ...session, connectUrl: session.connectUrl ? '[REDACTED]' : null };
}

function parseCommandString(command: string): { commandName: string; args: CommandArgsMap } {
  const tokens = command.trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 2) throw new ConfigError('--command must start with "<site> <command>".');
  const [site, name, ...rest] = tokens;
  const args: Record<string, string | boolean> = {};
  for (let i = 0; i < rest.length; i++) {
    const token = rest[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = rest[i + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = true;
    }
  }
  return { commandName: `${site}/${name}`, args };
}

export function registerBrowserbaseCommands(program: Command): Command {
  const browserbase = program.command('browserbase').description('Manage Browserbase accounts, sessions, contexts, and proxies');

  const proxy = browserbase.command('proxy').description('Manage Browserbase proxy profiles');
  proxy.command('list')
    .description('List Browserbase proxy profiles')
    .option('--show-sensitive', 'Show stored plaintext proxy password values', false)
    .action(runBrowserbaseAction((opts: { showSensitive?: boolean }) => {
      json(Object.values(requireStore().proxies).map((profile) => outputProxy(profile, opts.showSensitive === true)));
    }));

  proxy.command('get')
    .description('Show a Browserbase proxy profile')
    .argument('<name>')
    .option('--show-sensitive', 'Show stored plaintext proxy password values', false)
    .action(runBrowserbaseAction((name: string, opts: { showSensitive?: boolean }) => {
      const profile = requireStore().proxies[asBrowserbaseProxyName(name)];
      if (!profile) throw new ConfigError(`Browserbase proxy "${name}" is not configured.`);
      json(outputProxy(profile, opts.showSensitive === true));
    }));

  proxy.command('add')
    .description('Create a Browserbase proxy profile')
    .argument('<name>')
    .requiredOption('--type <type>', 'browserbase, external, or none')
    .option('--country <country>')
    .option('--state <state>')
    .option('--city <city>')
    .option('--domain-pattern <pattern>')
    .option('--server <url>')
    .option('--username <user>')
    .option('--password-env <env>')
    .option('--password <value>')
    .option('--store-password-plaintext', 'Allow writing proxy password plaintext to ~/.opencli/browserbase.json', false)
    .action(runBrowserbaseAction((name: string, opts) => {
      const store = requireStore();
      const profile = buildProxyProfile(name, opts);
      saveStoreOrThrow(upsertProxyProfile(store, profile));
      json(redactProxyProfile(profile));
    }));

  proxy.command('update')
    .description('Update a Browserbase proxy profile')
    .argument('<name>')
    .option('--type <type>', 'browserbase, external, or none')
    .option('--country <country>')
    .option('--state <state>')
    .option('--city <city>')
    .option('--domain-pattern <pattern>')
    .option('--server <url>')
    .option('--username <user>')
    .option('--password-env <env>')
    .option('--password <value>')
    .option('--store-password-plaintext', 'Allow writing proxy password plaintext to ~/.opencli/browserbase.json', false)
    .action(runBrowserbaseAction((name: string, opts) => {
      const store = requireStore();
      const existing = store.proxies[asBrowserbaseProxyName(name)];
      if (!existing) throw new ConfigError(`Browserbase proxy "${name}" is not configured.`);
      const updated = buildProxyProfile(name, opts, existing);
      saveStoreOrThrow(upsertProxyProfile(store, updated));
      json(redactProxyProfile(updated));
    }));

  proxy.command('delete')
    .description('Delete a Browserbase proxy profile')
    .argument('<name>')
    .option('--force', 'Clear account references and delete anyway', false)
    .action(runBrowserbaseAction((name: string, opts: { force?: boolean }) => {
      const removed = removeProxyProfile(requireStore(), asBrowserbaseProxyName(name), { force: opts.force === true });
      if (!removed.ok) throw new ConfigError(removed.error.message, removed.error.hint);
      saveStoreOrThrow(removed.value);
      json({ deleted: true, name });
    }));

  proxy.command('test')
    .description('Create and release a Browserbase session to validate proxy settings')
    .argument('<name>')
    .option('--region <region>', 'Browserbase region', DEFAULT_REGION)
    .action(runBrowserbaseAction(async (name: string, opts: { region?: string }) => {
      const store = requireStore();
      const profile = store.proxies[asBrowserbaseProxyName(name)];
      if (!profile) throw new ConfigError(`Browserbase proxy "${name}" is not configured.`);
      const client = requireClient();
      const session = await client.createSession({
        accountName: null,
        contextId: null,
        proxyName: asBrowserbaseProxyName(name),
        region: parseRegion(opts.region),
        keepAlive: true,
        persistContext: false,
        timeoutSeconds: 60,
      }, profile.rules);
      if (!session.ok) throw new ConfigError(session.error.message, session.error.hint);
      await client.releaseSession(session.value.id);
      json({ ok: true, proxy: name, sessionId: session.value.id, status: session.value.status });
    }));

  const account = browserbase.command('account').description('Manage Browserbase account profiles and login state');
  account.command('list')
    .description('List Browserbase account profiles')
    .action(runBrowserbaseAction(() => {
      json(Object.values(requireStore().accounts).map(outputAccount));
    }));

  account.command('get')
    .description('Show a Browserbase account profile')
    .argument('<name>')
    .action(runBrowserbaseAction((name: string) => {
      const profile = requireStore().accounts[asBrowserbaseAccountName(name)];
      if (!profile) throw new ConfigError(`Browserbase account "${name}" is not configured.`);
      json(outputAccount(profile));
    }));

  account.command('create')
    .description('Create one Browserbase account profile and context')
    .argument('<name>')
    .requiredOption('--site <site>')
    .option('--proxy <name>')
    .action(runBrowserbaseAction(async (name: string, opts: { site: string; proxy?: string }) => {
      const result = await createBrowserbaseAccount({
        name: asBrowserbaseAccountName(name),
        site: opts.site,
        proxyName: opts.proxy ? asBrowserbaseProxyName(opts.proxy) : null,
      }, requireDeps());
      if (!result.ok) throw new ConfigError(result.error.message, result.error.hint);
      json(outputAccount(result.value));
    }));

  account.command('bootstrap')
    .description('Create multiple Browserbase account profiles and login sessions')
    .requiredOption('--site <site>')
    .requiredOption('--count <count>')
    .requiredOption('--name-prefix <prefix>')
    .option('--proxy <name>')
    .option('--open', 'Open Live View URLs in the system browser', false)
    .option('--wait', 'Wait for Enter, release login sessions, and mark accounts ready', false)
    .option('--region <region>', 'Browserbase region', DEFAULT_REGION)
    .option('--timeout <seconds>', 'Browserbase session timeout seconds', String(DEFAULT_SESSION_TIMEOUT))
    .action(runBrowserbaseAction(async (opts: { site: string; count: string; namePrefix: string; proxy?: string; open?: boolean; wait?: boolean; region?: string; timeout?: string }) => {
      const deps = requireDeps();
      const count = parsePositiveInteger(opts.count, '--count');
      const timeoutSeconds = parsePositiveInteger(opts.timeout ?? String(DEFAULT_SESSION_TIMEOUT), '--timeout');
      const region = parseRegion(opts.region);
      const sessions: Array<{ account: string; sessionId: string; liveUrl: string }> = [];
      for (let index = 1; index <= count; index += 1) {
        const name = `${opts.namePrefix}-${index}`;
        const created = await createBrowserbaseAccount({
          name: asBrowserbaseAccountName(name),
          site: opts.site,
          proxyName: opts.proxy ? asBrowserbaseProxyName(opts.proxy) : null,
        }, deps);
        if (!created.ok) throw new ConfigError(created.error.message, created.error.hint);
        const login = await openLoginSession(asBrowserbaseAccountName(name), {
          keepAlive: true,
          timeoutSeconds,
          region,
          persistContext: true,
          proxyNameOverride: null,
        }, deps);
        if (!login.ok) throw new ConfigError(login.error.message, login.error.hint);
        sessions.push({ account: name, sessionId: login.value.sessionId, liveUrl: login.value.liveUrl });
        if (opts.open) openExternalUrl(login.value.liveUrl);
      }
      json({ sessions });
      if (opts.wait) {
        await waitForLoginConfirmation('Finish logging in through the Live View URLs, then press Enter to persist contexts and release sessions...');
        for (const session of sessions) {
          await deps.client.releaseSession(asBrowserbaseSessionId(session.sessionId));
          markBrowserbaseAccount(session.account, 'ready');
        }
        json({ ready: sessions.map((session) => session.account) });
      }
    }));

  account.command('login')
    .description('Open a Browserbase Live View session for manual login')
    .argument('<name>')
    .option('--open', 'Open Live View URL in the system browser', false)
    .option('--wait', 'Wait for Enter, release login session, and mark account ready', false)
    .option('--region <region>', 'Browserbase region', DEFAULT_REGION)
    .option('--timeout <seconds>', 'Browserbase session timeout seconds', String(DEFAULT_SESSION_TIMEOUT))
    .action(runBrowserbaseAction(async (name: string, opts: { open?: boolean; wait?: boolean; region?: string; timeout?: string }) => {
      const deps = requireDeps();
      const login = await openLoginSession(asBrowserbaseAccountName(name), {
        keepAlive: true,
        timeoutSeconds: parsePositiveInteger(opts.timeout ?? String(DEFAULT_SESSION_TIMEOUT), '--timeout'),
        region: parseRegion(opts.region),
        persistContext: true,
        proxyNameOverride: null,
      }, deps);
      if (!login.ok) throw new ConfigError(login.error.message, login.error.hint);
      json({ account: name, sessionId: login.value.sessionId, liveUrl: login.value.liveUrl });
      if (opts.open) openExternalUrl(login.value.liveUrl);
      if (opts.wait) {
        await waitForLoginConfirmation('Finish logging in through the Live View URL, then press Enter to persist context and release the session...');
        await deps.client.releaseSession(asBrowserbaseSessionId(login.value.sessionId));
        json(outputAccount(markBrowserbaseAccount(name, 'ready')));
      }
    }));

  account.command('mark')
    .description('Set Browserbase account login state')
    .argument('<name>')
    .requiredOption('--state <state>', 'empty, login-session-open, ready, invalidated, deleted')
    .action(runBrowserbaseAction((name: string, opts: { state: LoginState }) => {
      if (!['empty', 'login-session-open', 'ready', 'invalidated', 'deleted'].includes(opts.state)) {
        throw new ConfigError('--state must be one of: empty, login-session-open, ready, invalidated, deleted.');
      }
      json(outputAccount(markBrowserbaseAccount(name, opts.state)));
    }));

  account.command('check')
    .description('Check a Browserbase account or run a read-only adapter command against it')
    .argument('<name>')
    .option('--command <command>', 'Adapter command, e.g. "reddit whoami"')
    .action(runBrowserbaseAction(async (name: string, opts: { command?: string }) => {
      if (!opts.command) {
        const profile = requireStore().accounts[asBrowserbaseAccountName(name)];
        if (!profile) throw new ConfigError(`Browserbase account "${name}" is not configured.`);
        json(outputAccount(markBrowserbaseAccount(name, profile.loginState, { checked: true })));
        return;
      }
      const parsed = parseCommandString(opts.command);
      const cmd = getRegistry().get(parsed.commandName);
      if (!cmd) throw new ConfigError(`Adapter command "${parsed.commandName}" is not registered.`);
      const result = await executeCommand(cmd, parsed.args, false, {
        prepared: false,
        browserbaseAccount: name,
        browserbasePersistContext: false,
      });
      markBrowserbaseAccount(name, 'ready', { checked: true });
      json({ account: name, ok: true, result });
    }));

  account.command('clear-login')
    .description('Clear account login state by replacing its Browserbase context')
    .argument('<name>')
    .option('--recreate-context', 'Create a fresh context and attach it to the account', false)
    .option('--delete-old-context', 'Delete the old Browserbase context', false)
    .action(runBrowserbaseAction(async (name: string, opts: { recreateContext?: boolean; deleteOldContext?: boolean }) => {
      if (!opts.recreateContext) throw new ConfigError('clear-login currently requires --recreate-context.');
      const cleared = await clearAccountLoginState(asBrowserbaseAccountName(name), {
        recreateContext: true,
        deleteOldContext: opts.deleteOldContext === true,
      }, requireDeps());
      if (!cleared.ok) throw new ConfigError(cleared.error.message, cleared.error.hint);
      json(outputAccount(cleared.value));
    }));

  account.command('delete')
    .description('Delete a Browserbase account profile')
    .argument('<name>')
    .option('--delete-context', 'Delete the remote Browserbase context too', false)
    .action(runBrowserbaseAction(async (name: string, opts: { deleteContext?: boolean }) => {
      const deleted = await deleteBrowserbaseAccount(asBrowserbaseAccountName(name), {
        deleteContext: opts.deleteContext === true,
      }, requireDeps());
      if (!deleted.ok) throw new ConfigError(deleted.error.message, deleted.error.hint);
      json({ deleted: true, account: name, deletedContext: opts.deleteContext === true });
    }));

  account.command('set-proxy')
    .description('Set an account default proxy')
    .argument('<account>')
    .argument('<proxy>')
    .action(runBrowserbaseAction((accountName: string, proxyName: string) => {
      json(outputAccount(setBrowserbaseAccountProxy(accountName, proxyName)));
    }));

  account.command('clear-proxy')
    .description('Remove an account default proxy')
    .argument('<account>')
    .action(runBrowserbaseAction((accountName: string) => {
      json(outputAccount(setBrowserbaseAccountProxy(accountName, null)));
    }));

  const session = browserbase.command('session').description('Manage Browserbase sessions');
  session.command('create')
    .description('Create a Browserbase browser session')
    .option('--account <name>')
    .option('--context-id <id>')
    .option('--proxy <name>')
    .option('--keep-alive', 'Keep the session alive after disconnect', false)
    .option('--print-live-url', 'Fetch and print Browserbase Live View URL', false)
    .option('--region <region>', 'Browserbase region', DEFAULT_REGION)
    .option('--timeout <seconds>', 'Browserbase session timeout seconds', String(DEFAULT_SESSION_TIMEOUT))
    .option('--no-persist-context', 'Do not persist context changes')
    .option('--show-sensitive', 'Show the Browserbase connectUrl in output', false)
    .action(runBrowserbaseAction(async (opts: { account?: string; contextId?: string; proxy?: string; keepAlive?: boolean; printLiveUrl?: boolean; region?: string; timeout?: string; persistContext?: boolean; showSensitive?: boolean }) => {
      const store = requireStore();
      const accountProfile = opts.account ? store.accounts[asBrowserbaseAccountName(opts.account)] : null;
      if (opts.account && !accountProfile) throw new ConfigError(`Browserbase account "${opts.account}" is not configured.`);
      const proxyName: BrowserbaseProxyName | null = opts.proxy
        ? asBrowserbaseProxyName(opts.proxy)
        : accountProfile?.defaultProxyName ?? null;
      const proxyProfile = proxyName ? store.proxies[proxyName] : null;
      if (proxyName && !proxyProfile) throw new ConfigError(`Browserbase proxy "${proxyName}" is not configured.`);
      const client = requireClient();
      const created = await client.createSession({
        accountName: opts.account ? asBrowserbaseAccountName(opts.account) : null,
        contextId: opts.contextId ? asBrowserbaseContextId(opts.contextId) : accountProfile?.contextId ?? null,
        proxyName,
        region: parseRegion(opts.region),
        keepAlive: opts.keepAlive === true,
        persistContext: opts.persistContext !== false,
        timeoutSeconds: parsePositiveInteger(opts.timeout ?? String(DEFAULT_SESSION_TIMEOUT), '--timeout'),
      }, proxyProfile?.rules ?? []);
      if (!created.ok) throw new ConfigError(created.error.message, created.error.hint);
      const liveUrls = opts.printLiveUrl ? await client.getLiveUrls(created.value.id) : null;
      if (liveUrls && !liveUrls.ok) throw new ConfigError(liveUrls.error.message, liveUrls.error.hint);
      json({
        ...outputSessionWithSensitivity(created.value, opts.showSensitive === true),
        liveUrl: liveUrls?.ok ? liveUrls.value.debuggerFullscreenUrl : undefined,
      });
    }));

  session.command('list')
    .description('List Browserbase sessions')
    .option('--show-sensitive', 'Show Browserbase connectUrl values in output', false)
    .action(runBrowserbaseAction(async (opts: { showSensitive?: boolean }) => {
      const listed = await requireClient().listSessions();
      if (!listed.ok) throw new ConfigError(listed.error.message, listed.error.hint);
      json(listed.value.map((item) => outputSessionWithSensitivity(item, opts.showSensitive === true)));
    }));

  session.command('get')
    .description('Show a Browserbase session')
    .argument('<sessionId>')
    .option('--show-sensitive', 'Show the Browserbase connectUrl in output', false)
    .action(runBrowserbaseAction(async (sessionId: string, opts: { showSensitive?: boolean }) => {
      const result = await requireClient().getSession(asBrowserbaseSessionId(sessionId));
      if (!result.ok) throw new ConfigError(result.error.message, result.error.hint);
      json(outputSessionWithSensitivity(result.value, opts.showSensitive === true));
    }));

  session.command('live-url')
    .description('Print Browserbase Live View URL for a session')
    .argument('<sessionId>')
    .action(runBrowserbaseAction(async (sessionId: string) => {
      const result = await requireClient().getLiveUrls(asBrowserbaseSessionId(sessionId));
      if (!result.ok) throw new ConfigError(result.error.message, result.error.hint);
      json(result.value);
    }));

  const releaseSession = runBrowserbaseAction(async (sessionId: string) => {
    const result = await requireClient().releaseSession(asBrowserbaseSessionId(sessionId));
    if (!result.ok) throw new ConfigError(result.error.message, result.error.hint);
    json({ released: true, sessionId });
  });
  session.command('release').description('Release a Browserbase keep-alive session').argument('<sessionId>').action(releaseSession);
  session.command('delete').description('Alias for session release').argument('<sessionId>').action(releaseSession);

  const context = browserbase.command('context').description('Manage Browserbase contexts');
  context.command('create')
    .description('Create a Browserbase context')
    .action(runBrowserbaseAction(async () => {
      const deps = requireDeps();
      const created = await deps.client.createContext(deps.projectId);
      if (!created.ok) throw new ConfigError(created.error.message, created.error.hint);
      json(created.value);
    }));

  context.command('get')
    .description('Show a Browserbase context')
    .argument('<contextId>')
    .action(runBrowserbaseAction(async (contextId: string) => {
      const result = await requireClient().getContext(asBrowserbaseContextId(contextId));
      if (!result.ok) throw new ConfigError(result.error.message, result.error.hint);
      json(result.value);
    }));

  context.command('delete')
    .description('Delete a Browserbase context')
    .argument('<contextId>')
    .action(runBrowserbaseAction(async (contextId: string) => {
      const result = await requireClient().deleteContext(asBrowserbaseContextId(contextId));
      if (!result.ok) throw new ConfigError(result.error.message, result.error.hint);
      json({ deleted: true, contextId });
    }));

  context.command('list-local')
    .description('List contexts referenced by local Browserbase accounts')
    .action(runBrowserbaseAction(() => {
      json(Object.values(requireStore().accounts).map((account) => ({
        account: account.name,
        site: account.site,
        contextId: account.contextId,
        loginState: account.loginState,
      })));
    }));

  account.command('import')
    .description('Import an existing Browserbase context as an account profile')
    .argument('<name>')
    .requiredOption('--site <site>')
    .requiredOption('--context-id <id>')
    .option('--proxy <name>')
    .action(runBrowserbaseAction((name: string, opts: { site: string; contextId: string; proxy?: string }) => {
      const store = requireStore();
      const profile = createLocalAccountProfile(name, opts.site, opts.contextId, opts.proxy ?? null);
      saveStoreOrThrow(upsertAccountProfile(store, profile));
      json(outputAccount(profile));
    }));

  return browserbase;
}
