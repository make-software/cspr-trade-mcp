import { describe, it, expect } from 'vitest';
import { getNetworkConfig, TESTNET_CONFIG, DEFAULT_SLIPPAGE_BPS, DEFAULT_DEADLINE_MINUTES } from '../../src/config.js';

describe('Network Config', () => {
  it('should return testnet config', () => {
    const config = getNetworkConfig('testnet');
    expect(config.chainName).toBe('casper-test');
    expect(config.apiUrl).toContain('dev.make.services');
    expect(config.routerPackageHash).toMatch(/^hash-/);
    expect(config.wcsprPackageHash).toMatch(/^hash-/);
  });

  it('should return mainnet config', () => {
    const config = getNetworkConfig('mainnet');
    expect(config.chainName).toBe('casper');
    expect(config.routerPackageHash).toMatch(/^hash-/);
  });

  it('should have correct defaults', () => {
    expect(DEFAULT_SLIPPAGE_BPS).toBe(300);
    expect(DEFAULT_DEADLINE_MINUTES).toBe(20);
  });
});
