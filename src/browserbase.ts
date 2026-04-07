/**
 * Browserbase session validation.
 *
 * OpenCLI acts as a consumer — it validates that a Browserbase session exists
 * and is running, then returns the CDP connectUrl. Session creation, proxy
 * configuration, and context management are done externally via `bb` CLI.
 */

const API_BASE = 'https://api.browserbase.com/v1';

export interface BrowserbaseSession {
  id: string;
  status: string;
  connectUrl: string;
}

/**
 * Validate that a Browserbase session exists and is running.
 * Returns the CDP WebSocket connectUrl for the session.
 *
 * Throws with actionable error messages if anything is wrong.
 */
export async function validateSession(sessionId: string): Promise<BrowserbaseSession> {
  const apiKey = process.env.BROWSERBASE_API_KEY;
  if (!apiKey) {
    throw new Error(
      'BROWSERBASE_API_KEY not set.\n' +
      '  Set it with: export BROWSERBASE_API_KEY=your_key\n' +
      '  Get your key at: https://browserbase.com/settings'
    );
  }

  const res = await fetch(`${API_BASE}/sessions/${sessionId}`, {
    headers: { 'x-bb-api-key': apiKey },
  });

  if (res.status === 404 || res.status === 400) {
    throw new Error(
      `Browserbase session "${sessionId}" not found.\n` +
      '  Create one with: bb sessions create'
    );
  }

  if (!res.ok) {
    throw new Error(`Browserbase API error: HTTP ${res.status}`);
  }

  const data = await res.json() as Record<string, unknown>;
  const status = data.status as string;

  if (status !== 'RUNNING') {
    const hints: Record<string, string> = {
      TIMED_OUT: 'Create a new one with: bb sessions create --timeout 3600',
      ERROR: 'Check status with: bb sessions get ' + sessionId,
      COMPLETED: 'Create a new one with: bb sessions create',
      PENDING: 'Wait for it to start, or create a new one with: bb sessions create',
    };
    throw new Error(
      `Browserbase session "${sessionId}" is ${status}.\n` +
      `  ${hints[status] || 'Create a new session with: bb sessions create'}`
    );
  }

  return {
    id: sessionId,
    status,
    connectUrl: data.connectUrl as string,
  };
}

/**
 * Resolve session ID from --session flag or BROWSERBASE_SESSION_ID env var.
 * Returns null if neither is set.
 */
export function resolveSessionId(cliSessionArg?: string): string | null {
  return cliSessionArg || process.env.BROWSERBASE_SESSION_ID || null;
}
