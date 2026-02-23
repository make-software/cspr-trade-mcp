# CSPR.trade MCP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a TypeScript SDK and MCP server that enables AI agents to interact with the CSPR.trade DEX on Casper Network — reading market data, composing trades, managing liquidity — all non-custodially.

**Architecture:** Monorepo with two packages: `@cspr-trade/sdk` (TypeScript SDK wrapping the cspr-trade-api and building Casper transactions) and `@cspr-trade/mcp` (MCP server exposing SDK functions as tools). Transactions are built locally using `proxy_caller.wasm` + `casper-js-sdk` v5, returned unsigned for external signing, then submitted via the API.

**Tech Stack:** TypeScript 5.x, Vitest, casper-js-sdk v5, @modelcontextprotocol/sdk, big.js, blakejs

**Reference source code:** The frontend at `github.com/make-software/cspr-trade` is the authoritative reference for transaction building patterns. Key files: `src/services/ContractService.ts` (transaction building), `src/services/TransactionService.ts` (deploy/tx creation), `src/utils/constants.ts` (gas costs, defaults), `src/utils/amounts/slippage.ts` (slippage math).

---

## Phase 1: Project Scaffolding

### Task 1: Initialize monorepo and install dependencies

**Files:**
- Create: `package.json` (workspace root)
- Create: `tsconfig.base.json`
- Create: `packages/sdk/package.json`
- Create: `packages/sdk/tsconfig.json`
- Create: `packages/mcp/package.json`
- Create: `packages/mcp/tsconfig.json`
- Create: `vitest.workspace.ts`
- Create: `.gitignore`

**Step 1: Create workspace root package.json**

```json
{
  "name": "cspr-trade-mcp",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "npm run build --workspaces",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc --noEmit --workspaces"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

**Step 2: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

**Step 3: Create packages/sdk/package.json**

```json
{
  "name": "@cspr-trade/sdk",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "casper-js-sdk": "^5.0.6",
    "big.js": "^6.2.2",
    "blakejs": "^1.2.1",
    "@noble/hashes": "^1.7.0"
  },
  "devDependencies": {
    "@types/big.js": "^6.2.2",
    "tsup": "^8.0.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

**Step 4: Create packages/sdk/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["tests/**/*", "dist/**/*"]
}
```

**Step 5: Create packages/mcp/package.json**

```json
{
  "name": "@cspr-trade/mcp",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "cspr-trade-mcp": "dist/index.js"
  },
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@cspr-trade/sdk": "workspace:*",
    "@modelcontextprotocol/sdk": "^1.0.0"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

**Step 6: Create packages/mcp/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["tests/**/*", "dist/**/*"]
}
```

**Step 7: Create vitest.workspace.ts**

```typescript
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/sdk',
  'packages/mcp',
]);
```

**Step 8: Create .gitignore**

```
node_modules/
dist/
*.tsbuildinfo
.env
.env.local
```

**Step 9: Install dependencies**

Run: `npm install`
Expected: Successful install with no errors

**Step 10: Verify TypeScript compiles**

Run: `npx tsc --noEmit -p packages/sdk/tsconfig.json`
Expected: No errors (empty project)

**Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold monorepo with sdk and mcp packages"
```

---

### Task 2: Fetch and bundle proxy_caller.wasm

The SDK needs the `proxy_caller.wasm` binary that the frontend uses for all DEX operations. This WASM file is deployed as a session module to wrap contract calls.

**Files:**
- Create: `packages/sdk/src/assets/proxy_caller.wasm` (binary, fetched from frontend repo)
- Create: `packages/sdk/src/assets/index.ts` (loader)

**Step 1: Fetch the WASM binary from the frontend repo**

```bash
gh api "repos/make-software/cspr-trade/contents/src/assets/proxy_caller.wasm" --jq '.content' | base64 -d > packages/sdk/src/assets/proxy_caller.wasm
```

**Step 2: Create the WASM loader**

Create `packages/sdk/src/assets/index.ts`:

```typescript
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

let cachedWasm: Uint8Array | null = null;

export async function getProxyCallerWasm(): Promise<Uint8Array> {
  if (cachedWasm) return cachedWasm;

  const currentDir = dirname(fileURLToPath(import.meta.url));
  const wasmPath = join(currentDir, 'proxy_caller.wasm');
  const buffer = await readFile(wasmPath);
  cachedWasm = new Uint8Array(buffer);
  return cachedWasm;
}
```

**Step 3: Write a test to verify the WASM loads**

Create `packages/sdk/tests/unit/assets/proxy-caller.test.ts`:

```typescript
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
```

**Step 4: Run test**

Run: `npx vitest run packages/sdk/tests/unit/assets/proxy-caller.test.ts`
Expected: PASS

**Step 5: Update tsup config to copy WASM file**

Update `packages/sdk/package.json` build script:
```json
"build": "tsup src/index.ts --format esm --dts && cp src/assets/proxy_caller.wasm dist/assets/"
```

**Step 6: Commit**

```bash
git add packages/sdk/src/assets/ packages/sdk/tests/unit/assets/
git commit -m "feat(sdk): add proxy_caller.wasm binary and loader"
```

---

## Phase 2: SDK Types & Configuration

### Task 3: Define all SDK types

**Files:**
- Create: `packages/sdk/src/types/token.ts`
- Create: `packages/sdk/src/types/pair.ts`
- Create: `packages/sdk/src/types/quote.ts`
- Create: `packages/sdk/src/types/liquidity.ts`
- Create: `packages/sdk/src/types/transaction.ts`
- Create: `packages/sdk/src/types/api.ts`
- Create: `packages/sdk/src/types/index.ts`

**Step 1: Create type files**

Create `packages/sdk/src/types/api.ts`:

```typescript
/** Generic API success response */
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status?: string;
}

/** Paginated API response */
export interface PaginatedApiResponse<T> {
  data: T[];
  item_count: number;
  page_count: number;
}

/** API error */
export interface ApiError {
  code: number;
  message: string;
  status?: number;
}

/** Pagination options */
export interface PaginationOptions {
  page?: number;
  page_size?: number;
}

/** Sort options */
export interface SortOptions {
  order_by?: string;
  order_direction?: 'asc' | 'desc';
}
```

Create `packages/sdk/src/types/token.ts`:

```typescript
/** Contract package metadata from CSPR.cloud */
export interface ContractPackage {
  contract_package_hash: string;
  owner_public_key: string;
  name: string;
  description: string | null;
  metadata: TokenMetadata;
  icon_url: string | null;
  website_url: string | null;
  latest_version_contract_hash: string | null;
  csprtrade_data: { price: number } | null;
}

export interface TokenMetadata {
  balances_uref: string;
  decimals: number;
  name: string;
  symbol: string;
  total_supply_uref: string;
}

/** Token as returned by GET /tokens */
export interface TokenApiResponse {
  contract_package_hash: string;
  contract_package: ContractPackage;
  listed_at: string;
  sorting_order: number;
  total_value_locked?: string;
}

/** Resolved token for SDK consumption */
export interface Token {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  packageHash: string;
  iconUrl: string | null;
  fiatPrice: number | null;
}

/** Currency for fiat display */
export interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
}
```

Create `packages/sdk/src/types/pair.ts`:

```typescript
import type { ContractPackage } from './token.js';

/** Pair as returned by API */
export interface PairApiResponse {
  contract_package_hash: string;
  token0_contract_package_hash: string;
  token1_contract_package_hash: string;
  decimals0: number;
  decimals1: number;
  reserve0: string;
  reserve1: string;
  timestamp: string;
  latest_event_id: string;
  contract_package: ContractPackage;
  token0_contract_package: ContractPackage;
  token1_contract_package: ContractPackage;
}

/** Pair for SDK consumption */
export interface Pair {
  contractPackageHash: string;
  token0: { packageHash: string; symbol: string; name: string; decimals: number; iconUrl: string | null };
  token1: { packageHash: string; symbol: string; name: string; decimals: number; iconUrl: string | null };
  reserve0: string;
  reserve1: string;
  timestamp: string;
  fiatPrice0: number | null;
  fiatPrice1: number | null;
}
```

Create `packages/sdk/src/types/quote.ts`:

```typescript
/** Quote API response */
export interface QuoteApiResponse {
  amount_in: string;
  amount_out: string;
  execution_price: string;
  mid_price: string;
  path: string[];
  price_impact: string;
  recommended_slippage_bps: string;
  type_id: 1 | 2;
}

/** Quote type enum */
export type QuoteType = 'exact_in' | 'exact_out';

/** Quote parameters */
export interface QuoteParams {
  tokenIn: string;   // symbol, name, or hash
  tokenOut: string;   // symbol, name, or hash
  amount: string;     // human-readable amount
  type: QuoteType;
}

/** Resolved quote for SDK consumption */
export interface Quote {
  amountIn: string;           // raw amount
  amountOut: string;          // raw amount
  amountInFormatted: string;  // human-readable
  amountOutFormatted: string; // human-readable
  executionPrice: string;
  midPrice: string;
  path: string[];             // contract package hashes
  pathSymbols: string[];      // token symbols for display
  priceImpact: string;        // percentage string
  recommendedSlippageBps: string;
  type: QuoteType;
  tokenInSymbol: string;
  tokenOutSymbol: string;
  tokenInDecimals: number;
  tokenOutDecimals: number;
}
```

Create `packages/sdk/src/types/liquidity.ts`:

```typescript
import type { PairApiResponse } from './pair.js';

/** Liquidity position API response */
export interface LiquidityPositionApiResponse {
  account_hash: string;
  pair_contract_package_hash: string;
  lp_token_balance: string;
  pair: PairApiResponse;
  pair_lp_tokens_total_supply: string;
}

/** Liquidity position for SDK consumption */
export interface LiquidityPosition {
  accountHash: string;
  pairContractPackageHash: string;
  lpTokenBalance: string;
  lpTokenTotalSupply: string;
  pair: {
    token0Symbol: string;
    token1Symbol: string;
    token0PackageHash: string;
    token1PackageHash: string;
    reserve0: string;
    reserve1: string;
    decimals0: number;
    decimals1: number;
  };
  /** User's share of the pool as percentage */
  poolShare: string;
  /** Estimated token0 amount based on pool share */
  estimatedToken0Amount: string;
  /** Estimated token1 amount based on pool share */
  estimatedToken1Amount: string;
}

/** Impermanent loss response */
export interface ImpermanentLossApiResponse {
  pair_contract_package_hash: string;
  account_hash: string;
  value: string;
  timestamp: string;
}

export interface ImpermanentLoss {
  pairContractPackageHash: string;
  value: string;
  timestamp: string;
}

/** Add liquidity parameters */
export interface AddLiquidityParams {
  tokenA: string;              // symbol, name, or hash
  tokenB: string;              // symbol, name, or hash
  amountA: string;             // human-readable
  amountB: string;             // human-readable
  slippageBps?: number;        // basis points (default 300 = 3%)
  deadlineMinutes?: number;    // default 20
  senderPublicKey: string;     // hex public key
}

/** Remove liquidity parameters */
export interface RemoveLiquidityParams {
  pairContractPackageHash: string;
  percentage: number;           // 1-100
  slippageBps?: number;
  deadlineMinutes?: number;
  senderPublicKey: string;
}
```

Create `packages/sdk/src/types/transaction.ts`:

```typescript
/** Swap parameters */
export interface SwapParams {
  tokenIn: string;             // symbol, name, or hash
  tokenOut: string;            // symbol, name, or hash
  amount: string;              // human-readable
  type: 'exact_in' | 'exact_out';
  slippageBps?: number;        // basis points (default 300 = 3%)
  deadlineMinutes?: number;    // default 20
  senderPublicKey: string;     // hex public key
}

/** Token approval parameters */
export interface ApprovalParams {
  tokenContractPackageHash: string;
  spenderPackageHash: string;
  amount: string;              // raw amount
  senderPublicKey: string;
}

/** The result of building a transaction */
export interface TransactionBundle {
  /** The unsigned deploy/transaction as JSON */
  deployJson: string;
  /** Human-readable description of what this transaction does */
  summary: string;
  /** Gas cost in CSPR */
  estimatedGasCost: string;
  /** If token approval is needed first, this contains that deploy */
  approvalRequired?: TransactionBundle;
  /** Safety warnings (high price impact, high slippage, etc.) */
  warnings: string[];
}

/** Result of submitting a transaction */
export interface SubmitResult {
  transactionHash: string;
}

/** Transaction status */
export interface TransactionStatus {
  hash: string;
  status: 'pending' | 'success' | 'failed' | 'expired';
  errorMessage?: string;
}

/** Signer interface for pluggable signing */
export interface Signer {
  sign(deployJson: string): Promise<string>;
}

/** Swap history entry */
export interface SwapHistoryEntry {
  transactionHash: string;
  timestamp: string;
  token0ContractPackageHash: string;
  token1ContractPackageHash: string;
  amount0In: string;
  amount1In: string;
  amount0Out: string;
  amount1Out: string;
  senderAccountHash: string;
}

/** Swap history query params */
export interface SwapHistoryQuery {
  accountHash?: string;
  pairContractPackageHash?: string;
  page?: number;
  pageSize?: number;
}
```

Create `packages/sdk/src/types/index.ts`:

```typescript
export * from './api.js';
export * from './token.js';
export * from './pair.js';
export * from './quote.js';
export * from './liquidity.js';
export * from './transaction.js';
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit -p packages/sdk/tsconfig.json`
Expected: No errors

**Step 3: Commit**

```bash
git add packages/sdk/src/types/
git commit -m "feat(sdk): add all TypeScript type definitions"
```

---

### Task 4: Create network configuration

**Files:**
- Create: `packages/sdk/src/config.ts`
- Test: `packages/sdk/tests/unit/config.test.ts`

**Step 1: Write the failing test**

Create `packages/sdk/tests/unit/config.test.ts`:

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run packages/sdk/tests/unit/config.test.ts`
Expected: FAIL

**Step 3: Implement config**

Create `packages/sdk/src/config.ts`:

```typescript
export interface NetworkConfig {
  chainName: string;
  apiUrl: string;
  routerPackageHash: string;
  wcsprPackageHash: string;
  gasPrice: number;
  ttl: number;
}

