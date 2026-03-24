# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/make-software/cspr-trade-mcp/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/make-software/cspr-trade-mcp/releases/tag/v0.1.0
