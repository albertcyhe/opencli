import * as fs from 'node:fs';
import { Command, InvalidArgumentError } from 'commander';
import { executeCommand } from '../execution.js';
import { EXIT_CODES, ConfigError, getErrorMessage } from '../errors.js';
import { getRegistry } from '../registry.js';
import { mapConcurrent } from '../utils.js';
import {
  BrowserbaseAccountSessionPool,
  BrowserbaseClient,
  asBrowserbaseAccountName,
  loadBrowserbaseStore,
  resolveBrowserbaseConfig,
  type BrowserbaseAccountName,
  type BrowserbaseRegion,
  type CommandArgsMap,
  type RunJobSpec,
} from '../browserbase.js';

const DEFAULT_REGION: BrowserbaseRegion = 'us-west-2';
const DEFAULT_TIMEOUT_SECONDS = 1800;

interface RawRunJob {
  readonly id?: unknown;
  readonly command?: unknown;
  readonly args?: unknown;
  readonly account?: unknown;
  readonly accountName?: unknown;
  readonly timeoutSeconds?: unknown;
}

function parsePositiveInteger(value: string | undefined, label: string, fallback: number): number {
  if (value === undefined) return fallback;
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
  throw new InvalidArgumentError('--region must be one of: us-west-2, us-east-1, eu-central-1, ap-southeast-1.');
}

function parseAccounts(raw: string | undefined): BrowserbaseAccountName[] {
  if (!raw?.trim()) return [];
  return raw.split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map(asBrowserbaseAccountName);
}

function parseArgsMap(value: unknown): CommandArgsMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const args: Record<string, string | number | boolean | null> = {};
  for (const [key, argValue] of Object.entries(value as Record<string, unknown>)) {
    if (
      typeof argValue === 'string'
      || typeof argValue === 'number'
      || typeof argValue === 'boolean'
      || argValue === null
    ) {
      args[key] = argValue;
    }
  }
  return args;
}

function parseRunPlanJsonl(text: string): RunJobSpec[] {
  const jobs: RunJobSpec[] = [];
  const seen = new Set<string>();
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;
    let raw: RawRunJob;
    try {
      raw = JSON.parse(line) as RawRunJob;
    } catch (error) {
      throw new ConfigError(`Invalid JSON on jobs line ${index + 1}: ${getErrorMessage(error)}`);
    }
    if (typeof raw.id !== 'string' || !raw.id.trim()) throw new ConfigError(`jobs line ${index + 1} is missing string id.`);
    if (typeof raw.command !== 'string' || !raw.command.trim()) throw new ConfigError(`jobs line ${index + 1} is missing string command.`);
    if (seen.has(raw.id)) throw new ConfigError(`Duplicate job id "${raw.id}".`);
    seen.add(raw.id);
    const timeoutSeconds = typeof raw.timeoutSeconds === 'number' && Number.isFinite(raw.timeoutSeconds) && raw.timeoutSeconds > 0
      ? Math.trunc(raw.timeoutSeconds)
      : null;
    const accountRaw = typeof raw.accountName === 'string' && raw.accountName.trim()
      ? raw.accountName
      : typeof raw.account === 'string' && raw.account.trim()
        ? raw.account
        : null;
    jobs.push({
      id: raw.id,
      command: raw.command,
      args: parseArgsMap(raw.args),
      accountName: accountRaw ? asBrowserbaseAccountName(accountRaw) : null,
      timeoutSeconds,
    });
  }
  return jobs;
}

function commandKey(command: string): string {
  const parts = command.trim().split(/\s+/);
  if (parts.length < 2) throw new ConfigError(`Job command "${command}" must start with "<site> <command>".`);
  return `${parts[0]}/${parts[1]}`;
}

function emitRunEvent(event: Record<string, unknown>): void {
  console.log(JSON.stringify({ at: new Date().toISOString(), ...event }));
}

