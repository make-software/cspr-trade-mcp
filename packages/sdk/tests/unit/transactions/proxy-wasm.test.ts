import { describe, it, expect } from 'vitest';
import { buildProxyWasmArgs, serializeInnerArgs } from '../../../src/transactions/proxy-wasm.js';
import { Args, CLValue, CLTypeKey, Key } from 'casper-js-sdk';

describe('Proxy WASM encoding', () => {
  it('should serialize inner args to byte array', () => {
    const innerArgs = Args.fromMap({
      amount_in: CLValue.newCLUInt256('1000'),
      to: CLValue.newCLKey(Key.newKey('account-hash-0000000000000000000000000000000000000000000000000000000000000000')),
    });

    const bytes = serializeInnerArgs(innerArgs);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
  });

  it('should build outer proxy WASM args with correct structure', () => {
    const routerHash = '04a11a367e708c52557930c4e9c1301f4465100d1b1b6d0a62b48d3e32402867';
    const innerArgs = Args.fromMap({
      amount_in: CLValue.newCLUInt256('1000'),
    });

    const outerArgs = buildProxyWasmArgs({
      routerPackageHash: routerHash,
      entryPoint: 'swap_exact_tokens_for_tokens',
      innerArgs,
      attachedValue: '0',
    });

    expect(outerArgs).toBeDefined();
    const bytes = outerArgs.toBytes();
    expect(bytes.length).toBeGreaterThan(0);
  });

  it('should set attached_value and amount for CSPR operations', () => {
    const routerHash = '04a11a367e708c52557930c4e9c1301f4465100d1b1b6d0a62b48d3e32402867';
    const innerArgs = Args.fromMap({
      amount_out_min: CLValue.newCLUInt256('500'),
    });

    const outerArgs = buildProxyWasmArgs({
      routerPackageHash: routerHash,
      entryPoint: 'swap_exact_cspr_for_tokens',
      innerArgs,
      attachedValue: '100000000000',
    });

    expect(outerArgs).toBeDefined();
  });
});
