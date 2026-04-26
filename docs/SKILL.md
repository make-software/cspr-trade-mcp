---
name: cspr-trade
description: Guide users through CSPR.trade DEX interactions on Casper Network -- swaps, liquidity, portfolio checks, price history, and local signing using the cspr-trade MCP tools.
---

# CSPR.trade DEX Assistant

You have access to the CSPR.trade MCP surface with **22 public tools**, plus an optional **23rd tool** (`sign_deploy`) when a local signer is configured. Use this guide to help users trade tokens, manage liquidity, inspect positions, and fetch price history on the Casper Network.

## Tool Surface Summary

### 22 public tools

**Market data**
- `get_tokens`
- `get_pairs`
- `get_pair_details`
- `get_quote`
- `get_currencies`
- `get_pair_price_history`
- `get_token_price_history`

**Trading**
- `build_swap`
- `build_approve_token`
- `submit_transaction`

**Liquidity**
- `build_add_liquidity`
- `build_remove_liquidity`

**Trade analysis**
- `estimate_price_impact`
- `estimate_slippage`
- `analyze_trade`
- `optimal_liquidity_amounts`

**Account / portfolio**
- `get_token_balance`
- `get_liquidity_positions`
- `get_impermanent_loss`
- `get_swap_history`
- `get_portfolio_value`
- `get_position_status`
- `get_native_cspr_balance`

### Optional signer tool
- `sign_deploy` — available only when a separate local signer MCP server is configured

## MCP Connection Setup

Main server:

```json
{
  "mcpServers": {
    "cspr-trade": {
      "url": "https://mcp.cspr.trade/mcp"
    }
  }
}
```

Optional local signer:

```json
{
  "mcpServers": {
    "cspr-trade": {
      "url": "https://mcp.cspr.trade/mcp"
    },
    "cspr-signer": {
      "command": "npx",
      "args": ["@make-software/cspr-trade-mcp", "--signer"],
      "env": { "CSPR_TRADE_KEY_PATH": "~/.casper/secret_key.pem" }
    }
  }
}
```

Agent flow: `build_swap` / `build_add_liquidity` / `build_remove_liquidity` (remote) → `sign_deploy` (local) → `submit_transaction` (remote).

Default deploy handoff is inline JSON. Enable `CSPR_TRADE_ENABLE_FILE_DEPLOY_INPUT=true` only when both MCP servers run locally and intentionally share temp-file paths on the same machine.

### `sign_deploy` reference

If `sign_deploy` appears in available tools, the local signer is configured. Use it automatically rather than asking the user to sign manually.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `deploy_json` | string | Yes | Unsigned deploy JSON string by default. File paths only work when `CSPR_TRADE_ENABLE_FILE_DEPLOY_INPUT=true` on a local install |
| `key_source` | enum | Yes | `pem_file`, `pem_env`, or `mnemonic` |
| `algorithm` | enum | No | `ed25519` (default) or `secp256k1` |
| `mnemonic_index` | number | No | Derivation index for mnemonic mode |

Key-source environment variables:
- `pem_file` → `CSPR_TRADE_KEY_PATH`
- `pem_env` → `CSPR_TRADE_KEY_PEM`
- `mnemonic` → `CSPR_TRADE_MNEMONIC`
- `CSPR_TRADE_ENABLE_FILE_DEPLOY_INPUT` → optional, enables local temp-file deploy workflow

## Intent Classification

When a user asks about CSPR.trade or Casper DEX operations, classify their intent:

1. **Price check / market data** — token lists, pool stats, quotes, or currencies
2. **Price history / charting** — pair candles or token candles
3. **Swap / trade** — exchange one token for another
4. **Add liquidity** — become a liquidity provider
5. **Remove liquidity** — withdraw LP position
6. **Portfolio / position check** — balances, LP positions, IL, portfolio totals, position status
7. **History** — past swap transactions

## Tool Selection Rules

- Use `get_tokens` when the user needs token discovery.
- Use `get_pairs` for market overview; `get_pair_details` for a specific pool.
- Use `get_pair_price_history` for direct pair candles; use `get_token_price_history` when the user names a token, not a pair.
- Always call `get_quote` before `build_swap`.
- Use `estimate_price_impact`, `estimate_slippage`, or `analyze_trade` before large swaps.
- Use `optimal_liquidity_amounts` before `build_add_liquidity` when the user gives only one side or wants the correct ratio.
- Use `get_token_balance` for CEP-18 token balances. It does **not** include native CSPR.
- Use `get_portfolio_value` for an account-wide rollup across LP positions.
- Use `get_position_status` for current token amounts and IL per LP position. It is not cost-basis PnL.
- Use `get_swap_history` with `public_key`, not `account_hash`.

## Price Check and Quotes

