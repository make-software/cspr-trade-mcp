# CSPR.trade AI Agent Integration - Design Document

**Date**: 2026-02-23
**Status**: Approved

## Problem

AI agents cannot interact with CSPR.trade, the decentralized exchange on Casper Network. There is no programmatic SDK, no MCP integration, and no machine-readable documentation for LLMs. Agents need to read market data, compose trades, manage liquidity, and track positions — all without holding private keys.

## Solution Overview

A three-layer solution:

1. **`@cspr-trade/sdk`** — TypeScript SDK encapsulating all CSPR.trade operations
2. **`@cspr-trade/mcp`** — MCP server wrapping the SDK as tools for Claude Code and MCP-compatible clients
3. **`llms.txt` + `SKILL.md`** — Machine-readable documentation and Claude Code skill for natural-language guidance

The solution is **non-custodial**: it never knows the user's private key. Transactions that require signing are returned unsigned. The user signs externally and feeds the signed transaction back for submission.

## Architecture

```
┌─────────────────────────────────────────────┐
│  Claude Code / Any MCP Client               │
│  (uses MCP tools directly)                  │
└──────────────┬──────────────────────────────┘
               │ MCP Protocol
┌──────────────▼──────────────────────────────┐
│  @cspr-trade/mcp  (MCP Server)              │
│  - Tools: get_tokens, get_quote, swap, etc. │
│  - Returns unsigned deploys for signing     │
│  - Accepts signed deploys for submission    │
└──────────────┬──────────────────────────────┘
               │ function calls
┌──────────────▼──────────────────────────────┐
│  @cspr-trade/sdk  (TypeScript SDK)          │
│  - CsprTradeClient class                    │
│  - Quote, Swap, Liquidity, Position APIs    │
│  - Pluggable signer interface               │
│  - Transaction builder (proxy WASM deploys) │
└──────────────┬──────────────────────────────┘
               │ HTTP
┌──────────────▼──────────────────────────────┐
│  CSPR.trade API + CSPR.cloud proxy          │
└─────────────────────────────────────────────┘
```

## Background: CSPR.trade Protocol

CSPR.trade is a Uniswap V2 fork on Casper Network, built with the Odra framework (Rust). The protocol consists of:

- **Factory**: Pair registry and creation, admin management
- **Router**: User-facing swap and liquidity operations (6 swap variants, 2 add-liquidity variants, 2 remove-liquidity variants)
- **Pair**: AMM pool holding reserves, minting/burning LP tokens, executing swaps. Embedded CEP-18 LP token.
- **WCSPR**: Wrapped native CSPR (CEP-18 compatible)

Key characteristics:
- 0.3% swap fee (accrues to LPs)
- Optional 1/6 protocol fee (0.05% effective) when fee_to is set
- Multi-hop routing via token paths
- TWAP price oracle via cumulative price accumulators
- Flash swap support
- Non-reentrant pair operations

### Transaction Pattern

All DEX operations use a **proxy caller WASM pattern**: a `proxy_caller.wasm` session is deployed that wraps inner contract call args as a byte array. The outer deploy args are:

```
package_hash: ByteArray (router contract package hash)
entry_point: String (e.g., "swap_exact_tokens_for_tokens")
args: List<UInt8> (inner args serialized to bytes)
attached_value: UInt512 (CSPR amount for native token ops)
amount: UInt512 (CSPR amount)
```

### Existing Backend API

The cspr-trade-api (Go) provides:
- `GET /tokens` — all tradable tokens
- `GET /pairs` — paginated trading pairs with reserves
- `GET /pairs/{hash}` — single pair details
- `GET /quote` — swap quote with multi-hop DFS routing (up to 3 hops)
- `GET /accounts/{id}/liquidity-positions` — LP positions
- `GET /accounts/{id}/liquidity-position-impermanent-loss` — IL calculation
- `POST /token-listing-requests` — contact form (reCAPTCHA)
- Proxied: `/swaps`, `/rates`, `/ft/*/rates`, `/ft/*/daily-dex-rates`, `/ft/*/dex-rates/latest`, `/currencies`, `/wasm-proxy-transaction`, `/wasm-proxy-transaction-submission`

The API is unauthenticated for all read endpoints. No rate limiting.

## Package Structure

