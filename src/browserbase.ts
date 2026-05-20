import { BrowserbaseClient, parseBrowserbaseSessionId, resolveBrowserbaseConfig } from './browserbase/client.js';
export * from './browserbase/types.js';
export * from './browserbase/client.js';
export * from './browserbase/config-store.js';
export * from './browserbase/account.js';
export * from './browserbase/pool.js';

export interface BrowserbaseSession {
  id: string;
  status: string;
  connectUrl: string;
}

export function resolveBrowserbaseSessionId(cliSessionArg?: string): string | null {
  const fromArg = cliSessionArg?.trim();
  if (fromArg) return fromArg;
  const fromEnv = process.env.BROWSERBASE_SESSION_ID?.trim();
  return fromEnv || null;
}

export async function validateBrowserbaseSession(sessionId: string): Promise<BrowserbaseSession> {
  const config = resolveBrowserbaseConfig();
  if (!config.ok) {
    throw new Error(
      'BROWSERBASE_API_KEY not set.\n'
      + '  Set it with: export BROWSERBASE_API_KEY=your_key\n'
      + '  Get your key at: https://browserbase.com/settings',
    );
  }

  const parsedSessionId = parseBrowserbaseSessionId(sessionId);
  if (!parsedSessionId.ok) {
    throw new Error(parsedSessionId.error.message);
  }

  const client = new BrowserbaseClient(config.value);
  const session = await client.getSession(parsedSessionId.value);
  if (!session.ok) {
    if (session.error.code === 'NOT_FOUND') {
      throw new Error(
        `Browserbase session "${sessionId}" not found.\n`
        + '  Create one with: opencli browserbase session create',
      );
    }
    throw new Error(session.error.message);
  }

  if (session.value.status !== 'RUNNING') {
    const hints: Record<string, string> = {
      TIMED_OUT: 'Create a new one with: opencli browserbase session create --timeout 3600',
      ERROR: `Check status with: opencli browserbase session get ${sessionId}`,
      COMPLETED: 'Create a new one with: opencli browserbase session create',
      PENDING: 'Wait for it to start, or create a new one with: opencli browserbase session create',
    };
    throw new Error(
      `Browserbase session "${sessionId}" is ${session.value.status || 'UNKNOWN'}.\n`
      + `  ${hints[session.value.status] || 'Create a new session with: opencli browserbase session create'}`,
    );
  }

  if (!session.value.connectUrl) {
    throw new Error(`Browserbase session "${sessionId}" did not include a connectUrl.`);
  }

  return {
    id: sessionId,
    status: session.value.status,
    connectUrl: session.value.connectUrl,
  };
}