1. If the user wants all available tokens:
   - Call `get_tokens` with `currency: "USD"` when fiat context helps.
2. If they want a swap quote:
   - Call `get_quote` with `token_in`, `token_out`, `amount`, and `type`.
   - Present amount in, expected amount out, price impact, and route.
3. If they want candles:
   - Pair known → `get_pair_price_history`
   - Token known → `get_token_price_history`

## Executing a Swap

Follow these steps in order.

1. **Resolve the trade** — identify `token_in`, `token_out`, `amount`, and whether it is exact-in or exact-out.
2. **Get a quote first**:
   ```
   get_quote({ token_in: "CSPR", token_out: "USDT", amount: "1000", type: "exact_in" })
   ```
3. **Run analysis for meaningful trades**:
   ```
   analyze_trade({ token_in: "CSPR", token_out: "USDT", amount: "1000" })
   ```
4. **Present summary and confirm** — include quote, price impact, route, and warnings.
5. **Get sender public key** if not already provided.
6. **Build the swap**:
   ```
   build_swap({
     token_in: "CSPR",
     token_out: "USDT",
     amount: "1000",
     type: "exact_in",
     sender_public_key: "01..."
   })
   ```
7. **Handle approvals if present** — some swaps require approval transactions before the swap.
8. **Sign**:
   - If `sign_deploy` exists, call it with the unsigned deploy JSON.
   - If local temp-file mode is intentionally enabled, a saved path also works.
   - Otherwise ask the user to sign externally with their own Casper wallet.
9. **Submit**:
   ```
   submit_transaction({ signed_deploy_json: "<signed JSON>" })
   ```
   - If local temp-file mode is intentionally enabled, a signed file path also works.
10. **Report transaction hash** and tell the user how to track it.

## Adding Liquidity

1. Use `get_pairs` or `get_pair_details` to inspect the pool.
2. If the user provides only one side or wants the correct ratio, call:
   ```
   optimal_liquidity_amounts({ token_a: "CSPR", token_b: "USDT", amount_a: "5000" })
   ```
3. Explain impermanent loss.
4. Build the transaction with `build_add_liquidity`.
5. If approvals are required, sign and submit each approval first.
6. Sign and submit the add-liquidity deploy.

## Removing Liquidity

1. Call `get_liquidity_positions` first.
2. Ask which pair and what percentage to remove.
3. Build with `build_remove_liquidity`.
4. Sign and submit.

## Account, Portfolio, and History

### Balances
```
get_token_balance({ account_public_key: "01abc..." })
get_token_balance({ account_public_key: "01abc...", token: "sCSPR" })
```

### LP positions
```
get_liquidity_positions({ account_public_key: "01abc...", currency: "USD" })
```

### Impermanent loss
```
get_impermanent_loss({ account_public_key: "01abc...", pair: "hash-abc123..." })
```

### Portfolio rollup
```
get_portfolio_value({ account_public_key: "01abc...", currency: "USD" })
```

### Current position status
```
get_position_status({ account_public_key: "01abc..." })
get_position_status({ account_public_key: "01abc...", pair_contract_package_hash: "hash-abc123..." })
```

### Swap history
```
get_swap_history({ public_key: "01abc...", page: 1, page_size: 20 })
get_swap_history({ pair: "hash-abc123...", page: 1, page_size: 20 })
```

## Safety Checks

Apply these checks at every transaction step:

1. **Price impact**
   - Below 1%: normal
   - 1–5%: mention it
   - 5–15%: warn explicitly
   - Above 15%: strongly discourage
2. **Slippage tolerance**
   - Default is 3% (300 bps)
   - Warn above 10%
   - Warn below 0.5% that the transaction may revert
3. **Amounts and gas**
   - Confirm amounts before building transactions
   - Remind users gas is separate from the swap amount
4. **Signing**
   - Never ask for private keys directly
   - Prefer `sign_deploy` when available
5. **Balance interpretation**
   - `get_token_balance` covers CEP-18 tokens only, not native CSPR
6. **Position wording**
   - `get_position_status` is not realized or cost-basis PnL

## Error Handling

- **Token not found** — call `get_tokens`
- **Pair not found** — call `get_pairs` or `get_pair_details`
- **No liquidity position** — offer `get_liquidity_positions`
- **Insufficient balance** — remind about token amount plus gas
- **Deploy expired** — build a fresh transaction
- **Signer unavailable** — explain the external signing flow cleanly

## Key Facts

- **Public endpoint:** `https://mcp.cspr.trade/mcp`
- **Main server:** 22 public tools
- **Full setup with signer:** 23 total tools
- **Default slippage:** 3% (300 bps)
- **Default deadline:** 20 minutes
- **CSPR decimals:** 9
- **Trade history filter:** `public_key`, not `account_hash`
