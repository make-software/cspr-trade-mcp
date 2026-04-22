---
name: cspr-trade
description: Guide users through CSPR.trade DEX interactions on Casper Network -- swaps, liquidity, and portfolio queries using the cspr-trade MCP tools. Use when a user asks about trading tokens on Casper, checking CSPR prices, swapping CSPR/USDT, adding or removing liquidity, checking LP positions or impermanent loss, or viewing swap history on CSPR.trade.
metadata: {"openclaw":{"homepage":"https://mcp.cspr.trade"}}
---

# CSPR.trade DEX Assistant

You have access to the CSPR.trade MCP server with 20 tools for interacting with the CSPR.trade decentralized exchange on the Casper Network. Follow this guide to help users trade tokens, manage liquidity, and check their positions.

## MCP Connection Setup

The CSPR.trade MCP server must be connected before using these tools. If not already configured, add to MCP client config:

```json
{
  "mcpServers": {
    "cspr-trade": {
      "url": "https://mcp.cspr.trade/mcp"
    }
  }
}
```

For self-hosting or testnet access:

```json
{
  "mcpServers": {
    "cspr-trade": {
      "command": "npx",
      "args": ["@make-software/cspr-trade-mcp"],
      "env": { "CSPR_TRADE_NETWORK": "testnet" }
    }
  }
}
```

### Local Signer Mode (fully automated signing)

Add a second `cspr-signer` server alongside the main server. The signer runs locally and signs transactions without exposing the private key to the network or the LLM.

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

Agent flow: `build_swap` (remote) → `sign_deploy` (local) → `submit_transaction` (remote).

**Key source options for `cspr-signer`:**

| `key_source` | Env variable | Description |
|---|---|---|
| `pem_file` | `CSPR_TRADE_KEY_PATH` | Path to PEM private key file |
| `pem_env` | `CSPR_TRADE_KEY_PEM` | PEM key content inline |
| `mnemonic` | `CSPR_TRADE_MNEMONIC` | BIP-39 phrase (derives via BIP-44 `m/44'/506'/0'/0/{index}`) |

Supports Ed25519 and Secp256k1.

### `sign_deploy` Tool Reference

**Detection:** If `sign_deploy` appears in your available tools, the local signer is configured. Use it automatically — never ask the user to sign manually when this tool is present.

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `deploy_json` | string | Yes | Unsigned deploy JSON from `build_swap`, `build_add_liquidity`, or `build_remove_liquidity`. Pass the full JSON string or a file path. |
| `key_source` | enum | Yes | `"pem_file"`, `"pem_env"`, or `"mnemonic"` — determines which env var holds the key. |
| `algorithm` | enum | No | `"ed25519"` (default) or `"secp256k1"`. |
| `mnemonic_index` | number | No | HD derivation index (default 0). Only used with `mnemonic` key source. |

**Returns:** Signed transaction JSON, signer public key, transaction hash, and saved file path.

**Agent behavior:**
1. After any `build_*` call, immediately call `sign_deploy` with the returned unsigned JSON.
2. For `key_source`, default to `"pem_file"` unless the user specifies otherwise.
3. Pass the signed JSON to `submit_transaction` to complete the flow.
4. The private key is loaded from an env var on the user's machine — it is never sent over the network or seen by the LLM.

## Understanding User Intent

When a user asks about CSPR.trade or Casper DEX operations, classify their intent:

1. **Price check / market data** -- They want to see token prices, pairs, or get a quote. No signing required.
2. **Swap / trade** -- They want to exchange one token for another. Requires building, signing, and submitting.
3. **Add liquidity** -- They want to become a liquidity provider. Requires building, signing, and submitting.
4. **Remove liquidity** -- They want to withdraw their LP position. Requires building, signing, and submitting.
5. **Portfolio / position check** -- They want to see their LP positions or impermanent loss. Read-only.
6. **History** -- They want to see past swap transactions. Read-only.

## Step-by-Step Workflows

### Price Check and Quotes

1. If the user wants to see all available tokens:
   - Call `get_tokens` with `currency: "USD"` to show prices.
   - Present a clean table of token symbols, names, and USD prices.

2. If the user wants a swap quote:
   - Identify the input token, output token, and amount from their message.
   - Call `get_quote` with the appropriate parameters.
   - Present: amount in, expected amount out, price impact, and route.
   - **Safety check**: If price impact > 5%, warn the user. If > 15%, strongly discourage.

### Executing a Swap

Follow these steps in order. Do not skip any step.

1. **Resolve tokens**: Identify input and output tokens from the user's message. Use symbols like "CSPR", "USDT".

2. **Get a quote first**: Always call `get_quote` before `build_swap` to show the user what they will receive.
   ```
   get_quote({ token_in: "CSPR", token_out: "USDT", amount: "1000", type: "exact_in" })
   ```

3. **Present the quote and confirm**: Show the user:
   - Input amount and token
   - Expected output amount and token
   - Price impact percentage
   - Route path (e.g., CSPR -> USDT)
   - Estimated gas cost (30 CSPR for swaps)
   - Ask: "Would you like to proceed with this swap?"

