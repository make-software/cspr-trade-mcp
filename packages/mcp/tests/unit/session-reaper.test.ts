import { describe, expect, it, vi } from 'vitest';
import { reapIdleSessions, type ReapableTransport } from '../../src/session-reaper.js';

describe('reapIdleSessions', () => {
  it('removes sessions idle longer than idleMs and closes their transport', () => {
    const closeA = vi.fn();
    const closeB = vi.fn();
    const transports = new Map<string, ReapableTransport>([
      ['a', { close: closeA }],
      ['b', { close: closeB }],
    ]);
    const now = 1_000_000;
    const lastSeen = new Map<string, number>([
      ['a', now - 60_000], // 60s idle — stale
      ['b', now - 5_000], // 5s idle — fresh
    ]);

    const reaped = reapIdleSessions(transports, lastSeen, 30_000, now);

    expect(reaped).toEqual(['a']);
    expect(transports.has('a')).toBe(false);
    expect(lastSeen.has('a')).toBe(false);
    expect(transports.has('b')).toBe(true);
    expect(lastSeen.has('b')).toBe(true);
    expect(closeA).toHaveBeenCalledTimes(1);
    expect(closeB).not.toHaveBeenCalled();
  });

  it('treats exactly idleMs as still alive (boundary)', () => {
    const transports = new Map<string, ReapableTransport>([['a', {}]]);
    const now = 500;
    const lastSeen = new Map<string, number>([['a', now - 30_000]]);

    const reaped = reapIdleSessions(transports, lastSeen, 30_000, now);

    expect(reaped).toEqual([]);
    expect(transports.has('a')).toBe(true);
  });

  it('reaps the full set when all sessions are abandoned (the 1198-session scenario)', () => {
    const transports = new Map<string, ReapableTransport>();
    const lastSeen = new Map<string, number>();
    const now = 10_000_000;
    for (let i = 0; i < 1198; i++) {
      transports.set(String(i), { close: vi.fn() });
      lastSeen.set(String(i), now - 3_000_000); // all very stale
    }

    const reaped = reapIdleSessions(transports, lastSeen, 1_800_000, now);

    expect(reaped).toHaveLength(1198);
    expect(transports.size).toBe(0);
    expect(lastSeen.size).toBe(0);
  });

  it('tolerates a transport without a close method', () => {
    const transports = new Map<string, ReapableTransport>([['a', {}]]);
    const lastSeen = new Map<string, number>([['a', 0]]);

    expect(() => reapIdleSessions(transports, lastSeen, 1, 1_000_000)).not.toThrow();
    expect(transports.size).toBe(0);
  });
});