```
cspr-trade-mcp/
├── packages/
│   ├── sdk/                              # @cspr-trade/sdk
│   │   ├── src/
│   │   │   ├── client.ts                 # CsprTradeClient - main entry point
│   │   │   ├── config.ts                 # Network configs (mainnet/testnet)
│   │   │   ├── api/                      # API client layer
│   │   │   │   ├── http.ts              # Base HTTP client (axios/fetch)
│   │   │   │   ├── tokens.ts
│   │   │   │   ├── pairs.ts
│   │   │   │   ├── quotes.ts
│   │   │   │   ├── liquidity.ts
│   │   │   │   ├── swaps.ts
│   │   │   │   ├── rates.ts
│   │   │   │   └── currencies.ts
│   │   │   ├── transactions/             # Transaction builders
│   │   │   │   ├── swap.ts
│   │   │   │   ├── liquidity.ts
│   │   │   │   ├── approve.ts
│   │   │   │   └── proxy-wasm.ts        # Proxy WASM arg encoding
│   │   │   ├── resolver/                # Token/currency resolution
│   │   │   │   ├── token-resolver.ts    # Symbol/name → hash resolution
│   │   │   │   └── currency-resolver.ts # Code → ID resolution
│   │   │   ├── signer/
│   │   │   │   ├── types.ts             # Signer interface
│   │   │   │   └── noop.ts             # Default no-op (returns unsigned)
│   │   │   ├── types/
│   │   │   │   ├── api.ts              # API response types
│   │   │   │   ├── token.ts
│   │   │   │   ├── pair.ts
│   │   │   │   ├── quote.ts
│   │   │   │   ├── liquidity.ts
│   │   │   │   ├── transaction.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   │   ├── api/
│   │   │   │   │   ├── tokens.test.ts
│   │   │   │   │   ├── pairs.test.ts
│   │   │   │   │   ├── quotes.test.ts
│   │   │   │   │   └── liquidity.test.ts
│   │   │   │   ├── transactions/
│   │   │   │   │   ├── swap.test.ts
│   │   │   │   │   ├── liquidity.test.ts
│   │   │   │   │   ├── approve.test.ts
│   │   │   │   │   └── proxy-wasm.test.ts
│   │   │   │   ├── resolver/
│   │   │   │   │   ├── token-resolver.test.ts
│   │   │   │   │   └── currency-resolver.test.ts
│   │   │   │   └── client.test.ts
│   │   │   └── integration/
│   │   │       ├── api.integration.test.ts
│   │   │       └── transaction.integration.test.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── mcp/                              # @cspr-trade/mcp
│       ├── src/
│       │   ├── server.ts                 # MCP server setup
│       │   ├── tools/
│       │   │   ├── market-data.ts       # get_tokens, get_pairs, get_pair_details
│       │   │   ├── trading.ts           # get_quote, build_swap, submit_transaction
│       │   │   ├── liquidity.ts         # build_add_liquidity, build_remove_liquidity
│       │   │   └── account.ts           # get_positions, get_balances
│       │   └── index.ts
│       ├── tests/
│       │   ├── unit/
│       │   │   └── tools/
│       │   │       ├── market-data.test.ts
│       │   │       ├── trading.test.ts
│       │   │       ├── liquidity.test.ts
│       │   │       └── account.test.ts
│       │   └── integration/
│       │       └── mcp-server.integration.test.ts
│       ├── package.json
│       └── tsconfig.json
│
├── docs/
│   ├── plans/
│   │   └── 2026-02-23-cspr-trade-agent-integration-design.md
│   ├── llms.txt
│   └── SKILL.md
│
├── package.json                          # Workspace root
├── tsconfig.base.json
└── vitest.config.ts                      # Shared vitest config
```

## SDK Core API

### Configuration

```typescript
interface CsprTradeConfig {
  apiUrl: string;                    // API base URL
  network: "mainnet" | "testnet";   // Network selection
  routerPackageHash?: string;        // Override router contract hash
  wcsprPackageHash?: string;         // Override WCSPR contract hash
  signer?: Signer;                   // Optional pluggable signer
}

// Pre-configured network defaults
const MAINNET_CONFIG = {
  apiUrl: "https://api.cspr.trade",     // TBD: confirm production URL
  routerPackageHash: "hash-...",         // Mainnet router
  wcsprPackageHash: "hash-...",          // Mainnet WCSPR
};

const TESTNET_CONFIG = {
  apiUrl: "https://cspr-trade-api.dev.make.services",
  routerPackageHash: "hash-04a11a367e708c52557930c4e9c1301f4465100d1b1b6d0a62b48d3e32402867",
  wcsprPackageHash: "hash-3d80df21ba4ee4d66a2a1f60c32570dd5685e4b279f6538162a5fd1314847c1e",
};
```

### Signer Interface

