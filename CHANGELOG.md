# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2026-04-27

### Added
- **`get_native_cspr_balance` MCP tool + `getNativeCsprBalance` SDK method** — query native CSPR balance (motes and human-readable) for any account via Casper node RPC. Distinct from CEP-18 token balances returned by `get_token_balance`.
- **MCP tool input validation** — shared `validation.ts` module with validators for amounts, public keys, slippage, and same-token swap checks. All tool handlers validate inputs before RPC calls and return structured `isError` responses with actionable hints.
- **Actionable error messages** — `withActionableErrors` wrapper classifies 7 error types (token-not-found, no-liquidity-pool, rate limit, server error, network failure, invalid public key, Casper RPC) and surfaces fix suggestions to AI agents.
- **TypeScript types export for SDK consumers** — `PairQuery`, `PaginatedResult`, `QuoteApiParams` now exported from package root for external TypeScript consumers.
- Tool count: 24 (was 23)

## [0.4.2] - 2026-04-23

### Added
- **`get_pair_price_history` MCP tool + `getPairPriceHistory` SDK method** — OHLCV (open/high/low/close/volume) candlestick price history for any trading pair. Aggregates swap events from CSPR.trade `/swaps` API into time-bucketed candles. Supports `1h`, `4h`, and `1d` intervals; returns up to 200 candles in chronological order.
- **`get_token_price_history` MCP tool + `getTokenPriceHistory` SDK method** — resolves a token (by symbol, name, or contract hash) to its primary trading pair and returns OHLCV history denominated in the paired token.
- New types exported from SDK: `OHLCVCandle`, `PriceHistoryInterval`, `PriceHistoryQuery`
- `aggregateOHLCV(swaps, interval, limit)` utility exported from SDK for custom aggregation
- Tool count: 23 (was 21)
- 9 new unit tests across SDK (`price-history.test.ts`) and MCP (`market-data.test.ts`)

### Security
- Hardened deploy handoff defaults for hosted and remote MCP use: deploy file-path input is now disabled unless explicitly enabled for a local same-machine workflow.
- Build/sign/submit flows now return and accept inline deploy JSON by default instead of relying on arbitrary file-path handoff between tools.
- `/health` now exposes whether deploy file-path input is enabled so deployments can verify the server is running in the intended mode.

### Fixed
- Resolved the remaining `casper-js-sdk` import paths that still failed under Node 20 / ESM, restoring green build-and-test CI on both Node 20 and Node 22.

## [0.4.1] - 2026-04-22

### Fixed
- **Pure-ESM consumers crashed at module load** with `SyntaxError: The requested module 'casper-js-sdk' does not provide an export named 'default'`. casper-js-sdk shipped a real ESM build in 5.0.10+ via the `exports` field, and the new ESM module has no default export — so the SDK's `import casperSdk from 'casper-js-sdk'` pattern (introduced in 0.1.x for CJS-interop) no longer worked. Switched all 7 import sites to named imports (`import { PublicKey, SessionBuilder, ... } from 'casper-js-sdk'`). Verified end-to-end against a pure `.mjs` consumer: import, `getTokens`, `getSwapHistory`, `getTokenBalance`, and `buildSwap` (full SessionBuilder/PublicKey path) all work.

### Changed
- Bumped `casper-js-sdk` floor from `^5.0.6` to `^5.0.11` (first version with the proper ESM build that named imports require).

## [0.4.0] - 2026-04-21

### Added
- **`get_token_balance` MCP tool + `getTokenBalance` SDK method** — query CEP-18 fungible token balances for any Casper account. Returns all held tokens, or filters to a specific token by symbol, name, or contract package hash. Backed by the CSPR.trade `/accounts/{id}/ft-token-ownership` endpoint (proxies CSPR.cloud). Returns balance with metadata (symbol, decimals, formatted amount, icon URL). Native CSPR balance is not included — CEP-18 only.
- New types exported from SDK: `TokenBalance`, `FTTokenOwnershipApiResponse`
- Tool count: 21 (was 20)

