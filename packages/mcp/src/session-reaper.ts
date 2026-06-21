/**
 * Idle-session reaping for the HTTP transport.
 *
 * MCP clients that POST an initialize request but never send a clean DELETE
 * (or close the stream) leave a session — and a full server instance — alive
 * forever. Over weeks this leaks memory (observed: 1,198 sessions / 2.5GB on a
 * 34-day-old process). This module reaps sessions idle longer than `idleMs`.
 */

export interface ReapableTransport {
  close?: () => void | Promise<void>;
}

/**
 * Remove sessions whose last activity is older than `idleMs`.
 * Closes the underlying transport (which normally also fires onclose).
 * Returns the session IDs that were reaped.
 */
export function reapIdleSessions(
  transports: Map<string, ReapableTransport>,
  lastSeen: Map<string, number>,
  idleMs: number,
  now: number = Date.now(),
): string[] {
  const reaped: string[] = [];
  for (const [sid, last] of lastSeen) {
    if (now - last <= idleMs) continue;
    const t = transports.get(sid);
    transports.delete(sid);
    lastSeen.delete(sid);
    reaped.push(sid);
    void Promise.resolve(t?.close?.()).catch(() => {});
  }
  return reaped;
}