```typescript
interface Signer {
  sign(deploy: UnsignedDeploy): Promise<SignedDeploy>;
}

// Default: no-op signer that returns the deploy unchanged (user signs externally)
class NoopSigner implements Signer {
  async sign(deploy: UnsignedDeploy): Promise<SignedDeploy> {
    throw new Error("No signer configured. Sign the deploy externally and use submitTransaction().");
  }
}
```

### CsprTradeClient

```typescript
class CsprTradeClient {
  constructor(config: CsprTradeConfig);

  // Market data
  async getTokens(currency?: string): Promise<Token[]>;
  async getPairs(opts?: PairQuery): Promise<PaginatedResult<Pair>>;
  async getPairDetails(identifier: string, currency?: string): Promise<Pair>;
  async getQuote(params: QuoteParams): Promise<Quote>;
  async getCurrencies(): Promise<Currency[]>;
  async getTokenPrice(token: string, currency?: string): Promise<TokenPrice>;
  async getCsprPrice(currency?: string): Promise<CsprPrice>;

  // Account data
  async getLiquidityPositions(publicKey: string, currency?: string): Promise<LiquidityPosition[]>;
  async getImpermanentLoss(publicKey: string, pairHash: string): Promise<ImpermanentLoss>;
  async getSwapHistory(opts?: SwapHistoryQuery): Promise<PaginatedResult<Swap>>;

  // Transaction building (returns unsigned deploys)
  async buildSwap(params: SwapParams): Promise<TransactionBundle>;
  async buildApproval(params: ApprovalParams): Promise<TransactionBundle>;
  async buildAddLiquidity(params: AddLiquidityParams): Promise<TransactionBundle>;
  async buildRemoveLiquidity(params: RemoveLiquidityParams): Promise<TransactionBundle>;

  // Transaction submission
  async submitTransaction(signedDeploy: SignedDeploy): Promise<SubmitResult>;
  async getTransactionStatus(deployHash: string): Promise<TransactionStatus>;

  // Token resolution
  async resolveToken(identifier: string): Promise<ResolvedToken>;
}
```

### Token Resolution

Tokens can be identified by:
- **Symbol**: "CSPR", "USDT", "WCSPR"
- **Name**: "Casper", "Tether"
- **Contract package hash**: "hash-abc123..."

The resolver fetches the token list from the API (cached with TTL), then matches:
1. Exact symbol match (case-insensitive)
2. Exact name match (case-insensitive)
3. Contract package hash match

"CSPR" always resolves to the native CSPR zero-hash token. "WCSPR" resolves to the wrapped CSPR contract.

### Amount Handling

The SDK accepts human-readable amounts and converts to raw amounts (motes/smallest units) based on token decimals:
- Input: `"100"` with token CSPR (9 decimals) → `"100000000000"` motes
- Input: `"50.5"` with token USDT (6 decimals) → `"50500000"` raw

### TransactionBundle

```typescript
interface TransactionBundle {
  deploy: object;                        // The unsigned deploy structure
  deployJson: string;                    // JSON-serialized for transport
  summary: string;                       // Human-readable description
  approvalRequired?: TransactionBundle;  // Token approval deploy (if needed)
  estimatedGasCost: string;              // Gas cost in CSPR
  warnings: string[];                    // Safety warnings (high impact, etc.)
}
```

## MCP Tools

### Read-Only / Market Data

| Tool | Parameters | Returns |
|------|-----------|---------|
| `get_tokens` | `currency?: string` | Token list with fiat prices |
| `get_pairs` | `page?, page_size?, order_by?, order_direction?, currency?` | Paginated pair list |
| `get_pair_details` | `pair: string, currency?` | Pair details with reserves |
| `get_quote` | `token_in, token_out, amount, type: "exact_in"\|"exact_out"` | Quote with path, price impact |
| `get_currencies` | (none) | Supported fiat currencies |
| `get_token_price` | `token, currency?` | Token fiat price |
| `get_cspr_price` | `currency?` | CSPR fiat rate |
| `get_liquidity_positions` | `account_public_key, currency?` | LP positions |
| `get_impermanent_loss` | `account_public_key, pair` | IL percentage |
| `get_swap_history` | `account_hash?, pair?, page?, page_size?` | Swap history |

### Transaction Building

| Tool | Parameters | Returns |
|------|-----------|---------|
| `build_swap` | `token_in, token_out, amount, type, slippage_bps?, deadline_minutes?, sender_public_key` | Unsigned deploy + summary |
| `build_approve_token` | `token, spender, amount, sender_public_key` | Unsigned deploy |
| `build_add_liquidity` | `token_a, token_b, amount_a, amount_b, slippage_bps?, deadline_minutes?, sender_public_key` | Unsigned deploy + summary |
| `build_remove_liquidity` | `pair, percentage, slippage_bps?, deadline_minutes?, sender_public_key` | Unsigned deploy + summary |

