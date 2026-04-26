// — Validation Module
// Input validation for MCP tools. Runs before any RPC call.

export type ValidationResult =
  | { valid: true }
  | { valid: false; error: string };

/**
 * Validate that a string represents a positive number.
 */
export function validateAmount(value: string, fieldName: string): ValidationResult {
  const trimmed = value.trim();
  if (trimmed === '') {
    return { valid: false, error: `${fieldName} must be a positive number, got: "${value}"` };
  }
  const num = Number(trimmed);
  if (isNaN(num) || num <= 0) {
    return { valid: false, error: `${fieldName} must be a positive number, got: "${value}"` };
  }
  return { valid: true };
}

/**
 * Validate slippage_bps is within 0-10000 range.
 */
export function validateSlippageBps(value: number): ValidationResult {
  if (value < 0 || value > 10000) {
    return { valid: false, error: `slippage_bps must be between 0 and 10000, got: ${value}` };
  }
  return { valid: true };
}

/**
 * Validate a Casper public key: 66-char hex with 01 (ed25519) or 02 (secp256k1) prefix.
 */
export function validatePublicKey(value: string): ValidationResult {
  const hex66 = /^(01|02)[0-9a-fA-F]{64}$/;
  if (!hex66.test(value)) {
    return {
      valid: false,
      error: `sender_public_key must be a 66-character hex string with 01/02 prefix, got: "${value}"`,
    };
  }
  return { valid: true };
}

/**
 * Validate that token_in and token_out are not the same.
 */
export function validateTokensNotEqual(tokenIn: string, tokenOut: string): ValidationResult {
  if (tokenIn.toLowerCase() === tokenOut.toLowerCase()) {
    return {
      valid: false,
      error: `Cannot swap a token for itself (token_in and token_out are both "${tokenIn.toUpperCase()}")`,
    };
  }
  return { valid: true };
}

/**
 * Helper to run multiple validations and return the first failure, or null if all pass.
 */
export function firstFailure(...results: ValidationResult[]): ValidationResult | null {
  for (const r of results) {
    if (!r.valid) return r;
  }
  return null;
}

/**
 * Structured validation error that formats as an MCP tool error response.
 */
export class ValidationError {
  constructor(public readonly message: string) {}

  toMcpResponse() {
    return {
      isError: true,
      content: [{ type: 'text' as const, text: `Validation error: ${this.message}` }],
    };
  }
}

/**
 * Convert a failed ValidationResult into an MCP error response.
 */
export function validationErrorResponse(error: string) {
  return {
    isError: true as const,
    content: [{ type: 'text' as const, text: `Validation error: ${error}` }],
  };
}
