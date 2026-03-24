# @make-software/cspr-trade-mcp-sdk

TypeScript SDK for the [CSPR.trade](https://cspr.trade) DEX on the Casper Network. Provides market data queries, swap/liquidity transaction building, and token resolution — all through the CSPR.trade API.

Non-custodial: all transaction methods return unsigned transaction JSON for external signing.

## Installation

```bash
npm install @make-software/cspr-trade-mcp-sdk
```

## Quick Start

```typescript
import { CsprTradeClient } from '@make-software/cspr-trade-mcp-sdk';

const client = new CsprTradeClient({ network: 'testnet' });

// Get a swap quote
const quote = await client.getQuote({
  tokenIn: 'CSPR',
  tokenOut: 'USDT',
  amount: '1000',
  type: 'exact_in',
});
console.log(`${quote.amountInFormatted} CSPR -> ${quote.amountOutFormatted} USDT`);
console.log(`Price impact: ${quote.priceImpact}%`);

// Build an unsigned swap transaction
const bundle = await client.buildSwap({
  tokenIn: 'CSPR',
  tokenOut: 'USDT',
  amount: '1000',
  type: 'exact_in',
  senderPublicKey: '01abc...',
});
console.log(bundle.summary);
// => "Swap 1000 CSPR for ~42.5 USDT\nRoute: CSPR → WCSPR → USDT\n..."

// bundle.transactionJson is the unsigned transaction — sign externally, then submit:
const result = await client.submitTransaction(signedTransactionJson);
console.log(`Submitted: ${result.transactionHash}`);
```

## Configuration

```typescript
const client = new CsprTradeClient({
  network: 'testnet',               // 'mainnet' | 'testnet'
  apiUrl: 'https://custom-api.com', // optional override
  routerPackageHash: 'hash-...',    // optional override
  wcsprPackageHash: 'hash-...',     // optional override
});
```

## API Reference

### Market Data

#### `getTokens(currency?)`

List all tradable tokens with optional fiat pricing.

```typescript
const tokens = await client.getTokens('USD');
// [{ symbol: 'CSPR', name: 'Casper', decimals: 9, fiatPrice: 0.012, ... }, ...]
```

#### `getPairs(opts?)`

List trading pairs with reserves and pricing.

```typescript
const pairs = await client.getPairs({
  page: 1,
  page_size: 10,
  order_by: 'reserve0',
  order_direction: 'desc',
  currency: 'USD',
});
```

#### `getPairDetails(pairHash, currency?)`

Get detailed info about a specific pair.

```typescript
const pair = await client.getPairDetails('hash-abc123...', 'USD');
```

#### `getQuote(params)`

Get a swap quote with routing path, price impact, and recommended slippage.

```typescript
const quote = await client.getQuote({
  tokenIn: 'CSPR',      // symbol, name, or contract hash
  tokenOut: 'USDT',
  amount: '100',         // human-readable
  type: 'exact_in',      // or 'exact_out'
});
```

#### `getCurrencies()`

List supported fiat currencies.

```typescript
const currencies = await client.getCurrencies();
// [{ code: 'USD', name: 'US Dollar', symbol: '$' }, ...]
```

### Account Data

#### `getLiquidityPositions(publicKey, currency?)`

Get liquidity positions for an account.

```typescript
const positions = await client.getLiquidityPositions('01abc...', 'USD');
```

#### `getImpermanentLoss(publicKey, pairHash)`

Calculate impermanent loss for a position.

```typescript
const il = await client.getImpermanentLoss('01abc...', 'hash-...');
```

#### `getSwapHistory(opts?)`

Get swap transaction history, optionally filtered by account or pair.

```typescript
const history = await client.getSwapHistory({
  accountHash: 'account-hash-...',
  page: 1,
  pageSize: 20,
});
```

### Transaction Building

All transaction methods return a `TransactionBundle`:

```typescript
interface TransactionBundle {
  transactionJson: string;             // Unsigned transaction JSON — sign externally
  summary: string;                     // Human-readable description
  estimatedGasCost: string;            // e.g. "30 CSPR"
  approvalRequired?: TransactionBundle; // Token approval if needed
  warnings: string[];                  // Price impact, slippage warnings
}
```

#### `buildSwap(params)`

```typescript
const bundle = await client.buildSwap({
  tokenIn: 'CSPR',
  tokenOut: 'USDT',
  amount: '100',
  type: 'exact_in',
  slippageBps: 300,          // 3% (default)
  deadlineMinutes: 20,       // default
  senderPublicKey: '01abc...',
});
```

#### `buildAddLiquidity(params)`

```typescript
const bundle = await client.buildAddLiquidity({
  tokenA: 'CSPR',
  tokenB: 'USDT',
  amountA: '1000',
  amountB: '42',
  senderPublicKey: '01abc...',
});
```

#### `buildRemoveLiquidity(params)`

```typescript
const bundle = await client.buildRemoveLiquidity({
  pairContractPackageHash: 'hash-...',
  percentage: 50,            // remove 50% of position
  senderPublicKey: '01abc...',
});
```

#### `buildApproval(params)`

```typescript
const bundle = await client.buildApproval({
  tokenContractPackageHash: 'hash-...',
  spenderPackageHash: 'hash-...',
  amount: '1000000000',      // raw amount
  senderPublicKey: '01abc...',
});
```

### Transaction Submission

#### `submitTransaction(signedDeployJson)`

```typescript
const result = await client.submitTransaction(signedDeployJson);
console.log(result.transactionHash);
```

### Token Resolution

#### `resolveToken(identifier)`

Resolve a token by symbol, name, or contract hash.

```typescript
const token = await client.resolveToken('CSPR');
// { symbol: 'CSPR', decimals: 9, packageHash: '0000...0000', ... }
```

Resolution order: exact symbol match -> exact name match -> contract hash match.

## Utility Functions

```typescript
import { toRawAmount, toFormattedAmount } from '@make-software/cspr-trade-mcp-sdk';

toRawAmount('100.5', 9);       // '100500000000'
toFormattedAmount('100500000000', 9); // '100.5'
```

## Gas Costs

| Operation | Cost |
|-----------|------|
| Token approval | 5 CSPR |
| Swap | 30 CSPR |
| Add liquidity | 50 CSPR (500 for new pools) |
| Remove liquidity | 30 CSPR |

## Safety Warnings

The SDK automatically generates warnings for:
- Price impact > 5% (warning) or > 15% (strong warning)
- Slippage tolerance > 10%

## Development

```bash
npm run build        # Build to dist/
npm test             # Run unit tests
npm run test:watch   # Watch mode
```