export function registerRunCommand(program: Command): Command {
  return program.command('run')
    .description('Run a JSONL batch of adapter jobs')
    .argument('<jobsJsonl>', 'JSONL file with one job per line')
    .option('--browserbase', 'Run browser jobs through Browserbase account sessions', false)
    .option('--accounts <names>', 'Comma-separated Browserbase account names')
    .option('--parallel <n>', 'Maximum concurrent jobs', '1')
    .option('--pool-size <n>', 'Maximum Browserbase sessions to create at once')
    .option('--region <region>', 'Browserbase region', DEFAULT_REGION)
    .option('--timeout <seconds>', 'Default Browserbase session timeout seconds', String(DEFAULT_TIMEOUT_SECONDS))
    .option('--keep-alive', 'Keep job sessions alive after each job', false)
    .option('--no-persist-context', 'Do not persist context changes after job sessions')
    .action(async (jobsJsonl: string, opts: {
      browserbase?: boolean;
      accounts?: string;
      parallel?: string;
      poolSize?: string;
      region?: string;
      timeout?: string;
      keepAlive?: boolean;
      persistContext?: boolean;
    }) => {
      try {
        if (!opts.browserbase) throw new ConfigError('opencli run currently requires --browserbase.');
        const accounts = parseAccounts(opts.accounts);
        if (accounts.length === 0) throw new ConfigError('--accounts is required for --browserbase runs.');
        const parallel = parsePositiveInteger(opts.parallel, '--parallel', 1);
        const poolSize = Math.min(10, parsePositiveInteger(opts.poolSize, '--pool-size', parallel));
        const region = parseRegion(opts.region);
        const defaultTimeoutSeconds = parsePositiveInteger(opts.timeout, '--timeout', DEFAULT_TIMEOUT_SECONDS);
        const config = resolveBrowserbaseConfig();
        if (!config.ok) throw new ConfigError(config.error.message, config.error.hint);
        const store = loadBrowserbaseStore();
        if (!store.ok) throw new ConfigError(store.error.message, store.error.hint);
        for (const account of accounts) {
          if (!store.value.accounts[account]) throw new ConfigError(`Browserbase account "${account}" is not configured.`);
        }
        const jobs = parseRunPlanJsonl(fs.readFileSync(jobsJsonl, 'utf-8'));
        const pool = new BrowserbaseAccountSessionPool(new BrowserbaseClient(config.value), {
          store: store.value,
          maxSessions: poolSize,
        });
        let failures = 0;
        await mapConcurrent(jobs, Math.min(parallel, jobs.length || 1), async (job, index) => {
          const accountName = job.accountName ?? accounts[index % accounts.length];
          const key = commandKey(job.command);
          const cmd = getRegistry().get(key);
          if (!cmd) {
            failures += 1;
            emitRunEvent({ type: 'failed', jobId: job.id, accountName, error: `Adapter command "${key}" is not registered.` });
            return;
          }
          emitRunEvent({ type: 'queued', jobId: job.id, accountName, command: key });
          const lease = await pool.acquire({
            accountName,
            keepAlive: opts.keepAlive === true,
            persistContext: opts.persistContext !== false,
            timeoutSeconds: job.timeoutSeconds ?? defaultTimeoutSeconds,
            region,
          });
          if (!lease.ok) {
            failures += 1;
            emitRunEvent({ type: 'failed', jobId: job.id, accountName, error: lease.error.message });
            return;
          }
          emitRunEvent({ type: 'started', jobId: job.id, accountName, sessionId: lease.value.sessionId });
          const started = Date.now();
          try {
            const result = await executeCommand(cmd, job.args, false, {
              prepared: false,
              cdpEndpoint: lease.value.connectUrl,
            });
            await pool.release(lease.value, { status: 'success' });
            emitRunEvent({ type: 'succeeded', jobId: job.id, accountName, durationMs: Date.now() - started, result });
          } catch (error) {
            failures += 1;
            await pool.release(lease.value, { status: 'failed', errorMessage: getErrorMessage(error) });
            emitRunEvent({ type: 'failed', jobId: job.id, accountName, durationMs: Date.now() - started, error: getErrorMessage(error) });
          }
        });
        await pool.close();
        emitRunEvent({ type: 'summary', jobs: jobs.length, failures });
        process.exitCode = failures > 0 ? EXIT_CODES.GENERIC_ERROR : EXIT_CODES.SUCCESS;
      } catch (error) {
        console.error(`Error: ${getErrorMessage(error)}`);
        process.exitCode = error instanceof ConfigError ? error.exitCode : EXIT_CODES.GENERIC_ERROR;
      }
    });
}
