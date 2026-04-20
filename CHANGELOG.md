# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/make-software/cspr-trade-mcp/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/make-software/cspr-trade-mcp/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/make-software/cspr-trade-mcp/releases/tag/v0.1.0
