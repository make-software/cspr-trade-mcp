import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '../../../..');
const script = fs.readFileSync(path.join(repoRoot, 'scripts/cspr-trade-x402-activity-cron.sh'), 'utf8');

describe('x402 activity cron wrapper', () => {
  it('runs the paid settlement ping only when a payer key has been configured', () => {
    expect(script).toContain('CSPR_TRADE_X402_PAYER_ENV_FILE');
    expect(script).toContain('CSPR_TRADE_X402_PAYER_PRIVATE_KEY');
    expect(script).toContain('npm run x402:settlement-ping');
  });

  it('falls back to a side-effect-free dry-run while wallet custody/funding is blocked', () => {
    expect(script).toContain('BLOCKED: CSPR_TRADE_X402_PAYER_PRIVATE_KEY is not configured');
    expect(script).toContain('npm run x402:settlement-ping -- --dry-run');
    expect(script).toContain('Michael confirms wallet custody/funding');
  });
});