### Transaction Submission

| Tool | Parameters | Returns |
|------|-----------|---------|
| `submit_transaction` | `signed_deploy_json` | Deploy hash + status |
| `get_transaction_status` | `deploy_hash` | Status |

Token parameters accept symbol, name, or contract hash. Currency parameters accept currency code (e.g., "USD"). Amounts are human-readable.

## Non-Custodial Signing Flow

```
Agent                              MCP/SDK                    User
  │                                     │                       │
  ├─ get_quote("CSPR","USDT","100")────►│                       │
  │◄─ Quote: ~50.23 USDT ─────────────┤                       │
  │                                     │                       │
  ├─ build_swap(params) ───────────────►│                       │
  │◄─ TransactionBundle ───────────────┤                       │
  │   { deploy, summary, warnings,      │                       │
  │     approvalRequired? }             │                       │
  │                                     │                       │
  ├─ "Please sign this:" ──────────────────────────────────────►│
  │◄─ signed deploy ──────────────────────────────────────────┤
  │                                     │                       │
  ├─ submit_transaction(signed) ───────►│                       │
  │◄─ { hash, status } ───────────────┤                       │
  │                                     │                       │
  ├─ get_transaction_status(hash) ─────►│                       │
  │◄─ "success" ───────────────────────┤                       │
```

When a signer is provided, the SDK can execute the full flow automatically:
```typescript
const client = new CsprTradeClient({ ..., signer: mySigner });
const result = await client.executeSwap(params); // builds → signs → submits
```

## Safety & Guardrails

The SDK and MCP tools enforce:

1. **Never request private keys** — the signer interface abstracts signing
2. **Human-readable summaries** — every transaction includes a plain-English description
3. **Warnings for risky operations**:
   - Price impact > 5%: warning
   - Price impact > 15%: strong warning
   - Slippage > 10%: warning
   - Very small or very large trade sizes: warning
4. **Deadline enforcement** — default 20 minutes, configurable 1-120 minutes
5. **Default slippage** — 3% (300 bps), matching the frontend default

## Testing Strategy

### Unit Tests (Vitest)
- **API client**: Mock HTTP responses, verify request construction and response parsing
- **Transaction builders**: Verify deploy structure, arg serialization, proxy WASM encoding matches frontend behavior
- **Token resolver**: Test symbol/name/hash resolution, caching, edge cases
- **Currency resolver**: Test code → ID mapping
- **MCP tools**: Test each tool handler with mocked SDK client

### Integration Tests
- **SDK**: Against a running API (or recorded fixtures) — verify full quote→build→serialize flow
- **MCP**: Full MCP protocol round-trips — verify tool calls produce correct responses
- **Transaction verification**: Build deploys with known parameters and verify they match what the frontend would produce for the same operation

### Key Test Scenarios
- Swap CSPR → token (exact in)
- Swap token → CSPR (exact out)
- Swap token → token (multi-hop)
- Add liquidity (token-token)
- Add liquidity (token-CSPR)
- Remove liquidity (with CSPR)
- Token approval flow
- Token resolution (symbol, name, hash)
- Amount conversion (human → raw)
- Error handling (invalid token, insufficient liquidity, expired deadline)

## Contract Addresses

### Testnet (confirmed from frontend config)
- Router: `hash-04a11a367e708c52557930c4e9c1301f4465100d1b1b6d0a62b48d3e32402867`
- WCSPR: `hash-3d80df21ba4ee4d66a2a1f60c32570dd5685e4b279f6538162a5fd1314847c1e`
- API: `https://cspr-trade-api.dev.make.services`

### Mainnet (to be confirmed)
- Router: TBD
- WCSPR: TBD
- API: TBD (likely `https://api.cspr.trade` or similar)

## Gas Costs (from frontend)

| Operation | Gas (CSPR) |
|-----------|-----------|
| Token approval | 5 |
| Swap (any variant) | 30 |
| Add liquidity (existing pool) | 50 |
| Add liquidity (new pool) | 500 |
| Remove liquidity | 30 |

## Dependencies

### SDK
- `casper-js-sdk` v5.x — transaction/deploy building, CLValue encoding
- `blakejs` — blake2b hashing for dictionary key derivation
- `big.js` — decimal arithmetic for amount conversion
- `@noble/hashes` — hex utilities

### MCP Server
- `@modelcontextprotocol/sdk` — MCP server framework
- `@cspr-trade/sdk` — the SDK package

### Dev/Test
- `vitest` — test runner
- `typescript` v5.x
- `tsup` or `unbuild` — bundling
