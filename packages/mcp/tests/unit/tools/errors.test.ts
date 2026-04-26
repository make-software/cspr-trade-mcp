import { describe, it, expect } from 'vitest';
import { formatActionableError, withActionableErrors } from '../../../src/tools/errors.js';

class FakeHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'HttpClientError';
  }
}

describe('formatActionableError', () => {
  it('returns actionable hint for token-not-found errors', () => {
    const msg = formatActionableError(new Error('Token not found: "XYZ". Use a token symbol'));
    expect(msg).toContain('"XYZ"');
    expect(msg).toContain('get_tokens');
  });

  it('returns actionable hint when token name is quoted', () => {
    const msg = formatActionableError(new Error('Token not found: "BADTOKEN"'));
    expect(msg).toContain('"BADTOKEN"');
    expect(msg).toContain('get_tokens');
  });

  it('returns actionable hint for no-liquidity-pool errors', () => {
    const msg = formatActionableError(new Error('No liquidity pool found for CSPR/USDT'));
    expect(msg).toContain('get_pairs');
  });

  it('returns rate-limit hint for HTTP 429', () => {
    const err = new FakeHttpError('Too Many Requests', 429);
    const msg = formatActionableError(err);
    expect(msg).toContain('rate limit');
    expect(msg).toContain('Wait');
  });

  it('returns rate-limit hint when message contains 429', () => {
    const msg = formatActionableError(new Error('HTTP 429 rate limit exceeded'));
    expect(msg).toContain('rate limit');
  });

  it('returns server-error hint for HTTP 500', () => {
    const err = new FakeHttpError('Internal Server Error', 500);
    const msg = formatActionableError(err);
    expect(msg).toContain('temporarily unavailable');
    expect(msg).toContain('Retry');
  });

  it('returns server-error hint for HTTP 503', () => {
    const err = new FakeHttpError('Service Unavailable', 503);
    const msg = formatActionableError(err);
    expect(msg).toContain('temporarily unavailable');
  });

  it('returns network-error hint for ECONNREFUSED', () => {
    const msg = formatActionableError(new Error('fetch failed: ECONNREFUSED'));
    expect(msg).toContain('Network request failed');
    expect(msg).toContain('network connectivity');
  });

  it('returns network-error hint for fetch failed', () => {
    const msg = formatActionableError(new Error('fetch failed'));
    expect(msg).toContain('Network request failed');
  });

  it('returns generic error for unknown errors', () => {
    const msg = formatActionableError(new Error('something completely unexpected'));
    expect(msg).toContain('Error:');
    expect(msg).toContain('something completely unexpected');
  });

  it('handles non-Error throwables', () => {
    const msg = formatActionableError('plain string error');
    expect(msg).toContain('plain string error');
  });
});

describe('withActionableErrors', () => {
  it('returns handler result on success', async () => {
    const args = { value: 42 };
    const result = await withActionableErrors(args, async (a) => ({
      content: [{ type: 'text' as const, text: String(a.value) }],
    }));
    expect(result.content[0].text).toBe('42');
  });

  it('catches thrown errors and returns actionable text', async () => {
    const result = await withActionableErrors({}, async () => {
      throw new Error('Token not found: "ABC"');
    });
    expect(result.content[0].text).toContain('get_tokens');
    expect(result.content[0].text).not.toThrow;
  });

  it('catches rate-limit errors from handler', async () => {
    const result = await withActionableErrors({}, async () => {
      const err = new FakeHttpError('Rate limited', 429);
      throw err;
    });
    expect(result.content[0].text).toContain('rate limit');
  });
});