export const TESTNET_CONFIG: NetworkConfig = {
  chainName: 'casper-test',
  apiUrl: 'https://cspr-trade-api.dev.make.services',
  routerPackageHash: 'hash-04a11a367e708c52557930c4e9c1301f4465100d1b1b6d0a62b48d3e32402867',
  wcsprPackageHash: 'hash-3d80df21ba4ee4d66a2a1f60c32570dd5685e4b279f6538162a5fd1314847c1e',
  gasPrice: 1,
  ttl: 1_800_000, // 30 minutes
};

export const MAINNET_CONFIG: NetworkConfig = {
  chainName: 'casper',
  apiUrl: 'https://api.cspr.trade',
  // TODO: confirm mainnet addresses
  routerPackageHash: 'hash-0000000000000000000000000000000000000000000000000000000000000000',
  wcsprPackageHash: 'hash-0000000000000000000000000000000000000000000000000000000000000000',
  gasPrice: 1,
  ttl: 1_800_000,
};

export function getNetworkConfig(network: 'mainnet' | 'testnet'): NetworkConfig {
  return network === 'testnet' ? TESTNET_CONFIG : MAINNET_CONFIG;
}

/** Default slippage in basis points (3% = 300 bps) */
export const DEFAULT_SLIPPAGE_BPS = 300;

/** Default deadline in minutes */
export const DEFAULT_DEADLINE_MINUTES = 20;

/** Gas costs in motes (1 CSPR = 1_000_000_000 motes) */
export const GAS_COSTS = {
  approve: 5_000_000_000n,            // 5 CSPR
  swapCsprForToken: 30_000_000_000n,   // 30 CSPR
  swapTokenForToken: 30_000_000_000n,  // 30 CSPR
  addLiquidity: 50_000_000_000n,       // 50 CSPR
  addNewLiquidity: 500_000_000_000n,   // 500 CSPR
  removeLiquidity: 30_000_000_000n,    // 30 CSPR
} as const;

/** CSPR token constants */
export const CSPR_TOKEN_ID = 'cspr';
export const CSPR_DECIMALS = 9;
export const ZERO_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/** Safety thresholds */
export const PRICE_IMPACT_WARNING_THRESHOLD = 5;
export const PRICE_IMPACT_HIGH_THRESHOLD = 15;
export const SLIPPAGE_WARNING_THRESHOLD = 10;
```

**Step 4: Run test**

Run: `npx vitest run packages/sdk/tests/unit/config.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/sdk/src/config.ts packages/sdk/tests/unit/config.test.ts
git commit -m "feat(sdk): add network configuration with testnet/mainnet defaults"
```

---

## Phase 3: SDK API Layer

### Task 5: Create base HTTP client

**Files:**
- Create: `packages/sdk/src/api/http.ts`
- Test: `packages/sdk/tests/unit/api/http.test.ts`

**Step 1: Write the failing test**

Create `packages/sdk/tests/unit/api/http.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpClient } from '../../../src/api/http.js';

describe('HttpClient', () => {
  let client: HttpClient;

  beforeEach(() => {
    client = new HttpClient('https://api.example.com');
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should make GET requests with correct URL', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ data: 'test' })));

    await client.get('/tokens');

    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.com/tokens',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('should append query parameters', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ data: 'test' })));

    await client.get('/tokens', { includes: 'csprtrade_data(1)' });

    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.com/tokens?includes=csprtrade_data%281%29',
      expect.anything()
    );
  });

  it('should parse JSON responses', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [{ id: 1 }] }))
    );

    const result = await client.get<{ data: { id: number }[] }>('/tokens');
    expect(result.data).toEqual([{ id: 1 }]);
  });

  it('should throw on HTTP errors', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: 'Not found' } }), { status: 404 })
    );

    await expect(client.get('/missing')).rejects.toThrow();
  });

  it('should make POST requests with body', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ data: 'ok' })));

    await client.post('/submit', { key: 'value' });

    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.com/submit',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ key: 'value' }),
      })
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run packages/sdk/tests/unit/api/http.test.ts`
Expected: FAIL

**Step 3: Implement HTTP client**

Create `packages/sdk/src/api/http.ts`:

```typescript
export class HttpClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'HttpClientError';
  }
}

export class HttpClient {
  constructor(
    private readonly baseUrl: string,
    private readonly headers: Record<string, string> = {},
  ) {}

  async get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    const url = this.buildUrl(path, params);
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...this.headers },
    });
    return this.handleResponse<T>(response);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const url = this.buildUrl(path);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.headers },
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(response);
  }

  private buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
    const url = new URL(path, this.baseUrl);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const body = await response.json();
    if (!response.ok) {
      const message = body?.error?.message ?? body?.message ?? `HTTP ${response.status}`;
      throw new HttpClientError(message, response.status, body);
    }
    return body as T;
  }
}
```

**Step 4: Run test**

Run: `npx vitest run packages/sdk/tests/unit/api/http.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/sdk/src/api/http.ts packages/sdk/tests/unit/api/http.test.ts
git commit -m "feat(sdk): add base HTTP client with error handling"
```

---

### Task 6: Create Tokens API module

**Files:**
- Create: `packages/sdk/src/api/tokens.ts`
- Test: `packages/sdk/tests/unit/api/tokens.test.ts`

**Step 1: Write the failing test**

Create `packages/sdk/tests/unit/api/tokens.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TokensApi } from '../../../src/api/tokens.js';
import { HttpClient } from '../../../src/api/http.js';

vi.mock('../../../src/api/http.js');

