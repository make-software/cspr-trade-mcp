// Input validation for MCP tools. Runs before any RPC call.
// Returns null if valid, or an error string if invalid.

/**
 * Validate that a string represents a positive number.
 * Returns null if valid, error message if invalid.
 */
export function validateAmount(value: string, fieldName: string): string | null {
  const trimmed = value.trim();
  if (trimmed === '') {
    return `${fieldName} must be a positive number, got: ""`;
  }
  const num = Number(trimmed);
  if (isNaN(num) || num <= 0) {
    return `${fieldName} must be a positive number, got: "${value}"`;
  }
  return null;
}

/**
 * Validate slippage_bps is within 0-10000 range.
 * Returns null if valid, error message if invalid.
 */
export function validateSlippageBps(value: number): string | null {
  if (value < 0 || value > 10000) {
    return `slippage_bps must be between 0 and 10000, got: ${value}`;
  }
  return null;
}

/**
 * Validate a Casper public key: 66-char hex with 01 (ed25519) or 02 (secp256k1) prefix.
 * Returns null if valid, error message if invalid.
 */
export function validatePublicKey(value: string): string | null {
  const hex66 = /^(01|02)[0-9a-fA-F]{64}$/;
  if (!hex66.test(value)) {
    return `sender_public_key must be a 66-character hex string with 01/02 prefix, got: "${value}"`;
  }
  return null;
}

/**
 * Validate that token_in and token_out are not the same.
 * Returns null if valid, error message if invalid.
 */
export function validateTokensNotEqual(tokenIn: string, tokenOut: string): string | null {
  if (tokenIn.toLowerCase() === tokenOut.toLowerCase()) {
    return `Cannot swap a token for itself (token_in and token_out are both "${tokenIn.toUpperCase()}")`;
  }
  return null;
}

/**
 * Convert a validation error string into an MCP error response.
 */
export function validationErrorResponse(error: string) {
  return {
    isError: true as const,
    content: [{ type: 'text' as const, text: `Validation error: ${error}` }],
  };
}
