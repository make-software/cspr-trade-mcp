import { describe, it, expect } from 'vitest';
import { getProxyCallerWasm } from '../../../src/assets/index.js';

describe('getProxyCallerWasm', () => {
  it('should load the proxy_caller.wasm binary', async () => {
    const wasm = await getProxyCallerWasm();
    expect(wasm).toBeInstanceOf(Uint8Array);
    expect(wasm.length).toBeGreaterThan(0);
    // WASM magic bytes: \0asm
    expect(wasm[0]).toBe(0x00);
    expect(wasm[1]).toBe(0x61); // 'a'
    expect(wasm[2]).toBe(0x73); // 's'
    expect(wasm[3]).toBe(0x6d); // 'm'
  });

  it('should cache the binary on subsequent calls', async () => {
    const wasm1 = await getProxyCallerWasm();
    const wasm2 = await getProxyCallerWasm();
    expect(wasm1).toBe(wasm2); // same reference
  });
});
