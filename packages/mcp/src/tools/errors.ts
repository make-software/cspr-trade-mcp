/**
 * Actionable error messages for MCP tools.
 *
 * When an SDK call throws, the raw error message is often generic
 * ("request failed", "HTTP 429"). This module catches known error patterns
 * and returns structured, actionable messages so AI agents know what to do next.
 */

type McpToolContent = { content: Array<{ type: 'text'; text: string }> };

/**
 * Wrap an MCP tool handler so that unhandled errors are caught and returned
 * as actionable messages rather than crashing the tool call.
 *
 * Usage:
 *   async (args) => withActionableErrors(args, async () => {
 *     return { content: [{ type: 'text', text: ... }] };
 *   })
 */
export async function withActionableErrors<T>(
  args: T,
  handler: (args: T) => Promise<McpToolContent>,
): Promise<McpToolContent> {
  try {
    return await handler(args);
  } catch (err: unknown) {
    return { content: [{ type: 'text' as const, text: formatActionableError(err) }] };
  }
}

/**
 * Classify a thrown error and return an actionable hint for the AI agent.
 */
export function formatActionableError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);

  // --- Token not found ---
  if (/token not found/i.test(message)) {
    const tokenMatch = message.match(/"([^"]+)"/);
    const token = tokenMatch ? tokenMatch[1] : 'the specified token';
    return (
      `Error: Token "${token}" was not recognised.\n` +
      `Action: Call get_tokens to list all tradable tokens and find the correct symbol or contract hash.`
    );
  }

  // --- No liquidity pool ---
  if (/no liquidity pool found/i.test(message)) {
    return (
      `Error: ${message}\n` +
      `Action: Call get_pairs to list available trading pairs and verify both tokens are listed.`
    );
  }

  // --- HTTP 429 rate limit ---
  if (isHttpStatus(err, 429) || /429|rate.?limit|too many requests/i.test(message)) {
    return (
      `Error: CSPR.trade API rate limit reached.\n` +
      `Action: Wait a few seconds and retry the request. If the error persists, reduce request frequency.`
    );
  }

  // --- HTTP 5xx server error ---
  if (isHttpStatus(err, [500, 502, 503, 504]) || /5\d\d|server error|unavailable|bad gateway/i.test(message)) {
    return (
      `Error: CSPR.trade API is temporarily unavailable (${message}).\n` +
      `Action: Retry in a few seconds. If the error persists, the service may be under maintenance.`
    );
  }

  // --- Network / fetch error ---
  if (
    /fetch failed|network error|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET/i.test(message)
  ) {
    return (
      `Error: Network request failed — cannot reach the CSPR.trade API.\n` +
      `Action: Check network connectivity and retry. If using a self-hosted deployment, verify the API URL configuration.`
    );
  }

  // --- Invalid public key format ---
  if (/invalid.*public.?key|malformed.*key|public key/i.test(message)) {
    return (
      `Error: Invalid public key format — ${message}\n` +
      `Action: Provide a hex-encoded public key with algorithm prefix (e.g., "01abc..." for Ed25519 or "02abc..." for secp256k1).`
    );
  }

  // --- Casper node RPC error ---
  if (/rpc|node|casper.*error/i.test(message)) {
    return (
      `Error: Casper node RPC error — ${message}\n` +
      `Action: Verify the transaction is correctly formed. For submit_transaction, ensure the deploy is fully signed before submitting.`
    );
  }

  // --- Generic fallback ---
  return `Error: ${message}`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type HttpErrorLike = { status?: number };

function isHttpStatus(err: unknown, status: number | number[]): boolean {
  if (err == null || typeof err !== 'object') return false;
  const s = (err as HttpErrorLike).status;
  if (typeof s !== 'number') return false;
  return Array.isArray(status) ? status.includes(s) : s === status;
}
