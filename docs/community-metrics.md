# CSPR.trade MCP — Community Metrics

_Last updated: 2026-04-22_

## npm Downloads (last 30 days)

| Package | 2026-04-21 | 2026-04-22 |
|---------|-----------|-----------|
| `@make-software/cspr-trade-mcp` | 166 | 167 |
| `@make-software/cspr-trade-mcp-sdk` | 157 | 158 |

## GitHub (make-software/cspr-trade-mcp)

| Metric | 2026-04-21 | 2026-04-22 |
|--------|-----------|-----------|
| Stars | 1 | 1 |
| Forks | 0 | 0 |
| Open Issues | 0 | 0 |
| Watchers | 1 | 1 |

## Glama.ai Listing

- Listed at: https://glama.ai/mcp/servers/cspr-trade-mcp
- Maintainer: mssteuer

## Weekly Update Process

Run the following to refresh metrics:
```bash
curl -s 'https://api.npmjs.org/downloads/point/last-month/@make-software/cspr-trade-mcp'
curl -s 'https://api.npmjs.org/downloads/point/last-month/@make-software/cspr-trade-mcp-sdk'
curl -s 'https://api.github.com/repos/make-software/cspr-trade-mcp' | python3 -c 'import json,sys; d=json.load(sys.stdin); print("stars:", d.get("stargazers_count"), "forks:", d.get("forks_count"), "issues:", d.get("open_issues_count"))'
```

## Community Issues / PRs Needing Response

- None as of 2026-04-22.

## Notes

- Downloads growing very slowly (+1/day organic) — no announcement campaign yet
- GitHub stars stagnant at 1 — repo is not prominently linked from CSPR.trade UI
- Decision #187 pending: how to implement SDK price history (no CSPR.trade OHLCV API exists)
- Next action after Decision #187: community announcement campaign via X, dev.to, Casper Discord
