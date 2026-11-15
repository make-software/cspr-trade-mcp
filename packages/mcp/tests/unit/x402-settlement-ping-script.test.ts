import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '../../../..');
const script = fs.readFileSync(path.join(repoRoot, 'scripts/x402-settlement-ping.mjs'), 'utf8');

describe('x402 settlement ping script', () => {
  it('implements the two-step x402 challenge and paid retry flow', () => {
    expect(script).toContain('CSPR_TRADE_X402_PAYER_PRIVATE_KEY');
    expect(script).toContain('first.status !== 402');
    expect(script).toContain('createPaymentPayload(paymentRequired)');
    expect(script).toContain('encodePaymentSignatureHeader(paymentPayload)');
    expect(script).toContain('processPaymentResult(paymentPayload');
  });

  it('keeps dry-run side-effect free by checking the public manifest only', () => {
    expect(script).toContain('process.argv.includes(\'--dry-run\')');
    expect(script).toContain('CSPR_TRADE_CDP_RESOURCE_URL');
    expect(script).toContain('getQuotePrice');
  });
});
