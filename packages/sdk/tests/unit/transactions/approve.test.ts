import { describe, it, expect } from 'vitest';
import { buildApproveArgs } from '../../../src/transactions/approve.js';

describe('Approve transaction builder', () => {
  it('should build approve args with spender and amount', () => {
    const args = buildApproveArgs({
      spenderPackageHash: 'hash-04a11a367e708c52557930c4e9c1301f4465100d1b1b6d0a62b48d3e32402867',
      amount: '100000000000',
    });
    const bytes = args.toBytes();
    expect(bytes.length).toBeGreaterThan(0);
  });
});