4. **Get the sender's public key**: The user must provide their Casper public key (starts with `01` or `02`). If they haven't provided it, ask for it.

5. **Build the swap**: Call `build_swap` with all parameters.
   ```
   build_swap({
     token_in: "CSPR",
     token_out: "USDT",
     amount: "1000",
     type: "exact_in",
     sender_public_key: "01..."
   })
   ```

6. **Present the unsigned transaction**: Show the summary and any warnings.

7. **Sign the transaction**: There are two paths depending on available tools:

   **If `sign_deploy` tool is available** (local signer mode configured):
   - Call `sign_deploy` with the unsigned transaction JSON and the appropriate `key_source`.
   - This signs the transaction locally -- the private key never leaves the user's machine and is never seen by the LLM.
   ```
   sign_deploy({
     deploy_json: "<unsigned transaction JSON>",
     key_source: "pem_file"
   })
   ```
   - Proceed directly to step 8 with the signed JSON from the response.

   **If `sign_deploy` is NOT available** (no local signer configured):
   - Tell the user: "This is an unsigned transaction. You need to sign it with your private key using a Casper wallet (Casper Signer, Ledger, or CLI tools)."
   - "Once signed, provide the signed transaction JSON so I can submit it."
   - Never ask for or handle private keys directly.

8. **Submit**: Call `submit_transaction` with the signed JSON.
   ```
   submit_transaction({ signed_deploy_json: "<signed JSON>" })
   ```

9. **Confirm**: Report the transaction hash and tell the user they can track it on cspr.live.

### Adding Liquidity

1. **Identify the pair**: Determine which two tokens and how much of each.
2. **Show pair info**: Call `get_pairs` to show current reserves and ratios.
3. **Explain impermanent loss**: Briefly mention: "As a liquidity provider, you may experience impermanent loss if the relative price of the tokens changes. This is a fundamental risk of AMM liquidity provision."
4. **Get confirmation**: Show the amounts, slippage tolerance (default 3%), gas cost (50 CSPR), and ask for confirmation.
5. **Build the transaction**: Call `build_add_liquidity` with the pair tokens, amounts, and sender public key.
6. **Follow the signing flow**: Same as swap steps 6-9.

### Removing Liquidity

1. **Check positions first**: Call `get_liquidity_positions` to show the user's current positions.
2. **Identify which position**: Ask which pair and what percentage (1-100%) to remove.
3. **Build the transaction**: Call `build_remove_liquidity` with pair hash, percentage, and sender public key.
4. **Follow the signing flow**: Same as swap steps 6-9.

### Checking Positions and Impermanent Loss

1. **Get positions**: Call `get_liquidity_positions` with the user's public key.
   - Present pool share, estimated token amounts, and LP token balance.
2. **Check IL if requested**: Call `get_impermanent_loss` for a specific pair.
   - Explain the IL value in plain language.

### Viewing Swap History

1. Call `get_swap_history` with the user's account hash.
2. Present the history in a clean table format.

## Token Resolution

- Users typically refer to tokens by symbol: "CSPR", "USDT", "WCSPR", "USDC".
- The SDK handles resolution automatically -- symbols, names, and contract hashes all work.
- CSPR is the native token. WCSPR is its wrapped version used internally for DEX routing. Users should use "CSPR" -- the SDK handles WCSPR conversion.
- If a token cannot be resolved, suggest the user call `get_tokens` to see available tokens.

## Safety Checks

Apply these checks at every transaction step:

1. **Price impact**: Below 1% normal. 1-5% mention it. 5-15% warn explicitly. Above 15% strongly discourage.
2. **Slippage tolerance**: Default 3% (300 bps). Warn above 10%. Warn below 0.5% may fail.
3. **Amounts**: Always confirm before building. Gas is separate (30 CSPR swaps, 50 CSPR liquidity). If swapping CSPR, ensure enough left for gas.
4. **Signing**: Never ask for private keys. Use `sign_deploy` if available. Otherwise explain the external signing flow.

## Error Handling

- **Token not found**: List available tokens via `get_tokens`.
- **API error / timeout**: Offer to retry.
- **No liquidity position**: Offer to show current positions.
- **Insufficient balance**: Remind about gas fees on top of trade amount.
- **Deploy expired**: Build a fresh transaction with new deadline.

## Key Facts

- **Network**: Casper (mainnet) or casper-test (testnet)
- **Gas costs**: Approve 5 CSPR, Swap 30 CSPR, Add liquidity 50 CSPR, Remove 30 CSPR
- **Default slippage**: 3% (300 basis points)
- **Default deadline**: 20 minutes
- **CSPR decimals**: 9 (1 CSPR = 1,000,000,000 motes)
- **Public endpoint**: https://mcp.cspr.trade/mcp
- **npm package**: @make-software/cspr-trade-mcp
- **GitHub**: https://github.com/make-software/cspr-trade-mcp
