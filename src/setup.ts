/**
 * setup.ts — Interactive Playwright MCP token setup
 *
 * Discovers the extension token, shows an interactive checkbox
 * for selecting which config files to update, and applies changes.
 */
import * as fs from 'node:fs';
import chalk from 'chalk';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import {
  type DoctorReport,
  discoverExtensionToken,
  getDefaultShellRcPath,
  runBrowserDoctor,
  upsertJsonConfigToken,
  upsertShellToken,
  upsertTomlConfigToken,
} from './doctor.js';
import { getTokenFingerprint } from './browser.js';
import { type CheckboxItem, checkboxPrompt } from './tui.js';

const PLAYWRIGHT_TOKEN_ENV = 'PLAYWRIGHT_MCP_EXTENSION_TOKEN';

function fileExists(p: string): boolean {
  try { return fs.statSync(p).isFile() || fs.statSync(p).isDirectory(); } catch { return false; }
}

function writeFileWithMkdir(filePath: string, content: string) {
  const dir = filePath.substring(0, filePath.lastIndexOf('/'));
  if (dir && !fileExists(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
}

function shortenPath(p: string): string {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  return home && p.startsWith(home) ? '~' + p.slice(home.length) : p;
}

function toolName(p: string): string {
  if (p.includes('.codex/')) return 'Codex';
  if (p.includes('.cursor/')) return 'Cursor';
  if (p.includes('.claude.json')) return 'Claude Code';
  if (p.includes('antigravity')) return 'Antigravity';
  if (p.includes('.gemini/settings')) return 'Gemini CLI';
  if (p.includes('opencode')) return 'OpenCode';
  if (p.includes('Claude/claude_desktop')) return 'Claude Desktop';
  if (p.includes('.vscode/')) return 'VS Code';
  if (p.includes('.mcp.json')) return 'Project MCP';
  if (p.includes('.zshrc') || p.includes('.bashrc') || p.includes('.profile')) return 'Shell';
  return '';
}

export async function runSetup(opts: { cliVersion?: string; token?: string } = {}) {
  console.log();
  console.log(chalk.bold('  opencli setup') + chalk.dim(' — Playwright MCP token configuration'));
  console.log();

  // Step 1: Discover token
  let token = opts.token ?? null;

  if (!token) {
    const extensionToken = discoverExtensionToken();
    const envToken = process.env[PLAYWRIGHT_TOKEN_ENV] ?? null;

    if (extensionToken && envToken && extensionToken === envToken) {
      token = extensionToken;
      console.log(`  ${chalk.green('✓')} Token auto-discovered from Chrome extension`);
      console.log(`    Fingerprint: ${chalk.bold(getTokenFingerprint(token) ?? 'unknown')}`);
    } else if (extensionToken) {
      token = extensionToken;
      console.log(`  ${chalk.green('✓')} Token discovered from Chrome extension ` +
        chalk.dim(`(${getTokenFingerprint(token)})`));
      if (envToken && envToken !== extensionToken) {
        console.log(`  ${chalk.yellow('!')} Environment has different token ` +
          chalk.dim(`(${getTokenFingerprint(envToken)})`));
      }
    } else if (envToken) {
      token = envToken;
      console.log(`  ${chalk.green('✓')} Token from environment variable ` +
        chalk.dim(`(${getTokenFingerprint(token)})`));
    }
  } else {
    console.log(`  ${chalk.green('✓')} Using provided token ` +
      chalk.dim(`(${getTokenFingerprint(token)})`));
  }

  if (!token) {
    console.log(`  ${chalk.yellow('!')} No token found. Please enter it manually.`);
    console.log(chalk.dim('    (Find it in the Playwright MCP Bridge extension → Status page)'));
    console.log();
    const rl = createInterface({ input, output });
    const answer = await rl.question('  Token: ');
    rl.close();
    token = answer.trim();
    if (!token) {
      console.log(chalk.red('\n  No token provided. Aborting.\n'));
      return;
    }
  }

  const fingerprint = getTokenFingerprint(token) ?? 'unknown';
  console.log();

  // Step 2: Scan all config locations
  const report = await runBrowserDoctor({ token, cliVersion: opts.cliVersion });

  // Step 3: Build checkbox items
  const items: CheckboxItem[] = [];

  // Shell file
  const shellPath = report.shellFiles[0]?.path ?? getDefaultShellRcPath();
  const shellStatus = report.shellFiles[0];
  const shellFp = shellStatus?.fingerprint;
  const shellOk = shellFp === fingerprint;
  items.push({
    label: padRight(`${shortenPath(shellPath)}`, 50) + chalk.dim(` [${toolName(shellPath) || 'Shell'}]`),
    value: `shell:${shellPath}`,
    checked: !shellOk,
    status: shellOk ? `configured (${shellFp})` : shellFp ? `mismatch (${shellFp})` : 'missing',
    statusColor: shellOk ? 'green' : shellFp ? 'yellow' : 'red',
  });

  // Config files
  for (const config of report.configs) {
    const fp = config.fingerprint;
    const ok = fp === fingerprint;
    const tool = toolName(config.path);
    items.push({
      label: padRight(`${shortenPath(config.path)}`, 50) + chalk.dim(tool ? ` [${tool}]` : ''),
      value: `config:${config.path}`,
      checked: !ok,
      status: ok ? `configured (${fp})` : !config.exists ? 'will create' : fp ? `mismatch (${fp})` : 'missing',
      statusColor: ok ? 'green' : 'yellow',
    });
  }

  // Step 4: Show interactive checkbox
  const selected = await checkboxPrompt(items, {
    title: `  Select files to update with token ${chalk.cyan(fingerprint)}:`,
  });

  if (selected.length === 0) {
    console.log(chalk.dim('  No changes made.\n'));
    return;
  }

  // Step 5: Apply changes
  const written: string[] = [];

  for (const sel of selected) {
    if (sel.startsWith('shell:')) {
      const path = sel.slice('shell:'.length);
      const before = fileExists(path) ? fs.readFileSync(path, 'utf-8') : '';
      writeFileWithMkdir(path, upsertShellToken(before, token));
      written.push(path);
    } else if (sel.startsWith('config:')) {
      const path = sel.slice('config:'.length);
      const config = report.configs.find(c => c.path === path);
      if (config && config.parseError) continue;
      const before = fileExists(path) ? fs.readFileSync(path, 'utf-8') : '';
      const format = config?.format ?? (path.endsWith('.toml') ? 'toml' : 'json');
      const next = format === 'toml' ? upsertTomlConfigToken(before, token) : upsertJsonConfigToken(before, token);
      writeFileWithMkdir(path, next);
      written.push(path);
    }
  }

  process.env[PLAYWRIGHT_TOKEN_ENV] = token;

  // Step 6: Summary
  if (written.length > 0) {
    console.log(chalk.green.bold(`  ✓ Updated ${written.length} file(s):`));
    for (const p of written) {
      console.log(`    ${chalk.dim('•')} ${shortenPath(p)}`);
    }
  } else {
    console.log(chalk.yellow('  No files were changed.'));
  }
  console.log();
}

function padRight(s: string, n: number): string {
  // Account for ANSI escape codes in length calculation
  const visible = s.replace(/\x1b\[[0-9;]*m/g, '');
  return visible.length >= n ? s : s + ' '.repeat(n - visible.length);
}