## [0.3.2] - 2026-04-21

### Changed
- Renamed `get_pnl` MCP tool to `get_position_status` — accurately reflects that the tool returns current IL and token amounts, not cost-basis PnL
- Renamed `getUnrealizedPnL` SDK method to `getPositionStatus` (old name kept as `@deprecated` alias)
- Added `PositionStatus` type (replaces `UnrealizedPnL`, kept as deprecated alias)

### Fixed
- `getPositionStatus` now fetches impermanent loss for all positions in parallel with `Promise.all` instead of sequentially

### Fixed
- `getPortfolioValue`: non-WCSPR LP positions (e.g. USDT/USDC) are now returned in a separate `unpricedPositions` list instead of being silently excluded from portfolio totals
- Removed misleading `* 2n` comment that incorrectly stated all pools are 50/50
- Added `PortfolioPosition` named interface exported from SDK types

### Added
- 2 new unit tests covering WCSPR vs non-WCSPR pool separation and empty-portfolio edge case (93 tests total)

## [0.3.0] - 2026-04-20

### Added
- **Portfolio Value SDK** — `getPortfolioValue(publicKey, currency?)` aggregates all LP positions and returns CSPR + USD estimates
- **Unrealized PnL SDK** — `getUnrealizedPnL(publicKey, pairHash?)` returns per-position impermanent loss and current token amounts
- **`get_portfolio_value` MCP tool** — wraps `getPortfolioValue`, accepts `account_public_key` + optional `currency`
- **`get_pnl` MCP tool** — wraps `getUnrealizedPnL`, accepts `account_public_key` + optional `pair_contract_package_hash` filter
- New types exported: `PortfolioValue`, `UnrealizedPnL`
- SDK version bumped to 0.3.0

## [0.2.0] - 2026-03-29

### Added
- **Trade Analysis SDK (v0.2.0)** — 4 new pre-trade intelligence functions:
  - `estimatePriceImpact()` — AMM constant-product formula, severity classification (low/medium/high/very_high)
  - `estimateSlippage()` — expected output vs spot, minimum output, recommended tolerance
  - `computeOptimalLiquidityAmounts()` — calculate paired token amount for LP deposits
  - `analyzeTrade()` — comprehensive analysis with recommendation engine (proceed/caution/high_risk/not_recommended)
- **4 new MCP tools** — `estimate_price_impact`, `estimate_slippage`, `analyze_trade`, `optimal_liquidity_amounts`
- **Health monitoring endpoint** — enhanced `/health` with uptime, memory, active sessions; `?deep=1` for Casper RPC + CSPR.trade API connectivity checks
- **Scotty monitoring script** — `scripts/health-check.sh` for external monitoring (human-readable + JSON output, exit codes 0/1/2)
- 13 new unit tests (91 total, 0 failures)

### Changed
- MCP server version bumped to 0.3.0
- SDK version bumped to 0.2.0

## [0.1.0] - 2026-03-08

### Added
- `master` branch established as the primary branch of this repository
- Full SDK and MCP implementation merged into `master` from `feat/sdk-and-mcp`

### Features included in initial master
- TypeScript SDK (`@make-software/cspr-trade-mcp-sdk`) — market data, quotes, transaction building
- MCP server (`@make-software/cspr-trade-mcp`) — AI agent tools for CSPR.trade DEX
- Local proxy WASM transaction building with unified RPC submission
- Integration tests for SDK and MCP
- Claude Code SKILL.md for guided DEX interactions
- `llms.txt` for LLM-readable documentation

[Unreleased]: https://github.com/make-software/cspr-trade-mcp/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/make-software/cspr-trade-mcp/compare/v0.4.2...v0.5.0
[0.3.2]: https://github.com/make-software/cspr-trade-mcp/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/make-software/cspr-trade-mcp/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/make-software/cspr-trade-mcp/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/make-software/cspr-trade-mcp/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/make-software/cspr-trade-mcp/releases/tag/v0.1.0
