# Contributing to CSPR.trade MCP

Thank you for your interest in contributing! This project provides MCP (Model Context Protocol) tools for AI agents to interact with CSPR.trade, the leading DEX on the Casper Network.

## Getting Started

### Prerequisites
- Node.js 20+
- npm or pnpm

### Local Setup

```bash
git clone https://github.com/make-software/cspr-trade-mcp.git
cd cspr-trade-mcp
npm install
npm run build
```

### Running Locally (stdio mode)

```bash
# SDK package
cd packages/sdk
npm run build

# MCP server via stdio
cd packages/mcp
node dist/index.js
```

## Project Structure

```
packages/
  sdk/     — @cspr-trade/sdk — TypeScript SDK for CSPR.trade API
  mcp/     — @cspr-trade/mcp — MCP server (stdio + HTTP)
  site/    — mcp.cspr.trade documentation site (Astro)
```

## Contributing Guidelines

### Bug Reports
Open an issue with:
- A clear description of the bug
- Steps to reproduce
- Expected vs actual behavior

### Feature Requests
Open an issue describing the feature and use case. MCP tool additions are especially welcome.

### Pull Requests
1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes with tests
4. Run `npm run build` and `npm test` to verify
5. Submit a PR with a clear description

## Code Style
- TypeScript strict mode
- No `any` types unless unavoidable
- JSDoc comments for all public APIs

## Questions?
Open an issue or reach out on the [Casper Discord](https://discord.gg/caspernetwork) in the #developer-tools channel.