describe('TokensApi', () => {
  let api: TokensApi;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = new HttpClient('https://api.example.com');
    vi.mocked(mockHttp.get).mockResolvedValue({
      data: [
        {
          contract_package_hash: 'hash-abc123',
          contract_package: {
            contract_package_hash: 'hash-abc123',
            name: 'USD Tether',
            metadata: { symbol: 'USDT', name: 'USD Tether', decimals: 6 },
            icon_url: 'https://example.com/usdt.png',
            csprtrade_data: { price: 1.0 },
          },
          listed_at: '2025-01-01T00:00:00Z',
          sorting_order: 1,
        },
      ],
    });
    api = new TokensApi(mockHttp);
  });

  it('should fetch tokens with currency includes', async () => {
    const tokens = await api.getTokens(1);

    expect(mockHttp.get).toHaveBeenCalledWith('/tokens', {
      includes: 'csprtrade_data(1)',
    });
    expect(tokens).toHaveLength(1);
    expect(tokens[0].symbol).toBe('USDT');
    expect(tokens[0].decimals).toBe(6);
    expect(tokens[0].fiatPrice).toBe(1.0);
  });

  it('should fetch tokens without currency', async () => {
    await api.getTokens();
    expect(mockHttp.get).toHaveBeenCalledWith('/tokens', {
      includes: undefined,
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run packages/sdk/tests/unit/api/tokens.test.ts`
Expected: FAIL

**Step 3: Implement TokensApi**

Create `packages/sdk/src/api/tokens.ts`:

```typescript
import type { Token, TokenApiResponse, ApiResponse } from '../types/index.js';
import { CSPR_TOKEN_ID, CSPR_DECIMALS, ZERO_HASH } from '../config.js';
import type { HttpClient } from './http.js';

export class TokensApi {
  constructor(private readonly http: HttpClient) {}

  async getTokens(currencyId?: number): Promise<Token[]> {
    const response = await this.http.get<ApiResponse<TokenApiResponse[]>>('/tokens', {
      includes: currencyId !== undefined ? `csprtrade_data(${currencyId})` : undefined,
    });

    const tokens = response.data.map(mapApiTokenToToken);

    // Always include native CSPR as a token
    const hasCSPR = tokens.some(t => t.id === CSPR_TOKEN_ID);
    if (!hasCSPR) {
      tokens.unshift({
        id: CSPR_TOKEN_ID,
        name: 'Casper',
        symbol: 'CSPR',
        decimals: CSPR_DECIMALS,
        packageHash: `hash-${ZERO_HASH}`,
        iconUrl: null,
        fiatPrice: null,
      });
    }

    return tokens;
  }

  async getTokensRaw(currencyId?: number): Promise<TokenApiResponse[]> {
    const response = await this.http.get<ApiResponse<TokenApiResponse[]>>('/tokens', {
      includes: currencyId !== undefined ? `csprtrade_data(${currencyId})` : undefined,
    });
    return response.data;
  }
}

function mapApiTokenToToken(apiToken: TokenApiResponse): Token {
  const meta = apiToken.contract_package?.metadata;
  return {
    id: apiToken.contract_package_hash,
    name: meta?.name ?? apiToken.contract_package?.name ?? '',
    symbol: meta?.symbol ?? '',
    decimals: meta?.decimals ?? 0,
    packageHash: apiToken.contract_package_hash,
    iconUrl: apiToken.contract_package?.icon_url ?? null,
    fiatPrice: apiToken.contract_package?.csprtrade_data?.price ?? null,
  };
}
```

**Step 4: Run test**

Run: `npx vitest run packages/sdk/tests/unit/api/tokens.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/sdk/src/api/tokens.ts packages/sdk/tests/unit/api/tokens.test.ts
git commit -m "feat(sdk): add tokens API module"
```

---

### Task 7: Create Pairs API module

**Files:**
- Create: `packages/sdk/src/api/pairs.ts`
- Test: `packages/sdk/tests/unit/api/pairs.test.ts`

**Step 1: Write the failing test**

Create `packages/sdk/tests/unit/api/pairs.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PairsApi } from '../../../src/api/pairs.js';
import { HttpClient } from '../../../src/api/http.js';

vi.mock('../../../src/api/http.js');

const MOCK_PAIR = {
  contract_package_hash: 'hash-pair1',
  token0_contract_package_hash: 'hash-token0',
  token1_contract_package_hash: 'hash-token1',
  decimals0: 9,
  decimals1: 6,
  reserve0: '1000000000000',
  reserve1: '500000000',
  timestamp: '2025-01-01T00:00:00Z',
  latest_event_id: '123',
  contract_package: { name: 'Pair' },
  token0_contract_package: { metadata: { symbol: 'CSPR', name: 'Casper', decimals: 9 }, icon_url: null, csprtrade_data: { price: 0.02 } },
  token1_contract_package: { metadata: { symbol: 'USDT', name: 'Tether', decimals: 6 }, icon_url: null, csprtrade_data: { price: 1.0 } },
};

describe('PairsApi', () => {
  let api: PairsApi;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = new HttpClient('https://api.example.com');
    api = new PairsApi(mockHttp);
  });

  it('should fetch paginated pairs', async () => {
    vi.mocked(mockHttp.get).mockResolvedValueOnce({
      data: [MOCK_PAIR],
      item_count: 1,
      page_count: 1,
    });

    const result = await api.getPairs({ page: 1, pageSize: 10 });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].token0.symbol).toBe('CSPR');
    expect(result.itemCount).toBe(1);
  });

  it('should fetch pair by hash', async () => {
    vi.mocked(mockHttp.get).mockResolvedValueOnce({ data: MOCK_PAIR });

    const pair = await api.getPairDetails('hash-pair1');

    expect(pair.contractPackageHash).toBe('hash-pair1');
    expect(pair.token0.symbol).toBe('CSPR');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run packages/sdk/tests/unit/api/pairs.test.ts`
Expected: FAIL

**Step 3: Implement PairsApi**

Create `packages/sdk/src/api/pairs.ts`:

```typescript
import type { Pair, PairApiResponse, PaginatedApiResponse, ApiResponse } from '../types/index.js';
import type { HttpClient } from './http.js';

export interface PairQuery {
  page?: number;
  pageSize?: number;
  orderBy?: 'timestamp' | 'reserve0' | 'reserve1';
  orderDirection?: 'asc' | 'desc';
  token0Hash?: string;
  token1Hash?: string;
  currencyId?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  itemCount: number;
  pageCount: number;
}

export class PairsApi {
  constructor(private readonly http: HttpClient) {}

  async getPairs(opts?: PairQuery): Promise<PaginatedResult<Pair>> {
    const response = await this.http.get<PaginatedApiResponse<PairApiResponse>>('/pairs', {
      page: opts?.page !== undefined ? String(opts.page) : undefined,
      page_size: opts?.pageSize !== undefined ? String(opts.pageSize) : undefined,
      order_by: opts?.orderBy,
      order_direction: opts?.orderDirection,
      token0_contract_package_hash: opts?.token0Hash,
      token1_contract_package_hash: opts?.token1Hash,
      includes: opts?.currencyId !== undefined ? `csprtrade_data(${opts.currencyId})` : undefined,
    });

    return {
      data: response.data.map(mapPair),
      itemCount: response.item_count,
      pageCount: response.page_count,
    };
  }

  async getPairDetails(contractPackageHash: string, currencyId?: number): Promise<Pair> {
    const response = await this.http.get<ApiResponse<PairApiResponse>>(
      `/pairs/${contractPackageHash}`,
      {
        includes: currencyId !== undefined ? `csprtrade_data(${currencyId})` : undefined,
      }
    );
    return mapPair(response.data);
  }
}

function mapPair(api: PairApiResponse): Pair {
  const meta0 = api.token0_contract_package?.metadata;
  const meta1 = api.token1_contract_package?.metadata;
  return {
    contractPackageHash: api.contract_package_hash,
    token0: {
      packageHash: api.token0_contract_package_hash,
      symbol: meta0?.symbol ?? '',
      name: meta0?.name ?? '',
      decimals: api.decimals0,
      iconUrl: api.token0_contract_package?.icon_url ?? null,
    },
    token1: {
      packageHash: api.token1_contract_package_hash,
      symbol: meta1?.symbol ?? '',
      name: meta1?.name ?? '',
      decimals: api.decimals1,
      iconUrl: api.token1_contract_package?.icon_url ?? null,
    },
    reserve0: api.reserve0,
    reserve1: api.reserve1,
    timestamp: api.timestamp,
    fiatPrice0: api.token0_contract_package?.csprtrade_data?.price ?? null,
    fiatPrice1: api.token1_contract_package?.csprtrade_data?.price ?? null,
  };
}
```

**Step 4: Run test**

Run: `npx vitest run packages/sdk/tests/unit/api/pairs.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/sdk/src/api/pairs.ts packages/sdk/tests/unit/api/pairs.test.ts
git commit -m "feat(sdk): add pairs API module"
```

---

### Task 8: Create Quotes API module

**Files:**
- Create: `packages/sdk/src/api/quotes.ts`
- Test: `packages/sdk/tests/unit/api/quotes.test.ts`

**Step 1: Write the failing test**

Create `packages/sdk/tests/unit/api/quotes.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuotesApi } from '../../../src/api/quotes.js';
import { HttpClient } from '../../../src/api/http.js';

vi.mock('../../../src/api/http.js');

describe('QuotesApi', () => {
  let api: QuotesApi;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = new HttpClient('https://api.example.com');
    api = new QuotesApi(mockHttp);
  });

  it('should fetch exact-in quote', async () => {
    vi.mocked(mockHttp.get).mockResolvedValueOnce({
      data: {
        amount_in: '100000000000',
        amount_out: '50000000',
        execution_price: '50000000',
        mid_price: '50100000',
        path: ['hash-wcspr', 'hash-usdt'],
        price_impact: '0.20',
        recommended_slippage_bps: '20',
        type_id: 1,
      },
    });

    const quote = await api.getQuote({
      tokenIn: 'hash-0000',
      tokenOut: 'hash-usdt',
      amount: '100000000000',
      typeId: 1,
    });

    expect(quote.amount_in).toBe('100000000000');
    expect(quote.amount_out).toBe('50000000');
    expect(quote.price_impact).toBe('0.20');
  });

  it('should pass correct query params', async () => {
    vi.mocked(mockHttp.get).mockResolvedValueOnce({ data: {} });

    await api.getQuote({
      tokenIn: 'hash-aaa',
      tokenOut: 'hash-bbb',
      amount: '1000',
      typeId: 2,
    });

    expect(mockHttp.get).toHaveBeenCalledWith('/quote', {
      token_in: 'hash-aaa',
      token_out: 'hash-bbb',
      amount: '1000',
      type_id: '2',
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run packages/sdk/tests/unit/api/quotes.test.ts`
Expected: FAIL

**Step 3: Implement QuotesApi**

Create `packages/sdk/src/api/quotes.ts`:

```typescript
import type { QuoteApiResponse, ApiResponse } from '../types/index.js';
import type { HttpClient } from './http.js';

export interface QuoteApiParams {
  tokenIn: string;   // contract package hash
  tokenOut: string;   // contract package hash
  amount: string;     // raw amount
  typeId: 1 | 2;     // 1=exact_in, 2=exact_out
}

export class QuotesApi {
  constructor(private readonly http: HttpClient) {}

  async getQuote(params: QuoteApiParams): Promise<QuoteApiResponse> {
    const response = await this.http.get<ApiResponse<QuoteApiResponse>>('/quote', {
      token_in: params.tokenIn,
      token_out: params.tokenOut,
      amount: params.amount,
      type_id: String(params.typeId),
    });
    return response.data;
  }
}
```

**Step 4: Run test**

Run: `npx vitest run packages/sdk/tests/unit/api/quotes.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/sdk/src/api/quotes.ts packages/sdk/tests/unit/api/quotes.test.ts
git commit -m "feat(sdk): add quotes API module"
```

---

### Task 9: Create Liquidity, Rates, Currencies, Swaps API modules

**Files:**
- Create: `packages/sdk/src/api/liquidity.ts`
- Create: `packages/sdk/src/api/rates.ts`
- Create: `packages/sdk/src/api/currencies.ts`
- Create: `packages/sdk/src/api/swaps.ts`
- Create: `packages/sdk/src/api/submission.ts`
- Create: `packages/sdk/src/api/index.ts`
- Test: `packages/sdk/tests/unit/api/liquidity.test.ts`
- Test: `packages/sdk/tests/unit/api/rates.test.ts`

**Step 1: Write failing tests for liquidity API**

Create `packages/sdk/tests/unit/api/liquidity.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LiquidityApi } from '../../../src/api/liquidity.js';
import { HttpClient } from '../../../src/api/http.js';

vi.mock('../../../src/api/http.js');

describe('LiquidityApi', () => {
  let api: LiquidityApi;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = new HttpClient('https://api.example.com');
    api = new LiquidityApi(mockHttp);
  });

  it('should fetch liquidity positions', async () => {
    vi.mocked(mockHttp.get).mockResolvedValueOnce({
      data: [{
        account_hash: 'account-hash-abc',
        pair_contract_package_hash: 'hash-pair1',
        lp_token_balance: '1000000',
        pair: { token0_contract_package: { metadata: { symbol: 'CSPR' } }, token1_contract_package: { metadata: { symbol: 'USDT' } } },
        pair_lp_tokens_total_supply: '10000000',
      }],
    });

    const positions = await api.getPositions('01abc123');
    expect(positions).toHaveLength(1);
    expect(positions[0].pair_contract_package_hash).toBe('hash-pair1');
  });

  it('should fetch impermanent loss', async () => {
    vi.mocked(mockHttp.get).mockResolvedValueOnce({
      data: { value: '-2.5', pair_contract_package_hash: 'hash-pair1', account_hash: 'account-hash-abc', timestamp: '2025-01-01T00:00:00Z' },
    });

    const il = await api.getImpermanentLoss('01abc123', 'hash-pair1');
    expect(il.value).toBe('-2.5');
  });
});
```

Create `packages/sdk/tests/unit/api/rates.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RatesApi } from '../../../src/api/rates.js';
import { HttpClient } from '../../../src/api/http.js';

vi.mock('../../../src/api/http.js');

describe('RatesApi', () => {
  let api: RatesApi;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = new HttpClient('https://api.example.com');
    api = new RatesApi(mockHttp);
  });

  it('should fetch CSPR fiat rate', async () => {
    vi.mocked(mockHttp.get).mockResolvedValueOnce({ data: { rate: 0.025 } });
    const rate = await api.getCsprRate(1);
    expect(mockHttp.get).toHaveBeenCalledWith('/rates/1/latest');
  });

  it('should fetch token fiat rate', async () => {
    vi.mocked(mockHttp.get).mockResolvedValueOnce({ data: { amount: '1.00' } });
    const rate = await api.getTokenRate('hash-abc', 1);
    expect(mockHttp.get).toHaveBeenCalledWith('/ft/hash-abc/rates/latest', { currency_id: '1' });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run packages/sdk/tests/unit/api/liquidity.test.ts packages/sdk/tests/unit/api/rates.test.ts`
Expected: FAIL

**Step 3: Implement all remaining API modules**

Create `packages/sdk/src/api/liquidity.ts`:

```typescript
import type { LiquidityPositionApiResponse, ImpermanentLossApiResponse, ApiResponse } from '../types/index.js';
import type { HttpClient } from './http.js';

export class LiquidityApi {
  constructor(private readonly http: HttpClient) {}

  async getPositions(accountIdentifier: string, currencyId?: number): Promise<LiquidityPositionApiResponse[]> {
    const response = await this.http.get<ApiResponse<LiquidityPositionApiResponse[]>>(
      `/accounts/${accountIdentifier}/liquidity-positions`,
      { includes: currencyId !== undefined ? `csprtrade_data(${currencyId})` : undefined }
    );
    return response.data;
  }

  async getImpermanentLoss(accountIdentifier: string, pairHash: string): Promise<ImpermanentLossApiResponse> {
    const response = await this.http.get<ApiResponse<ImpermanentLossApiResponse>>(
      `/accounts/${accountIdentifier}/liquidity-position-impermanent-loss`,
      { pair_contract_package_hash: pairHash }
    );
    return response.data;
  }
}
```

Create `packages/sdk/src/api/rates.ts`:

```typescript
import type { ApiResponse } from '../types/index.js';
import type { HttpClient } from './http.js';

export class RatesApi {
  constructor(private readonly http: HttpClient) {}

  async getCsprRate(currencyId: number): Promise<unknown> {
    const response = await this.http.get<ApiResponse<unknown>>(`/rates/${currencyId}/latest`);
    return response.data;
  }

  async getTokenRate(contractPackageHash: string, currencyId?: number, dexId?: number): Promise<unknown> {
    const response = await this.http.get<ApiResponse<unknown>>(
      `/ft/${contractPackageHash}/rates/latest`,
      {
        currency_id: currencyId !== undefined ? String(currencyId) : undefined,
        dex_id: dexId !== undefined ? String(dexId) : undefined,
      }
    );
    return response.data;
  }

  async getTokenDexRate(contractPackageHash: string, targetHash?: string, dexId?: number): Promise<unknown> {
    const response = await this.http.get<ApiResponse<unknown>>(
      `/ft/${contractPackageHash}/dex-rates/latest`,
      {
        target_contract_package_hash: targetHash,
        dex_id: dexId !== undefined ? String(dexId) : undefined,
      }
    );
    return response.data;
  }
}
```

Create `packages/sdk/src/api/currencies.ts`:

```typescript
import type { Currency, ApiResponse } from '../types/index.js';
import type { HttpClient } from './http.js';

export class CurrenciesApi {
  constructor(private readonly http: HttpClient) {}

  async getCurrencies(): Promise<Currency[]> {
    const response = await this.http.get<ApiResponse<Currency[]>>('/currencies');
    return response.data;
  }
}
```

Create `packages/sdk/src/api/swaps.ts`:

```typescript
import type { PaginatedApiResponse } from '../types/index.js';
import type { HttpClient } from './http.js';

export interface SwapApiQuery {
  senderAccountHash?: string;
  pairContractPackageHash?: string;
  page?: number;
  pageSize?: number;
  orderDirection?: 'asc' | 'desc';
}

export class SwapsApi {
  constructor(private readonly http: HttpClient) {}

  async getSwaps(opts?: SwapApiQuery): Promise<PaginatedApiResponse<unknown>> {
    return this.http.get<PaginatedApiResponse<unknown>>('/swaps', {
      sender_account_hash: opts?.senderAccountHash,
      pair_contract_package_hash: opts?.pairContractPackageHash,
      page: opts?.page !== undefined ? String(opts.page) : undefined,
      page_size: opts?.pageSize !== undefined ? String(opts.pageSize) : undefined,
      order_direction: opts?.orderDirection,
    });
  }
}
```

Create `packages/sdk/src/api/submission.ts`:

```typescript
import type { HttpClient } from './http.js';
import type { ApiResponse, SubmitResult } from '../types/index.js';

export class SubmissionApi {
  constructor(private readonly http: HttpClient) {}

  async submitTransaction(signedDeployJson: unknown): Promise<SubmitResult> {
    const response = await this.http.post<ApiResponse<{ api_version: string; transaction_hash: { Version1: string } }>>(
      '/wasm-proxy-transaction-submission',
      signedDeployJson
    );
    return {
      transactionHash: response.data.transaction_hash?.Version1 ?? '',
    };
  }
}
```

Create `packages/sdk/src/api/index.ts`:

```typescript
export { HttpClient, HttpClientError } from './http.js';
export { TokensApi } from './tokens.js';
export { PairsApi, type PairQuery, type PaginatedResult } from './pairs.js';
export { QuotesApi, type QuoteApiParams } from './quotes.js';
export { LiquidityApi } from './liquidity.js';
export { RatesApi } from './rates.js';
export { CurrenciesApi } from './currencies.js';
export { SwapsApi } from './swaps.js';
export { SubmissionApi } from './submission.js';
```

**Step 4: Run tests**

Run: `npx vitest run packages/sdk/tests/unit/api/`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add packages/sdk/src/api/ packages/sdk/tests/unit/api/
git commit -m "feat(sdk): add liquidity, rates, currencies, swaps, submission API modules"
```

---

## Phase 4: Resolvers

### Task 10: Create token resolver

**Files:**
- Create: `packages/sdk/src/resolver/token-resolver.ts`
- Test: `packages/sdk/tests/unit/resolver/token-resolver.test.ts`

**Step 1: Write the failing test**

Create `packages/sdk/tests/unit/resolver/token-resolver.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TokenResolver } from '../../../src/resolver/token-resolver.js';
import type { Token } from '../../../src/types/index.js';

const MOCK_TOKENS: Token[] = [
  { id: 'cspr', name: 'Casper', symbol: 'CSPR', decimals: 9, packageHash: 'hash-0000000000000000000000000000000000000000000000000000000000000000', iconUrl: null, fiatPrice: null },
  { id: 'hash-aaa111', name: 'USD Tether', symbol: 'USDT', decimals: 6, packageHash: 'hash-aaa111', iconUrl: null, fiatPrice: 1.0 },
  { id: 'hash-bbb222', name: 'Wrapped Casper', symbol: 'WCSPR', decimals: 9, packageHash: 'hash-bbb222', iconUrl: null, fiatPrice: null },
];

describe('TokenResolver', () => {
  let resolver: TokenResolver;
  let fetchTokens: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchTokens = vi.fn().mockResolvedValue(MOCK_TOKENS);
    resolver = new TokenResolver(fetchTokens);
  });

  it('should resolve by symbol (case-insensitive)', async () => {
    const token = await resolver.resolve('usdt');
    expect(token.symbol).toBe('USDT');
    expect(token.packageHash).toBe('hash-aaa111');
  });

  it('should resolve CSPR as native token', async () => {
    const token = await resolver.resolve('CSPR');
    expect(token.id).toBe('cspr');
    expect(token.decimals).toBe(9);
  });

  it('should resolve by contract package hash', async () => {
    const token = await resolver.resolve('hash-aaa111');
    expect(token.symbol).toBe('USDT');
  });

  it('should resolve by name', async () => {
    const token = await resolver.resolve('USD Tether');
    expect(token.symbol).toBe('USDT');
  });

  it('should throw for unknown token', async () => {
    await expect(resolver.resolve('UNKNOWN')).rejects.toThrow('Token not found');
  });

  it('should cache token list', async () => {
    await resolver.resolve('CSPR');
    await resolver.resolve('USDT');
    expect(fetchTokens).toHaveBeenCalledTimes(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run packages/sdk/tests/unit/resolver/token-resolver.test.ts`
Expected: FAIL

**Step 3: Implement TokenResolver**

Create `packages/sdk/src/resolver/token-resolver.ts`:

```typescript
import type { Token } from '../types/index.js';

export class TokenResolver {
  private cache: Token[] | null = null;
  private cacheTimestamp = 0;
  private readonly cacheTtlMs = 30_000; // 30 seconds

  constructor(private readonly fetchTokens: () => Promise<Token[]>) {}

  async resolve(identifier: string): Promise<Token> {
    const tokens = await this.getTokens();
    const id = identifier.trim();

    // 1. Match by symbol (case-insensitive)
    const bySymbol = tokens.find(t => t.symbol.toLowerCase() === id.toLowerCase());
    if (bySymbol) return bySymbol;

    // 2. Match by contract package hash
    const byHash = tokens.find(t => t.packageHash.toLowerCase() === id.toLowerCase());
    if (byHash) return byHash;

    // 3. Match by name (case-insensitive)
    const byName = tokens.find(t => t.name.toLowerCase() === id.toLowerCase());
    if (byName) return byName;

    throw new Error(`Token not found: "${identifier}". Use a token symbol (e.g., "CSPR"), name, or contract package hash.`);
  }

  async getTokens(): Promise<Token[]> {
    const now = Date.now();
    if (this.cache && now - this.cacheTimestamp < this.cacheTtlMs) {
      return this.cache;
    }
    this.cache = await this.fetchTokens();
    this.cacheTimestamp = now;
    return this.cache;
  }

  invalidateCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }
}
```

**Step 4: Run test**

Run: `npx vitest run packages/sdk/tests/unit/resolver/token-resolver.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/sdk/src/resolver/ packages/sdk/tests/unit/resolver/
git commit -m "feat(sdk): add token resolver with symbol/name/hash lookup and caching"
```

---

### Task 11: Create currency resolver

**Files:**
- Create: `packages/sdk/src/resolver/currency-resolver.ts`
- Create: `packages/sdk/src/resolver/index.ts`
- Test: `packages/sdk/tests/unit/resolver/currency-resolver.test.ts`

**Step 1: Write the failing test**

Create `packages/sdk/tests/unit/resolver/currency-resolver.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CurrencyResolver } from '../../../src/resolver/currency-resolver.js';
import type { Currency } from '../../../src/types/index.js';

const MOCK_CURRENCIES: Currency[] = [
  { id: 1, code: 'USD', name: 'US Dollar', symbol: '$' },
  { id: 2, code: 'EUR', name: 'Euro', symbol: '€' },
];

describe('CurrencyResolver', () => {
  let resolver: CurrencyResolver;

  beforeEach(() => {
    const fetchCurrencies = vi.fn().mockResolvedValue(MOCK_CURRENCIES);
    resolver = new CurrencyResolver(fetchCurrencies);
  });

  it('should resolve currency code to ID', async () => {
    const id = await resolver.resolveToId('USD');
    expect(id).toBe(1);
  });

  it('should be case-insensitive', async () => {
    const id = await resolver.resolveToId('eur');
    expect(id).toBe(2);
  });

  it('should return undefined for unknown currency', async () => {
    const id = await resolver.resolveToId('JPY');
    expect(id).toBeUndefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run packages/sdk/tests/unit/resolver/currency-resolver.test.ts`
Expected: FAIL

**Step 3: Implement CurrencyResolver**

Create `packages/sdk/src/resolver/currency-resolver.ts`:

```typescript
import type { Currency } from '../types/index.js';

export class CurrencyResolver {
  private cache: Currency[] | null = null;

  constructor(private readonly fetchCurrencies: () => Promise<Currency[]>) {}

  async resolveToId(code: string): Promise<number | undefined> {
    const currencies = await this.getCurrencies();
    const match = currencies.find(c => c.code.toLowerCase() === code.toLowerCase());
    return match?.id;
  }

  async getCurrencies(): Promise<Currency[]> {
    if (this.cache) return this.cache;
    this.cache = await this.fetchCurrencies();
    return this.cache;
  }
}
```

Create `packages/sdk/src/resolver/index.ts`:

```typescript
export { TokenResolver } from './token-resolver.js';
export { CurrencyResolver } from './currency-resolver.js';
```

**Step 4: Run tests**

Run: `npx vitest run packages/sdk/tests/unit/resolver/`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add packages/sdk/src/resolver/ packages/sdk/tests/unit/resolver/
git commit -m "feat(sdk): add currency resolver"
```

---

## Phase 5: Transaction Building

### Task 12: Create amount conversion utilities

**Files:**
- Create: `packages/sdk/src/utils/amounts.ts`
- Test: `packages/sdk/tests/unit/utils/amounts.test.ts`

**Step 1: Write the failing test**

Create `packages/sdk/tests/unit/utils/amounts.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { toRawAmount, toFormattedAmount, calculateMinWithSlippage, calculateMaxWithSlippage } from '../../../src/utils/amounts.js';

describe('Amount conversion', () => {
  it('should convert human amount to raw (CSPR, 9 decimals)', () => {
    expect(toRawAmount('100', 9)).toBe('100000000000');
  });

  it('should convert human amount to raw (USDT, 6 decimals)', () => {
    expect(toRawAmount('50.5', 6)).toBe('50500000');
  });

  it('should convert human amount to raw (1.23456789, 9 decimals)', () => {
    expect(toRawAmount('1.23456789', 9)).toBe('1234567890');
  });

  it('should convert raw to human (CSPR)', () => {
    expect(toFormattedAmount('100000000000', 9)).toBe('100');
  });

  it('should convert raw to human (USDT)', () => {
    expect(toFormattedAmount('50500000', 6)).toBe('50.5');
  });

  it('should handle zero', () => {
    expect(toRawAmount('0', 9)).toBe('0');
    expect(toFormattedAmount('0', 9)).toBe('0');
  });
});

describe('Slippage calculations', () => {
  it('should calculate min amount with 3% slippage', () => {
    // 100 * (1 - 0.03) = 97
    expect(calculateMinWithSlippage('100000000000', 300)).toBe('97000000000');
  });

  it('should calculate max amount with 3% slippage', () => {
    // 100 * (1 + 0.03) = 103
    expect(calculateMaxWithSlippage('100000000000', 300)).toBe('103000000000');
  });

  it('should round min down and max up', () => {
    // 333 * 0.97 = 323.01 -> round down = 323
    expect(calculateMinWithSlippage('333', 300)).toBe('323');
    // 333 * 1.03 = 342.99 -> round up = 343
    expect(calculateMaxWithSlippage('333', 300)).toBe('343');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run packages/sdk/tests/unit/utils/amounts.test.ts`
Expected: FAIL

**Step 3: Implement amount utilities**

Create `packages/sdk/src/utils/amounts.ts`:

```typescript
import Big from 'big.js';

/**
 * Convert a human-readable amount to raw (smallest unit) amount.
 * e.g., "100" CSPR (9 decimals) → "100000000000"
 */
export function toRawAmount(humanAmount: string, decimals: number): string {
  const big = new Big(humanAmount);
  const multiplier = new Big(10).pow(decimals);
  return big.times(multiplier).toFixed(0);
}

/**
 * Convert a raw amount to human-readable format.
 * e.g., "100000000000" with 9 decimals → "100"
 */
export function toFormattedAmount(rawAmount: string, decimals: number): string {
  const big = new Big(rawAmount);
  const divisor = new Big(10).pow(decimals);
  const result = big.div(divisor);
  // Remove trailing zeros
  return result.toFixed().replace(/\.?0+$/, '') || '0';
}

/**
 * Calculate minimum amount after slippage (for output amounts).
 * Slippage in basis points (300 = 3%).
 * Rounds DOWN.
 */
export function calculateMinWithSlippage(rawAmount: string, slippageBps: number): string {
  const amount = new Big(rawAmount);
  const factor = new Big(1).minus(new Big(slippageBps).div(10000));
  return amount.times(factor).toFixed(0, Big.roundDown);
}

/**
 * Calculate maximum amount after slippage (for input amounts).
 * Slippage in basis points (300 = 3%).
 * Rounds UP.
 */
export function calculateMaxWithSlippage(rawAmount: string, slippageBps: number): string {
  const amount = new Big(rawAmount);
  const factor = new Big(1).plus(new Big(slippageBps).div(10000));
  return amount.times(factor).toFixed(0, Big.roundUp);
}
```

**Step 4: Run test**

Run: `npx vitest run packages/sdk/tests/unit/utils/amounts.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/sdk/src/utils/ packages/sdk/tests/unit/utils/
git commit -m "feat(sdk): add amount conversion and slippage utilities"
```

---

### Task 13: Create proxy WASM transaction encoder

This is the most critical piece — it must exactly replicate how the frontend builds transactions. All DEX operations go through the proxy_caller.wasm with a specific arg encoding pattern.

**Files:**
- Create: `packages/sdk/src/transactions/proxy-wasm.ts`
- Test: `packages/sdk/tests/unit/transactions/proxy-wasm.test.ts`

**Step 1: Write the failing test**

Create `packages/sdk/tests/unit/transactions/proxy-wasm.test.ts`:

```typescript
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

    // Verify the outer args structure has the 5 required fields
    expect(outerArgs).toBeDefined();
    // The outer args should be an Args instance
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
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run packages/sdk/tests/unit/transactions/proxy-wasm.test.ts`
Expected: FAIL

**Step 3: Implement proxy WASM encoder**

Create `packages/sdk/src/transactions/proxy-wasm.ts`:

The encoding pattern from the frontend is:
1. Inner args → `Args.fromMap({...}).toBytes()` → `Uint8Array`
2. Each byte wrapped as `CLValue.newCLUint8(byte)` → array of CLValues
3. Outer args: `{ package_hash, entry_point, args: List<UInt8>, attached_value, amount }`

```typescript
import { hexToBytes } from '@noble/hashes/utils';
import { Args, CLTypeUInt8, CLValue } from 'casper-js-sdk';

export interface ProxyWasmArgsParams {
  routerPackageHash: string;  // hex without 'hash-' prefix
  entryPoint: string;
  innerArgs: Args;
  attachedValue: string;       // motes as string
}

/**
 * Serialize inner contract call args to a byte array.
 * This replicates `Args.fromMap({...}).toBytes()` from the frontend.
 */
export function serializeInnerArgs(args: Args): Uint8Array {
  return args.toBytes();
}

/**
 * Build the outer proxy_caller.wasm args.
 *
 * The proxy WASM expects exactly 5 args:
 * - package_hash: ByteArray (32 bytes, the router contract package hash)
 * - entry_point: String (the router entry point name)
 * - args: List<UInt8> (the serialized inner args as individual bytes)
 * - attached_value: UInt512 (CSPR motes for native token operations, 0 otherwise)
 * - amount: UInt512 (same as attached_value)
 */
export function buildProxyWasmArgs(params: ProxyWasmArgsParams): Args {
  const { routerPackageHash, entryPoint, innerArgs, attachedValue } = params;

  // Serialize inner args to bytes
  const rawArgsBytes = serializeInnerArgs(innerArgs);

  // Wrap each byte as a CLValue UInt8
  const argsBytes: CLValue[] = [];
  for (let i = 0; i < rawArgsBytes.length; i++) {
    argsBytes.push(CLValue.newCLUint8(rawArgsBytes[i]));
  }

  // Build outer args
  return Args.fromMap({
    package_hash: CLValue.newCLByteArray(hexToBytes(routerPackageHash)),
    entry_point: CLValue.newCLString(entryPoint),
    args: CLValue.newCLList(CLTypeUInt8, argsBytes),
    attached_value: CLValue.newCLUInt512(attachedValue),
    amount: CLValue.newCLUInt512(attachedValue),
  });
}
```

**Step 4: Run test**

Run: `npx vitest run packages/sdk/tests/unit/transactions/proxy-wasm.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/sdk/src/transactions/ packages/sdk/tests/unit/transactions/
git commit -m "feat(sdk): add proxy WASM transaction encoder matching frontend pattern"
```

---

### Task 14: Create swap transaction builder

**Files:**
- Create: `packages/sdk/src/transactions/swap.ts`
- Test: `packages/sdk/tests/unit/transactions/swap.test.ts`

**Step 1: Write the failing test**

Create `packages/sdk/tests/unit/transactions/swap.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  getSwapEntryPoint,
  buildSwapInnerArgs,
} from '../../../src/transactions/swap.js';

describe('Swap transaction builder', () => {
  describe('getSwapEntryPoint', () => {
    it('should return swap_exact_cspr_for_tokens for CSPR→Token exact_in', () => {
      expect(getSwapEntryPoint(true, false, 'exact_in')).toBe('swap_exact_cspr_for_tokens');
    });

    it('should return swap_cspr_for_exact_tokens for CSPR→Token exact_out', () => {
      expect(getSwapEntryPoint(true, false, 'exact_out')).toBe('swap_cspr_for_exact_tokens');
    });

    it('should return swap_exact_tokens_for_cspr for Token→CSPR exact_in', () => {
      expect(getSwapEntryPoint(false, true, 'exact_in')).toBe('swap_exact_tokens_for_cspr');
    });

    it('should return swap_tokens_for_exact_cspr for Token→CSPR exact_out', () => {
      expect(getSwapEntryPoint(false, true, 'exact_out')).toBe('swap_tokens_for_exact_cspr');
    });

    it('should return swap_exact_tokens_for_tokens for Token→Token exact_in', () => {
      expect(getSwapEntryPoint(false, false, 'exact_in')).toBe('swap_exact_tokens_for_tokens');
    });

    it('should return swap_tokens_for_exact_tokens for Token→Token exact_out', () => {
      expect(getSwapEntryPoint(false, false, 'exact_out')).toBe('swap_tokens_for_exact_tokens');
    });
  });

  describe('buildSwapInnerArgs', () => {
    const ACCOUNT_HASH = 'account-hash-0000000000000000000000000000000000000000000000000000000000000000';

    it('should build inner args for CSPR→Token exact_in', () => {
      const args = buildSwapInnerArgs({
        isFirstTokenNative: true,
        isSecondTokenNative: false,
        quoteType: 'exact_in',
        path: ['hash-wcspr', 'hash-usdt'],
        accountHash: ACCOUNT_HASH,
        deadline: Date.now() + 20 * 60 * 1000,
        amountIn: '100000000000',
        amountOut: '50000000',
        amountInMax: '103000000000',
        amountOutMin: '48500000',
      });

      // Should have: path, to, deadline, amount_out_min
      const bytes = args.toBytes();
      expect(bytes.length).toBeGreaterThan(0);
    });

    it('should build inner args for Token→Token exact_in', () => {
      const args = buildSwapInnerArgs({
        isFirstTokenNative: false,
        isSecondTokenNative: false,
        quoteType: 'exact_in',
        path: ['hash-tokenA', 'hash-tokenB'],
        accountHash: ACCOUNT_HASH,
        deadline: Date.now() + 20 * 60 * 1000,
        amountIn: '1000000',
        amountOut: '2000000',
        amountInMax: '1030000',
        amountOutMin: '1940000',
      });

      const bytes = args.toBytes();
      expect(bytes.length).toBeGreaterThan(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run packages/sdk/tests/unit/transactions/swap.test.ts`
Expected: FAIL

**Step 3: Implement swap transaction builder**

Create `packages/sdk/src/transactions/swap.ts`:

```typescript
import { Args, CLTypeKey, CLValue, Key } from 'casper-js-sdk';
import type { QuoteType } from '../types/index.js';

/**
 * Determine the correct router entry point for a swap.
 * Mirrors the frontend's `getEntryPointName()` logic in ContractService.
 */
export function getSwapEntryPoint(
  isFirstTokenNative: boolean,
  isSecondTokenNative: boolean,
  quoteType: QuoteType,
): string {
  if (isFirstTokenNative) {
    return quoteType === 'exact_in' ? 'swap_exact_cspr_for_tokens' : 'swap_cspr_for_exact_tokens';
  }
  if (isSecondTokenNative) {
    return quoteType === 'exact_in' ? 'swap_exact_tokens_for_cspr' : 'swap_tokens_for_exact_cspr';
  }
  return quoteType === 'exact_in' ? 'swap_exact_tokens_for_tokens' : 'swap_tokens_for_exact_tokens';
}

export interface SwapInnerArgsParams {
  isFirstTokenNative: boolean;
  isSecondTokenNative: boolean;
  quoteType: QuoteType;
  path: string[];          // contract package hashes
  accountHash: string;      // e.g., "account-hash-abc..."
  deadline: number;         // milliseconds timestamp
  amountIn: string;         // raw amount
  amountOut: string;        // raw amount
  amountInMax: string;      // raw amount with slippage
  amountOutMin: string;     // raw amount with slippage
}

/**
 * Build the inner args for a swap call.
 * These get serialized to bytes and passed to the proxy WASM.
 *
 * Mirrors the frontend's swap() method in ContractService.
 */
export function buildSwapInnerArgs(params: SwapInnerArgsParams): Args {
  const {
    isFirstTokenNative, isSecondTokenNative, quoteType,
    path, accountHash, deadline,
    amountIn, amountOut, amountInMax, amountOutMin,
  } = params;

  const isBothNotNative = !isFirstTokenNative && !isSecondTokenNative;

  const argsMap: Record<string, CLValue> = {
    path: CLValue.newCLList(
      CLTypeKey,
      path.map(hash => CLValue.newCLKey(Key.newKey(hash))),
    ),
    to: CLValue.newCLKey(Key.newKey(accountHash)),
    deadline: CLValue.newCLUint64(deadline),
  };

  // CSPR → Token, exact in: amount_out_min only
  if (isFirstTokenNative && quoteType === 'exact_in') {
    argsMap.amount_out_min = CLValue.newCLUInt256(amountOutMin);
  }

  // CSPR → Token, exact out: amount_out only
  if (isFirstTokenNative && quoteType === 'exact_out') {
    argsMap.amount_out = CLValue.newCLUInt256(amountOut);
  }

  // Token → CSPR or Token → Token, exact in: amount_in + amount_out_min
  if ((isSecondTokenNative || isBothNotNative) && quoteType === 'exact_in') {
    argsMap.amount_in = CLValue.newCLUInt256(amountIn);
    argsMap.amount_out_min = CLValue.newCLUInt256(amountOutMin);
  }

  // Token → CSPR or Token → Token, exact out: amount_in_max + amount_out
  if ((isSecondTokenNative || isBothNotNative) && quoteType === 'exact_out') {
    argsMap.amount_in_max = CLValue.newCLUInt256(amountInMax);
    argsMap.amount_out = CLValue.newCLUInt256(amountOut);
  }

  return Args.fromMap(argsMap);
}

/**
 * Get the CSPR amount to attach to the transaction.
 * Non-zero only when the first token is native CSPR.
 */
export function getSwapAttachedValue(params: {
  isFirstTokenNative: boolean;
  quoteType: QuoteType;
  amountIn: string;
  amountInMax: string;
}): string {
  if (!params.isFirstTokenNative) return '0';
  return params.quoteType === 'exact_in' ? params.amountIn : params.amountInMax;
}
```

**Step 4: Run test**

Run: `npx vitest run packages/sdk/tests/unit/transactions/swap.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/sdk/src/transactions/swap.ts packages/sdk/tests/unit/transactions/swap.test.ts
git commit -m "feat(sdk): add swap transaction builder with all 6 entry point variants"
```

---

### Task 15: Create liquidity and approve transaction builders

**Files:**
- Create: `packages/sdk/src/transactions/liquidity.ts`
- Create: `packages/sdk/src/transactions/approve.ts`
- Create: `packages/sdk/src/transactions/deploy-builder.ts`
- Create: `packages/sdk/src/transactions/index.ts`
- Test: `packages/sdk/tests/unit/transactions/liquidity.test.ts`
- Test: `packages/sdk/tests/unit/transactions/approve.test.ts`

**Step 1: Write failing tests**

Create `packages/sdk/tests/unit/transactions/liquidity.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildAddLiquidityInnerArgs, buildRemoveLiquidityInnerArgs } from '../../../src/transactions/liquidity.js';

const ACCOUNT_HASH = 'account-hash-0000000000000000000000000000000000000000000000000000000000000000';
const DEADLINE = Date.now() + 20 * 60 * 1000;

describe('Liquidity transaction builders', () => {
  describe('buildAddLiquidityInnerArgs', () => {
    it('should build args for token-token add_liquidity', () => {
      const args = buildAddLiquidityInnerArgs({
        isCSPRPair: false,
        tokenAHash: 'hash-aaa',
        tokenBHash: 'hash-bbb',
        amountADesired: '1000000',
        amountBDesired: '2000000',
        amountAMin: '970000',
        amountBMin: '1940000',
        accountHash: ACCOUNT_HASH,
        deadline: DEADLINE,
      });

      const bytes = args.toBytes();
      expect(bytes.length).toBeGreaterThan(0);
    });

    it('should build args for CSPR pair add_liquidity_cspr', () => {
      const args = buildAddLiquidityInnerArgs({
        isCSPRPair: true,
        tokenHash: 'hash-usdt',
        amountTokenDesired: '50000000',
        amountTokenMin: '48500000',
        amountCSPRMin: '97000000000',
        accountHash: ACCOUNT_HASH,
        deadline: DEADLINE,
      });

      const bytes = args.toBytes();
      expect(bytes.length).toBeGreaterThan(0);
    });
  });

  describe('buildRemoveLiquidityInnerArgs', () => {
    it('should build args for token-token remove_liquidity', () => {
      const args = buildRemoveLiquidityInnerArgs({
        isCSPRPair: false,
        tokenAHash: 'hash-aaa',
        tokenBHash: 'hash-bbb',
        liquidity: '500000',
        amountAMin: '485000',
        amountBMin: '970000',
        accountHash: ACCOUNT_HASH,
        deadline: DEADLINE,
      });

      const bytes = args.toBytes();
      expect(bytes.length).toBeGreaterThan(0);
    });
  });
});
```

Create `packages/sdk/tests/unit/transactions/approve.test.ts`:

```typescript
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
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run packages/sdk/tests/unit/transactions/liquidity.test.ts packages/sdk/tests/unit/transactions/approve.test.ts`
Expected: FAIL

**Step 3: Implement liquidity builder**

Create `packages/sdk/src/transactions/liquidity.ts`:

```typescript
import { Args, CLValue, Key } from 'casper-js-sdk';

export type AddLiquidityInnerArgsParams =
  | {
      isCSPRPair: false;
      tokenAHash: string;
      tokenBHash: string;
      amountADesired: string;
      amountBDesired: string;
      amountAMin: string;
      amountBMin: string;
      accountHash: string;
      deadline: number;
    }
  | {
      isCSPRPair: true;
      tokenHash: string;
      amountTokenDesired: string;
      amountTokenMin: string;
      amountCSPRMin: string;
      accountHash: string;
      deadline: number;
    };

export function buildAddLiquidityInnerArgs(params: AddLiquidityInnerArgsParams): Args {
  if (params.isCSPRPair) {
    return Args.fromMap({
      token: CLValue.newCLKey(Key.newKey(params.tokenHash)),
      amount_token_desired: CLValue.newCLUInt256(params.amountTokenDesired),
      amount_token_min: CLValue.newCLUInt256(params.amountTokenMin),
      amount_cspr_min: CLValue.newCLUInt256(params.amountCSPRMin),
      to: CLValue.newCLKey(Key.newKey(params.accountHash)),
      deadline: CLValue.newCLUint64(params.deadline),
    });
  }

  return Args.fromMap({
    token_a: CLValue.newCLKey(Key.newKey(params.tokenAHash)),
    token_b: CLValue.newCLKey(Key.newKey(params.tokenBHash)),
    amount_a_desired: CLValue.newCLUInt256(params.amountADesired),
    amount_b_desired: CLValue.newCLUInt256(params.amountBDesired),
    amount_a_min: CLValue.newCLUInt256(params.amountAMin),
    amount_b_min: CLValue.newCLUInt256(params.amountBMin),
    to: CLValue.newCLKey(Key.newKey(params.accountHash)),
    deadline: CLValue.newCLUint64(params.deadline),
  });
}

export type RemoveLiquidityInnerArgsParams =
  | {
      isCSPRPair: false;
      tokenAHash: string;
      tokenBHash: string;
      liquidity: string;
      amountAMin: string;
      amountBMin: string;
      accountHash: string;
      deadline: number;
    }
  | {
      isCSPRPair: true;
      tokenHash: string;
      liquidity: string;
      amountTokenMin: string;
      amountCSPRMin: string;
      accountHash: string;
      deadline: number;
    };

export function buildRemoveLiquidityInnerArgs(params: RemoveLiquidityInnerArgsParams): Args {
  if (params.isCSPRPair) {
    return Args.fromMap({
      token: CLValue.newCLKey(Key.newKey(params.tokenHash)),
      liquidity: CLValue.newCLUInt256(params.liquidity),
      amount_token_min: CLValue.newCLUInt256(params.amountTokenMin),
      amount_cspr_min: CLValue.newCLUInt256(params.amountCSPRMin),
      to: CLValue.newCLKey(Key.newKey(params.accountHash)),
      deadline: CLValue.newCLUint64(params.deadline),
    });
  }

  return Args.fromMap({
    token_a: CLValue.newCLKey(Key.newKey(params.tokenAHash)),
    token_b: CLValue.newCLKey(Key.newKey(params.tokenBHash)),
    liquidity: CLValue.newCLUInt256(params.liquidity),
    amount_a_min: CLValue.newCLUInt256(params.amountAMin),
    amount_b_min: CLValue.newCLUInt256(params.amountBMin),
    to: CLValue.newCLKey(Key.newKey(params.accountHash)),
    deadline: CLValue.newCLUint64(params.deadline),
  });
}
```

**Step 4: Implement approve builder**

Create `packages/sdk/src/transactions/approve.ts`:

```typescript
import { Args, CLValue, Key } from 'casper-js-sdk';

export interface ApproveArgsParams {
  spenderPackageHash: string;
  amount: string;
}

/**
 * Build args for CEP-18 token approval.
 * This is a direct contract call (NOT via proxy WASM).
 */
export function buildApproveArgs(params: ApproveArgsParams): Args {
  return Args.fromMap({
    spender: CLValue.newCLKey(Key.newKey(params.spenderPackageHash)),
    amount: CLValue.newCLUInt256(params.amount),
  });
}
```

**Step 5: Create deploy builder (builds the actual Deploy/Transaction objects)**

Create `packages/sdk/src/transactions/deploy-builder.ts`:

```typescript
import {
  Deploy,
  DeployHeader,
  ExecutableDeployItem,
  PublicKey,
  StoredVersionedContractByHash,
  ContractHash,
  Hash,
  type Args,
} from 'casper-js-sdk';
import type { NetworkConfig } from '../config.js';

/**
 * Build a WASM session deploy (for proxy_caller.wasm operations).
 */
export function buildWasmDeploy(params: {
  publicKey: string;
  paymentAmount: string;
  wasmBinary: Uint8Array;
  runtimeArgs: Args;
  networkConfig: NetworkConfig;
}): Deploy {
  const { publicKey, paymentAmount, wasmBinary, runtimeArgs, networkConfig } = params;

  const deployHeader = DeployHeader.default();
  deployHeader.chainName = networkConfig.chainName;
  deployHeader.account = PublicKey.fromHex(publicKey);
  deployHeader.gasPrice = networkConfig.gasPrice;

  const payment = ExecutableDeployItem.standardPayment(paymentAmount);
  const session = ExecutableDeployItem.newModuleBytes(wasmBinary, runtimeArgs);

  return Deploy.makeDeploy(deployHeader, payment, session);
}

/**
 * Build a contract package call deploy (for token approvals).
 */
export function buildContractCallDeploy(params: {
  publicKey: string;
  paymentAmount: string;
  contractPackageHash: string;
  entryPoint: string;
  runtimeArgs: Args;
  networkConfig: NetworkConfig;
}): Deploy {
  const { publicKey, paymentAmount, contractPackageHash, entryPoint, runtimeArgs, networkConfig } = params;

  const deployHeader = DeployHeader.default();
  deployHeader.chainName = networkConfig.chainName;
  deployHeader.account = PublicKey.fromHex(publicKey);
  deployHeader.gasPrice = networkConfig.gasPrice;

  const hash = contractPackageHash.replace('hash-', '');
  const decodedHash = new ContractHash(Hash.fromHex(hash), '');

  const payment = ExecutableDeployItem.standardPayment(paymentAmount);
  const session = new ExecutableDeployItem();
  session.storedVersionedContractByHash = new StoredVersionedContractByHash(decodedHash, entryPoint, runtimeArgs);

  return Deploy.makeDeploy(deployHeader, payment, session);
}
```

Create `packages/sdk/src/transactions/index.ts`:

```typescript
export { buildProxyWasmArgs, serializeInnerArgs } from './proxy-wasm.js';
export { getSwapEntryPoint, buildSwapInnerArgs, getSwapAttachedValue } from './swap.js';
export { buildAddLiquidityInnerArgs, buildRemoveLiquidityInnerArgs } from './liquidity.js';
export { buildApproveArgs } from './approve.js';
export { buildWasmDeploy, buildContractCallDeploy } from './deploy-builder.js';
```

**Step 6: Run all transaction tests**

Run: `npx vitest run packages/sdk/tests/unit/transactions/`
Expected: ALL PASS

**Step 7: Commit**

```bash
git add packages/sdk/src/transactions/ packages/sdk/tests/unit/transactions/
git commit -m "feat(sdk): add liquidity, approve, and deploy builder transaction modules"
```

---

## Phase 6: SDK Client

### Task 16: Create CsprTradeClient

This is the main entry point that wires everything together.

**Files:**
- Create: `packages/sdk/src/client.ts`
- Create: `packages/sdk/src/index.ts`
- Test: `packages/sdk/tests/unit/client.test.ts`

**Step 1: Write the failing test**

Create `packages/sdk/tests/unit/client.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CsprTradeClient } from '../../src/client.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('CsprTradeClient', () => {
  let client: CsprTradeClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    client = new CsprTradeClient({ network: 'testnet' });
  });

  it('should create with testnet config', () => {
    expect(client).toBeDefined();
  });

  it('should create with custom API URL', () => {
    const custom = new CsprTradeClient({
      network: 'testnet',
      apiUrl: 'https://custom-api.example.com',
    });
    expect(custom).toBeDefined();
  });

  it('should expose getTokens method', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [] }))
    );

    const tokens = await client.getTokens();
    expect(Array.isArray(tokens)).toBe(true);
  });

  it('should expose getQuote method', async () => {
    // First call: getTokens for resolution
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({
        data: [
          { contract_package_hash: 'hash-aaa', contract_package: { metadata: { symbol: 'USDT', name: 'Tether', decimals: 6 } } },
        ],
      }))
    );
    // Second call: the actual quote
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({
        data: {
          amount_in: '100000000000',
          amount_out: '50000000',
          execution_price: '0.5',
          mid_price: '0.5',
          path: ['hash-wcspr', 'hash-aaa'],
          price_impact: '0.1',
          recommended_slippage_bps: '10',
          type_id: 1,
        },
      }))
    );

    const quote = await client.getQuote({
      tokenIn: 'CSPR',
      tokenOut: 'USDT',
      amount: '100',
      type: 'exact_in',
    });

    expect(quote.amountIn).toBe('100000000000');
    expect(quote.amountOut).toBe('50000000');
    expect(quote.tokenInSymbol).toBe('CSPR');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run packages/sdk/tests/unit/client.test.ts`
Expected: FAIL

**Step 3: Implement CsprTradeClient**

Create `packages/sdk/src/client.ts`:

```typescript
import { Deploy, PublicKey } from 'casper-js-sdk';

import { HttpClient } from './api/http.js';
import { TokensApi } from './api/tokens.js';
import { PairsApi, type PairQuery, type PaginatedResult } from './api/pairs.js';
import { QuotesApi } from './api/quotes.js';
import { LiquidityApi } from './api/liquidity.js';
import { RatesApi } from './api/rates.js';
import { CurrenciesApi } from './api/currencies.js';
import { SwapsApi } from './api/swaps.js';
import { SubmissionApi } from './api/submission.js';
import { TokenResolver } from './resolver/token-resolver.js';
import { CurrencyResolver } from './resolver/currency-resolver.js';
import {
  getNetworkConfig,
  GAS_COSTS,
  DEFAULT_SLIPPAGE_BPS,
  DEFAULT_DEADLINE_MINUTES,
  CSPR_TOKEN_ID,
  ZERO_HASH,
  PRICE_IMPACT_WARNING_THRESHOLD,
  PRICE_IMPACT_HIGH_THRESHOLD,
  SLIPPAGE_WARNING_THRESHOLD,
  type NetworkConfig,
} from './config.js';
import { toRawAmount, toFormattedAmount, calculateMinWithSlippage, calculateMaxWithSlippage } from './utils/amounts.js';
import { getProxyCallerWasm } from './assets/index.js';
import { buildProxyWasmArgs } from './transactions/proxy-wasm.js';
import { getSwapEntryPoint, buildSwapInnerArgs, getSwapAttachedValue } from './transactions/swap.js';
import { buildAddLiquidityInnerArgs, buildRemoveLiquidityInnerArgs } from './transactions/liquidity.js';
import { buildApproveArgs } from './transactions/approve.js';
import { buildWasmDeploy, buildContractCallDeploy } from './transactions/deploy-builder.js';
import type {
  Token, Pair, Quote, QuoteParams, QuoteType, Currency,
  LiquidityPosition, LiquidityPositionApiResponse, ImpermanentLoss,
  SwapParams, ApprovalParams, AddLiquidityParams, RemoveLiquidityParams,
  TransactionBundle, SubmitResult, Signer,
  SwapHistoryQuery,
} from './types/index.js';

export interface CsprTradeClientConfig {
  network: 'mainnet' | 'testnet';
  apiUrl?: string;
  routerPackageHash?: string;
  wcsprPackageHash?: string;
  signer?: Signer;
}

export class CsprTradeClient {
  private readonly http: HttpClient;
  private readonly tokensApi: TokensApi;
  private readonly pairsApi: PairsApi;
  private readonly quotesApi: QuotesApi;
  private readonly liquidityApi: LiquidityApi;
  private readonly ratesApi: RatesApi;
  private readonly currenciesApi: CurrenciesApi;
  private readonly swapsApi: SwapsApi;
  private readonly submissionApi: SubmissionApi;
  private readonly tokenResolver: TokenResolver;
  private readonly currencyResolver: CurrencyResolver;
  private readonly networkConfig: NetworkConfig;
  private readonly signer?: Signer;

  constructor(config: CsprTradeClientConfig) {
    const baseConfig = getNetworkConfig(config.network);
    this.networkConfig = {
      ...baseConfig,
      apiUrl: config.apiUrl ?? baseConfig.apiUrl,
      routerPackageHash: config.routerPackageHash ?? baseConfig.routerPackageHash,
      wcsprPackageHash: config.wcsprPackageHash ?? baseConfig.wcsprPackageHash,
    };
    this.signer = config.signer;

    this.http = new HttpClient(this.networkConfig.apiUrl);
    this.tokensApi = new TokensApi(this.http);
    this.pairsApi = new PairsApi(this.http);
    this.quotesApi = new QuotesApi(this.http);
    this.liquidityApi = new LiquidityApi(this.http);
    this.ratesApi = new RatesApi(this.http);
    this.currenciesApi = new CurrenciesApi(this.http);
    this.swapsApi = new SwapsApi(this.http);
    this.submissionApi = new SubmissionApi(this.http);

    this.tokenResolver = new TokenResolver(() => this.tokensApi.getTokens());
    this.currencyResolver = new CurrencyResolver(() => this.currenciesApi.getCurrencies());
  }

  // --- Market Data ---

  async getTokens(currency?: string): Promise<Token[]> {
    const currencyId = currency ? await this.currencyResolver.resolveToId(currency) : undefined;
    return this.tokensApi.getTokens(currencyId);
  }

  async getPairs(opts?: PairQuery & { currency?: string }): Promise<PaginatedResult<Pair>> {
    const currencyId = opts?.currency ? await this.currencyResolver.resolveToId(opts.currency) : undefined;
    return this.pairsApi.getPairs({ ...opts, currencyId });
  }

  async getPairDetails(pairIdentifier: string, currency?: string): Promise<Pair> {
    const currencyId = currency ? await this.currencyResolver.resolveToId(currency) : undefined;
    return this.pairsApi.getPairDetails(pairIdentifier, currencyId);
  }

  async getQuote(params: QuoteParams): Promise<Quote> {
    const tokenIn = await this.tokenResolver.resolve(params.tokenIn);
    const tokenOut = await this.tokenResolver.resolve(params.tokenOut);

    const rawAmount = toRawAmount(params.amount, params.type === 'exact_in' ? tokenIn.decimals : tokenOut.decimals);

    const apiQuote = await this.quotesApi.getQuote({
      tokenIn: tokenIn.packageHash,
      tokenOut: tokenOut.packageHash,
      amount: rawAmount,
      typeId: params.type === 'exact_in' ? 1 : 2,
    });

    // Resolve path symbols
    const tokens = await this.tokenResolver.getTokens();
    const pathSymbols = apiQuote.path.map(hash => {
      const wcsprHash = this.networkConfig.wcsprPackageHash.replace('hash-', '');
      if (hash.replace('hash-', '') === wcsprHash) return 'CSPR';
      const t = tokens.find(tk => tk.packageHash.replace('hash-', '') === hash.replace('hash-', ''));
      return t?.symbol ?? hash.slice(0, 12) + '...';
    });

    return {
      amountIn: apiQuote.amount_in,
      amountOut: apiQuote.amount_out,
      amountInFormatted: toFormattedAmount(apiQuote.amount_in, tokenIn.decimals),
      amountOutFormatted: toFormattedAmount(apiQuote.amount_out, tokenOut.decimals),
      executionPrice: apiQuote.execution_price,
      midPrice: apiQuote.mid_price,
      path: apiQuote.path,
      pathSymbols,
      priceImpact: apiQuote.price_impact,
      recommendedSlippageBps: apiQuote.recommended_slippage_bps,
      type: params.type,
      tokenInSymbol: tokenIn.symbol,
      tokenOutSymbol: tokenOut.symbol,
      tokenInDecimals: tokenIn.decimals,
      tokenOutDecimals: tokenOut.decimals,
    };
  }

  async getCurrencies(): Promise<Currency[]> {
    return this.currenciesApi.getCurrencies();
  }

  // --- Account Data ---

  async getLiquidityPositions(publicKey: string, currency?: string): Promise<LiquidityPosition[]> {
    const currencyId = currency ? await this.currencyResolver.resolveToId(currency) : undefined;
    const raw = await this.liquidityApi.getPositions(publicKey, currencyId);
    return raw.map(mapLiquidityPosition);
  }

  async getImpermanentLoss(publicKey: string, pairHash: string): Promise<ImpermanentLoss> {
    const raw = await this.liquidityApi.getImpermanentLoss(publicKey, pairHash);
    return {
      pairContractPackageHash: raw.pair_contract_package_hash,
      value: raw.value,
      timestamp: raw.timestamp,
    };
  }

  async getSwapHistory(opts?: SwapHistoryQuery) {
    return this.swapsApi.getSwaps({
      senderAccountHash: opts?.accountHash,
      pairContractPackageHash: opts?.pairContractPackageHash,
      page: opts?.page,
      pageSize: opts?.pageSize,
    });
  }

  // --- Transaction Building ---

  async buildSwap(params: SwapParams): Promise<TransactionBundle> {
    const tokenIn = await this.tokenResolver.resolve(params.tokenIn);
    const tokenOut = await this.tokenResolver.resolve(params.tokenOut);

    // Fetch fresh quote
    const quote = await this.getQuote({
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amount: params.amount,
      type: params.type,
    });

    const slippageBps = params.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
    const deadlineMinutes = params.deadlineMinutes ?? DEFAULT_DEADLINE_MINUTES;
    const deadline = Date.now() + deadlineMinutes * 60 * 1000;

    const isFirstTokenNative = tokenIn.id === CSPR_TOKEN_ID;
    const isSecondTokenNative = tokenOut.id === CSPR_TOKEN_ID;

    const amountOutMin = calculateMinWithSlippage(quote.amountOut, slippageBps);
    const amountInMax = calculateMaxWithSlippage(quote.amountIn, slippageBps);

    const accountHash = PublicKey.fromHex(params.senderPublicKey).accountHash().toPrefixedString();

    // Build path with WCSPR substitution
    const wcsprHash = this.networkConfig.wcsprPackageHash;
    const path = quote.path.map(h => h.startsWith('hash-') ? h : `hash-${h}`);

    const entryPoint = getSwapEntryPoint(isFirstTokenNative, isSecondTokenNative, params.type);

    const innerArgs = buildSwapInnerArgs({
      isFirstTokenNative,
      isSecondTokenNative,
      quoteType: params.type,
      path,
      accountHash,
      deadline,
      amountIn: quote.amountIn,
      amountOut: quote.amountOut,
      amountInMax,
      amountOutMin,
    });

    const attachedValue = getSwapAttachedValue({
      isFirstTokenNative,
      quoteType: params.type,
      amountIn: quote.amountIn,
      amountInMax,
    });

    const routerHash = this.networkConfig.routerPackageHash.replace('hash-', '');
    const outerArgs = buildProxyWasmArgs({
      routerPackageHash: routerHash,
      entryPoint,
      innerArgs,
      attachedValue,
    });

    const wasmBinary = await getProxyCallerWasm();
    const isBothNotNative = !isFirstTokenNative && !isSecondTokenNative;
    const gasCost = isBothNotNative ? GAS_COSTS.swapTokenForToken : GAS_COSTS.swapCsprForToken;

    const deploy = buildWasmDeploy({
      publicKey: params.senderPublicKey,
      paymentAmount: gasCost.toString(),
      wasmBinary,
      runtimeArgs: outerArgs,
      networkConfig: this.networkConfig,
    });

    const warnings = buildWarnings(quote.priceImpact, slippageBps);

    const slippagePct = (slippageBps / 100).toFixed(2);
    const summary = [
      `Swap ${quote.amountInFormatted} ${tokenIn.symbol} for ~${quote.amountOutFormatted} ${tokenOut.symbol}`,
      `Route: ${quote.pathSymbols.join(' → ')}`,
      `Price impact: ${quote.priceImpact}%`,
      `Max slippage: ${slippagePct}%`,
      `Deadline: ${deadlineMinutes} minutes`,
      `Estimated gas: ${Number(gasCost) / 1_000_000_000} CSPR`,
    ].join('\n');

    return {
      deployJson: JSON.stringify(Deploy.toJSON(deploy)),
      summary,
      estimatedGasCost: `${Number(gasCost) / 1_000_000_000} CSPR`,
      warnings,
    };
  }

  async buildApproval(params: ApprovalParams): Promise<TransactionBundle> {
    const args = buildApproveArgs({
      spenderPackageHash: params.spenderPackageHash,
      amount: params.amount,
    });

    const deploy = buildContractCallDeploy({
      publicKey: params.senderPublicKey,
      paymentAmount: GAS_COSTS.approve.toString(),
      contractPackageHash: params.tokenContractPackageHash,
      entryPoint: 'approve',
      runtimeArgs: args,
      networkConfig: this.networkConfig,
    });

    return {
      deployJson: JSON.stringify(Deploy.toJSON(deploy)),
      summary: `Approve token spending for ${params.tokenContractPackageHash.slice(0, 16)}...`,
      estimatedGasCost: `${Number(GAS_COSTS.approve) / 1_000_000_000} CSPR`,
      warnings: [],
    };
  }

  async buildAddLiquidity(params: AddLiquidityParams): Promise<TransactionBundle> {
    const tokenA = await this.tokenResolver.resolve(params.tokenA);
    const tokenB = await this.tokenResolver.resolve(params.tokenB);

    const slippageBps = params.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
    const deadlineMinutes = params.deadlineMinutes ?? DEFAULT_DEADLINE_MINUTES;
    const deadline = Date.now() + deadlineMinutes * 60 * 1000;

    const isCSPRPair = tokenA.id === CSPR_TOKEN_ID || tokenB.id === CSPR_TOKEN_ID;
    const rawAmountA = toRawAmount(params.amountA, tokenA.decimals);
    const rawAmountB = toRawAmount(params.amountB, tokenB.decimals);
    const accountHash = PublicKey.fromHex(params.senderPublicKey).accountHash().toPrefixedString();

    let innerArgs;
    let entryPoint: string;
    let attachedValue = '0';

    if (isCSPRPair) {
      const csprToken = tokenA.id === CSPR_TOKEN_ID ? tokenA : tokenB;
      const otherToken = tokenA.id === CSPR_TOKEN_ID ? tokenB : tokenA;
      const motesAmount = tokenA.id === CSPR_TOKEN_ID ? rawAmountA : rawAmountB;
      const tokenAmount = tokenA.id === CSPR_TOKEN_ID ? rawAmountB : rawAmountA;

      innerArgs = buildAddLiquidityInnerArgs({
        isCSPRPair: true,
        tokenHash: otherToken.packageHash,
        amountTokenDesired: tokenAmount,
        amountTokenMin: calculateMinWithSlippage(tokenAmount, slippageBps),
        amountCSPRMin: calculateMinWithSlippage(motesAmount, slippageBps),
        accountHash,
        deadline,
      });
      entryPoint = 'add_liquidity_cspr';
      attachedValue = motesAmount;
    } else {
      // Sort tokens by package hash for consistency
      const [sortedA, sortedB, sortedAmountA, sortedAmountB] =
        tokenA.packageHash < tokenB.packageHash
          ? [tokenA, tokenB, rawAmountA, rawAmountB]
          : [tokenB, tokenA, rawAmountB, rawAmountA];

      innerArgs = buildAddLiquidityInnerArgs({
        isCSPRPair: false,
        tokenAHash: sortedA.packageHash,
        tokenBHash: sortedB.packageHash,
        amountADesired: sortedAmountA,
        amountBDesired: sortedAmountB,
        amountAMin: calculateMinWithSlippage(sortedAmountA, slippageBps),
        amountBMin: calculateMinWithSlippage(sortedAmountB, slippageBps),
        accountHash,
        deadline,
      });
      entryPoint = 'add_liquidity';
    }

    const routerHash = this.networkConfig.routerPackageHash.replace('hash-', '');
    const outerArgs = buildProxyWasmArgs({ routerPackageHash: routerHash, entryPoint, innerArgs, attachedValue });
    const wasmBinary = await getProxyCallerWasm();

    // Use higher gas for potentially new pools
    const gasCost = GAS_COSTS.addLiquidity; // caller can override if new pool

    const deploy = buildWasmDeploy({
      publicKey: params.senderPublicKey,
      paymentAmount: gasCost.toString(),
      wasmBinary,
      runtimeArgs: outerArgs,
      networkConfig: this.networkConfig,
    });

    const summary = [
      `Add liquidity: ${params.amountA} ${tokenA.symbol} + ${params.amountB} ${tokenB.symbol}`,
      `Slippage tolerance: ${(slippageBps / 100).toFixed(2)}%`,
      `Deadline: ${deadlineMinutes} minutes`,
      `Estimated gas: ${Number(gasCost) / 1_000_000_000} CSPR`,
    ].join('\n');

    return {
      deployJson: JSON.stringify(Deploy.toJSON(deploy)),
      summary,
      estimatedGasCost: `${Number(gasCost) / 1_000_000_000} CSPR`,
      warnings: [],
    };
  }

  async buildRemoveLiquidity(params: RemoveLiquidityParams): Promise<TransactionBundle> {
    // Fetch user's position to get LP balance and pair info
    const positions = await this.liquidityApi.getPositions(params.senderPublicKey);
    const position = positions.find(
      p => p.pair_contract_package_hash === params.pairContractPackageHash,
    );
    if (!position) {
      throw new Error(`No liquidity position found for pair ${params.pairContractPackageHash}`);
    }

    const slippageBps = params.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
    const deadlineMinutes = params.deadlineMinutes ?? DEFAULT_DEADLINE_MINUTES;
    const deadline = Date.now() + deadlineMinutes * 60 * 1000;
    const accountHash = PublicKey.fromHex(params.senderPublicKey).accountHash().toPrefixedString();

    // Calculate LP amount to burn
    const lpBalance = BigInt(position.lp_token_balance);
    const lpToBurn = (lpBalance * BigInt(params.percentage)) / 100n;
    const lpTotalSupply = BigInt(position.pair_lp_tokens_total_supply);

    // Estimate token amounts
    const reserve0 = BigInt(position.pair.reserve0);
    const reserve1 = BigInt(position.pair.reserve1);
    const estAmount0 = (lpToBurn * reserve0 / lpTotalSupply).toString();
    const estAmount1 = (lpToBurn * reserve1 / lpTotalSupply).toString();

    const wcsprHash = this.networkConfig.wcsprPackageHash.replace('hash-', '');
    const isCSPRPair =
      position.pair.token0_contract_package_hash.replace('hash-', '') === wcsprHash ||
      position.pair.token1_contract_package_hash.replace('hash-', '') === wcsprHash;

    let innerArgs;
    let entryPoint: string;

    if (isCSPRPair) {
      const isToken0CSPR = position.pair.token0_contract_package_hash.replace('hash-', '') === wcsprHash;
      innerArgs = buildRemoveLiquidityInnerArgs({
        isCSPRPair: true,
        tokenHash: isToken0CSPR ? position.pair.token1_contract_package_hash : position.pair.token0_contract_package_hash,
        liquidity: lpToBurn.toString(),
        amountTokenMin: calculateMinWithSlippage(isToken0CSPR ? estAmount1 : estAmount0, slippageBps),
        amountCSPRMin: calculateMinWithSlippage(isToken0CSPR ? estAmount0 : estAmount1, slippageBps),
        accountHash,
        deadline,
      });
      entryPoint = 'remove_liquidity_cspr';
    } else {
      innerArgs = buildRemoveLiquidityInnerArgs({
        isCSPRPair: false,
        tokenAHash: position.pair.token0_contract_package_hash,
        tokenBHash: position.pair.token1_contract_package_hash,
        liquidity: lpToBurn.toString(),
        amountAMin: calculateMinWithSlippage(estAmount0, slippageBps),
        amountBMin: calculateMinWithSlippage(estAmount1, slippageBps),
        accountHash,
        deadline,
      });
      entryPoint = 'remove_liquidity';
    }

    const routerHash = this.networkConfig.routerPackageHash.replace('hash-', '');
    const outerArgs = buildProxyWasmArgs({ routerPackageHash: routerHash, entryPoint, innerArgs, attachedValue: '0' });
    const wasmBinary = await getProxyCallerWasm();

    const deploy = buildWasmDeploy({
      publicKey: params.senderPublicKey,
      paymentAmount: GAS_COSTS.removeLiquidity.toString(),
      wasmBinary,
      runtimeArgs: outerArgs,
      networkConfig: this.networkConfig,
    });

    const summary = [
      `Remove ${params.percentage}% liquidity from pair ${params.pairContractPackageHash.slice(0, 16)}...`,
      `LP tokens to burn: ${lpToBurn.toString()}`,
      `Estimated gas: ${Number(GAS_COSTS.removeLiquidity) / 1_000_000_000} CSPR`,
    ].join('\n');

    return {
      deployJson: JSON.stringify(Deploy.toJSON(deploy)),
      summary,
      estimatedGasCost: `${Number(GAS_COSTS.removeLiquidity) / 1_000_000_000} CSPR`,
      warnings: [],
    };
  }

  // --- Transaction Submission ---

  async submitTransaction(signedDeployJson: string): Promise<SubmitResult> {
    const parsed = JSON.parse(signedDeployJson);
    return this.submissionApi.submitTransaction(parsed);
  }

  // --- Token Resolution ---

  async resolveToken(identifier: string): Promise<Token> {
    return this.tokenResolver.resolve(identifier);
  }
}

function mapLiquidityPosition(raw: LiquidityPositionApiResponse): LiquidityPosition {
  const lpBalance = BigInt(raw.lp_token_balance);
  const totalSupply = BigInt(raw.pair_lp_tokens_total_supply);
  const reserve0 = BigInt(raw.pair.reserve0);
  const reserve1 = BigInt(raw.pair.reserve1);

  const poolShare = totalSupply > 0n
    ? ((lpBalance * 10000n) / totalSupply).toString()
    : '0';

  const estToken0 = totalSupply > 0n ? (lpBalance * reserve0 / totalSupply).toString() : '0';
  const estToken1 = totalSupply > 0n ? (lpBalance * reserve1 / totalSupply).toString() : '0';

  const meta0 = raw.pair.token0_contract_package?.metadata;
  const meta1 = raw.pair.token1_contract_package?.metadata;

  return {
    accountHash: raw.account_hash,
    pairContractPackageHash: raw.pair_contract_package_hash,
    lpTokenBalance: raw.lp_token_balance,
    lpTokenTotalSupply: raw.pair_lp_tokens_total_supply,
    pair: {
      token0Symbol: meta0?.symbol ?? '',
      token1Symbol: meta1?.symbol ?? '',
      token0PackageHash: raw.pair.token0_contract_package_hash,
      token1PackageHash: raw.pair.token1_contract_package_hash,
      reserve0: raw.pair.reserve0,
      reserve1: raw.pair.reserve1,
      decimals0: raw.pair.decimals0,
      decimals1: raw.pair.decimals1,
    },
    poolShare: (Number(poolShare) / 100).toFixed(2),
    estimatedToken0Amount: estToken0,
    estimatedToken1Amount: estToken1,
  };
}

function buildWarnings(priceImpact: string, slippageBps: number): string[] {
  const warnings: string[] = [];
  const impact = parseFloat(priceImpact);

  if (impact > PRICE_IMPACT_HIGH_THRESHOLD) {
    warnings.push(`HIGH PRICE IMPACT: ${priceImpact}% — you will lose a significant portion of your trade to price impact.`);
  } else if (impact > PRICE_IMPACT_WARNING_THRESHOLD) {
    warnings.push(`Price impact is ${priceImpact}% — consider trading a smaller amount.`);
  }

  if (slippageBps / 100 > SLIPPAGE_WARNING_THRESHOLD) {
    warnings.push(`High slippage tolerance: ${(slippageBps / 100).toFixed(2)}% — you may receive significantly less than quoted.`);
  }

  return warnings;
}
```

Create `packages/sdk/src/index.ts`:

```typescript
export { CsprTradeClient, type CsprTradeClientConfig } from './client.js';
export * from './types/index.js';
export { getNetworkConfig, TESTNET_CONFIG, MAINNET_CONFIG, type NetworkConfig } from './config.js';
export { toRawAmount, toFormattedAmount, calculateMinWithSlippage, calculateMaxWithSlippage } from './utils/amounts.js';
```

**Step 4: Run test**

Run: `npx vitest run packages/sdk/tests/unit/client.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/sdk/src/client.ts packages/sdk/src/index.ts packages/sdk/tests/unit/client.test.ts
git commit -m "feat(sdk): add CsprTradeClient with full market data, quote, and transaction building"
```

---

## Phase 7: MCP Server

### Task 17: Create MCP server with market data tools

**Files:**
- Create: `packages/mcp/src/server.ts`
- Create: `packages/mcp/src/tools/market-data.ts`
- Create: `packages/mcp/src/index.ts`
- Test: `packages/mcp/tests/unit/tools/market-data.test.ts`

**Step 1: Write the failing test**

Create `packages/mcp/tests/unit/tools/market-data.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerMarketDataTools } from '../../../src/tools/market-data.js';

describe('Market data tools', () => {
  it('should register get_tokens, get_pairs, get_pair_details, get_quote, get_currencies tools', () => {
    const mockServer = { tool: vi.fn() };
    const mockClient = {} as any;

    registerMarketDataTools(mockServer as any, mockClient);

    const registeredToolNames = mockServer.tool.mock.calls.map((call: any[]) => call[0]);
    expect(registeredToolNames).toContain('get_tokens');
    expect(registeredToolNames).toContain('get_pairs');
    expect(registeredToolNames).toContain('get_pair_details');
    expect(registeredToolNames).toContain('get_quote');
    expect(registeredToolNames).toContain('get_currencies');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run packages/mcp/tests/unit/tools/market-data.test.ts`
Expected: FAIL

**Step 3: Implement market data tools**

Create `packages/mcp/src/tools/market-data.ts`:

```typescript
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CsprTradeClient } from '@cspr-trade/sdk';

export function registerMarketDataTools(server: McpServer, client: CsprTradeClient) {
  server.tool(
    'get_tokens',
    'List all tradable tokens on CSPR.trade with optional fiat pricing',
    { currency: z.string().optional().describe('Fiat currency code (e.g., "USD", "EUR"). Omit for no fiat prices.') },
    async ({ currency }) => {
      const tokens = await client.getTokens(currency);
      return { content: [{ type: 'text' as const, text: JSON.stringify(tokens, null, 2) }] };
    },
  );

  server.tool(
    'get_pairs',
    'List trading pairs on CSPR.trade with reserves and pricing data',
    {
      page: z.number().optional().describe('Page number (default 1)'),
      page_size: z.number().optional().describe('Items per page (default 10, max 250)'),
      order_by: z.enum(['timestamp', 'reserve0', 'reserve1']).optional(),
      order_direction: z.enum(['asc', 'desc']).optional(),
      currency: z.string().optional().describe('Fiat currency code for pricing'),
    },
    async (args) => {
      const result = await client.getPairs({
        page: args.page,
        pageSize: args.page_size,
        orderBy: args.order_by,
        orderDirection: args.order_direction,
        currency: args.currency,
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'get_pair_details',
    'Get detailed information about a specific trading pair',
    {
      pair: z.string().describe('Pair contract package hash (e.g., "hash-abc123...")'),
      currency: z.string().optional().describe('Fiat currency code'),
    },
    async ({ pair, currency }) => {
      const result = await client.getPairDetails(pair, currency);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'get_quote',
    'Get a swap quote for trading between two tokens. Returns amounts, price impact, and routing path.',
    {
      token_in: z.string().describe('Input token: symbol (e.g., "CSPR"), name, or contract hash'),
      token_out: z.string().describe('Output token: symbol (e.g., "USDT"), name, or contract hash'),
      amount: z.string().describe('Human-readable amount (e.g., "100" for 100 CSPR)'),
      type: z.enum(['exact_in', 'exact_out']).describe('"exact_in" = specify input amount, "exact_out" = specify desired output amount'),
    },
    async ({ token_in, token_out, amount, type }) => {
      const quote = await client.getQuote({ tokenIn: token_in, tokenOut: token_out, amount, type });
      return { content: [{ type: 'text' as const, text: JSON.stringify(quote, null, 2) }] };
    },
  );

  server.tool(
    'get_currencies',
    'List supported fiat currencies for price display',
    {},
    async () => {
      const currencies = await client.getCurrencies();
      return { content: [{ type: 'text' as const, text: JSON.stringify(currencies, null, 2) }] };
    },
  );
}
```

Create `packages/mcp/src/server.ts`:

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CsprTradeClient, type CsprTradeClientConfig } from '@cspr-trade/sdk';

import { registerMarketDataTools } from './tools/market-data.js';

export function createServer(config: CsprTradeClientConfig): McpServer {
  const client = new CsprTradeClient(config);

  const server = new McpServer({
    name: 'cspr-trade',
    version: '0.1.0',
  });

  registerMarketDataTools(server, client);
  // Trading, liquidity, and account tools will be registered here

  return server;
}
```

Create `packages/mcp/src/index.ts`:

```typescript
#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

const network = (process.env.CSPR_TRADE_NETWORK as 'mainnet' | 'testnet') ?? 'mainnet';
const apiUrl = process.env.CSPR_TRADE_API_URL;

const server = createServer({ network, apiUrl });
const transport = new StdioServerTransport();
await server.connect(transport);
```

**Step 4: Run test**

Run: `npx vitest run packages/mcp/tests/unit/tools/market-data.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/mcp/src/ packages/mcp/tests/
git commit -m "feat(mcp): add MCP server with market data tools"
```

---

### Task 18: Add trading, liquidity, and account MCP tools

**Files:**
- Create: `packages/mcp/src/tools/trading.ts`
- Create: `packages/mcp/src/tools/liquidity.ts`
- Create: `packages/mcp/src/tools/account.ts`
- Test: `packages/mcp/tests/unit/tools/trading.test.ts`
- Test: `packages/mcp/tests/unit/tools/account.test.ts`

**Step 1: Write failing tests**

Create `packages/mcp/tests/unit/tools/trading.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { registerTradingTools } from '../../../src/tools/trading.js';

describe('Trading tools', () => {
  it('should register build_swap, build_approve_token, submit_transaction, get_transaction_status', () => {
    const mockServer = { tool: vi.fn() };
    registerTradingTools(mockServer as any, {} as any);

    const names = mockServer.tool.mock.calls.map((c: any[]) => c[0]);
    expect(names).toContain('build_swap');
    expect(names).toContain('build_approve_token');
    expect(names).toContain('submit_transaction');
  });
});
```

Create `packages/mcp/tests/unit/tools/account.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { registerAccountTools } from '../../../src/tools/account.js';

describe('Account tools', () => {
  it('should register get_liquidity_positions, get_impermanent_loss, get_swap_history', () => {
    const mockServer = { tool: vi.fn() };
    registerAccountTools(mockServer as any, {} as any);

    const names = mockServer.tool.mock.calls.map((c: any[]) => c[0]);
    expect(names).toContain('get_liquidity_positions');
    expect(names).toContain('get_impermanent_loss');
    expect(names).toContain('get_swap_history');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run packages/mcp/tests/unit/tools/`
Expected: FAIL

**Step 3: Implement trading tools**

Create `packages/mcp/src/tools/trading.ts`:

```typescript
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CsprTradeClient } from '@cspr-trade/sdk';

export function registerTradingTools(server: McpServer, client: CsprTradeClient) {
  server.tool(
    'build_swap',
    'Build an unsigned swap transaction. Returns the deploy JSON for external signing, plus a human-readable summary. The user must sign the deploy externally and submit it via submit_transaction.',
    {
      token_in: z.string().describe('Input token: symbol (e.g., "CSPR"), name, or contract hash'),
      token_out: z.string().describe('Output token: symbol (e.g., "USDT"), name, or contract hash'),
      amount: z.string().describe('Human-readable amount (e.g., "100")'),
      type: z.enum(['exact_in', 'exact_out']).describe('"exact_in" or "exact_out"'),
      slippage_bps: z.number().optional().describe('Slippage tolerance in basis points (default 300 = 3%)'),
      deadline_minutes: z.number().optional().describe('Transaction deadline in minutes (default 20)'),
      sender_public_key: z.string().describe('Sender hex public key (e.g., "01abc...")'),
    },
    async (args) => {
      const bundle = await client.buildSwap({
        tokenIn: args.token_in,
        tokenOut: args.token_out,
        amount: args.amount,
        type: args.type,
        slippageBps: args.slippage_bps,
        deadlineMinutes: args.deadline_minutes,
        senderPublicKey: args.sender_public_key,
      });

      const parts = [bundle.summary];
      if (bundle.warnings.length > 0) {
        parts.push('\n⚠️ WARNINGS:\n' + bundle.warnings.join('\n'));
      }
      parts.push('\nUnsigned deploy JSON (sign externally, then use submit_transaction):');
      parts.push(bundle.deployJson);

      return { content: [{ type: 'text' as const, text: parts.join('\n') }] };
    },
  );

  server.tool(
    'build_approve_token',
    'Build an unsigned token approval transaction. Required before swapping or adding liquidity with a token for the first time.',
    {
      token: z.string().describe('Token contract package hash to approve'),
      amount: z.string().describe('Raw amount to approve'),
      sender_public_key: z.string().describe('Sender hex public key'),
    },
    async (args) => {
      const bundle = await client.buildApproval({
        tokenContractPackageHash: args.token,
        spenderPackageHash: '', // will use router from config
        amount: args.amount,
        senderPublicKey: args.sender_public_key,
      });

      return { content: [{ type: 'text' as const, text: bundle.summary + '\n\n' + bundle.deployJson }] };
    },
  );

  server.tool(
    'submit_transaction',
    'Submit a signed deploy/transaction to the Casper network via the CSPR.trade API',
    {
      signed_deploy_json: z.string().describe('The signed deploy JSON string'),
    },
    async ({ signed_deploy_json }) => {
      const result = await client.submitTransaction(signed_deploy_json);
      return { content: [{ type: 'text' as const, text: `Transaction submitted. Hash: ${result.transactionHash}` }] };
    },
  );
}
```

Create `packages/mcp/src/tools/liquidity.ts`:

```typescript
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CsprTradeClient } from '@cspr-trade/sdk';

export function registerLiquidityTools(server: McpServer, client: CsprTradeClient) {
  server.tool(
    'build_add_liquidity',
    'Build an unsigned add-liquidity transaction for a token pair',
    {
      token_a: z.string().describe('First token: symbol, name, or hash'),
      token_b: z.string().describe('Second token: symbol, name, or hash'),
      amount_a: z.string().describe('Human-readable amount of first token'),
      amount_b: z.string().describe('Human-readable amount of second token'),
      slippage_bps: z.number().optional().describe('Slippage in basis points (default 300)'),
      deadline_minutes: z.number().optional().describe('Deadline in minutes (default 20)'),
      sender_public_key: z.string().describe('Sender hex public key'),
    },
    async (args) => {
      const bundle = await client.buildAddLiquidity({
        tokenA: args.token_a,
        tokenB: args.token_b,
        amountA: args.amount_a,
        amountB: args.amount_b,
        slippageBps: args.slippage_bps,
        deadlineMinutes: args.deadline_minutes,
        senderPublicKey: args.sender_public_key,
      });
      return { content: [{ type: 'text' as const, text: bundle.summary + '\n\n' + bundle.deployJson }] };
    },
  );

  server.tool(
    'build_remove_liquidity',
    'Build an unsigned remove-liquidity transaction',
    {
      pair: z.string().describe('Pair contract package hash'),
      percentage: z.number().min(1).max(100).describe('Percentage of liquidity to remove (1-100)'),
      slippage_bps: z.number().optional().describe('Slippage in basis points (default 300)'),
      deadline_minutes: z.number().optional().describe('Deadline in minutes (default 20)'),
      sender_public_key: z.string().describe('Sender hex public key'),
    },
    async (args) => {
      const bundle = await client.buildRemoveLiquidity({
        pairContractPackageHash: args.pair,
        percentage: args.percentage,
        slippageBps: args.slippage_bps,
        deadlineMinutes: args.deadline_minutes,
        senderPublicKey: args.sender_public_key,
      });
      return { content: [{ type: 'text' as const, text: bundle.summary + '\n\n' + bundle.deployJson }] };
    },
  );
}
```

Create `packages/mcp/src/tools/account.ts`:

```typescript
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CsprTradeClient } from '@cspr-trade/sdk';

export function registerAccountTools(server: McpServer, client: CsprTradeClient) {
  server.tool(
    'get_liquidity_positions',
    'Get liquidity positions for an account, showing LP token balances, pool shares, and estimated token amounts',
    {
      account_public_key: z.string().describe('Account public key (hex)'),
      currency: z.string().optional().describe('Fiat currency code'),
    },
    async ({ account_public_key, currency }) => {
      const positions = await client.getLiquidityPositions(account_public_key, currency);
      return { content: [{ type: 'text' as const, text: JSON.stringify(positions, null, 2) }] };
    },
  );

  server.tool(
    'get_impermanent_loss',
    'Calculate impermanent loss for a liquidity position',
    {
      account_public_key: z.string().describe('Account public key (hex)'),
      pair: z.string().describe('Pair contract package hash'),
    },
    async ({ account_public_key, pair }) => {
      const il = await client.getImpermanentLoss(account_public_key, pair);
      return { content: [{ type: 'text' as const, text: JSON.stringify(il, null, 2) }] };
    },
  );

  server.tool(
    'get_swap_history',
    'Get swap transaction history',
    {
      account_hash: z.string().optional().describe('Filter by account hash'),
      pair: z.string().optional().describe('Filter by pair contract package hash'),
      page: z.number().optional(),
      page_size: z.number().optional(),
    },
    async (args) => {
      const result = await client.getSwapHistory({
        accountHash: args.account_hash,
        pairContractPackageHash: args.pair,
        page: args.page,
        pageSize: args.page_size,
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
```

**Step 4: Wire all tools into the server**

Update `packages/mcp/src/server.ts`:

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CsprTradeClient, type CsprTradeClientConfig } from '@cspr-trade/sdk';

import { registerMarketDataTools } from './tools/market-data.js';
import { registerTradingTools } from './tools/trading.js';
import { registerLiquidityTools } from './tools/liquidity.js';
import { registerAccountTools } from './tools/account.js';

export function createServer(config: CsprTradeClientConfig): McpServer {
  const client = new CsprTradeClient(config);

  const server = new McpServer({
    name: 'cspr-trade',
    version: '0.1.0',
  });

  registerMarketDataTools(server, client);
  registerTradingTools(server, client);
  registerLiquidityTools(server, client);
  registerAccountTools(server, client);

  return server;
}
```

**Step 5: Run all MCP tests**

Run: `npx vitest run packages/mcp/tests/`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add packages/mcp/
git commit -m "feat(mcp): add trading, liquidity, and account MCP tools"
```

---

## Phase 8: Documentation

### Task 19: Create llms.txt

**Files:**
- Create: `docs/llms.txt`

**Step 1: Write llms.txt**

This is a machine-readable document following the llms.txt standard that gives any LLM complete context about CSPR.trade.

Content should include:
- Protocol overview (Uniswap V2 fork, Casper Network)
- All MCP tool names, parameters, and usage examples
- Token identification guide (use symbols like "CSPR", "USDT")
- Common workflows with step-by-step examples
- Contract addresses (testnet and mainnet)
- Error codes and troubleshooting
- Safety guidelines (always show what user is signing, warn on high impact)

**Step 2: Commit**

```bash
git add docs/llms.txt
git commit -m "docs: add llms.txt for LLM-readable CSPR.trade documentation"
```

---

### Task 20: Create SKILL.md

**Files:**
- Create: `docs/SKILL.md`

**Step 1: Write SKILL.md**

A Claude Code skill that provides step-by-step guidance for DEX interactions:
- Understand user intent (swap, liquidity, check positions)
- Walk through the non-custodial signing flow
- Include safety checks and confirmations
- Handle error recovery

**Step 2: Commit**

```bash
git add docs/SKILL.md
git commit -m "docs: add Claude Code SKILL.md for guided DEX interactions"
```

---

### Task 21: Integration tests

**Files:**
- Create: `packages/sdk/tests/integration/api.integration.test.ts`
- Create: `packages/mcp/tests/integration/mcp-server.integration.test.ts`

**Step 1: Write SDK integration test**

Test against the real testnet API to verify the full flow:
- Fetch tokens
- Fetch pairs
- Get a quote for CSPR→token swap
- Verify token resolution works with live data

Mark these tests with a special tag so they can be run separately (they require network access).

**Step 2: Write MCP integration test**

Test full MCP protocol round-trips:
- Start MCP server in-process
- Send tool calls via MCP protocol
- Verify responses are valid

**Step 3: Commit**

```bash
git add packages/sdk/tests/integration/ packages/mcp/tests/integration/
git commit -m "test: add SDK and MCP integration tests"
```

---

### Task 22: Final review and polish

**Step 1: Run full test suite**

Run: `npm test`
Expected: ALL PASS

**Step 2: Build both packages**

Run: `npm run build`
Expected: Successful build with no errors

**Step 3: Verify MCP server starts**

Run: `echo '{}' | node packages/mcp/dist/index.js`
Expected: Server starts without errors

**Step 4: Commit any final fixes**

```bash
git add -A
git commit -m "chore: final polish and build verification"
```
