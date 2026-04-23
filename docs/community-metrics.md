# CSPR.trade MCP — Community Metrics

_Last updated: 2026-04-23_

## npm Downloads (last 30 days)

| Package | 2026-04-21 | 2026-04-22 | 2026-04-23 | Notes |
|---------|-----------|-----------|-----------|-------||
| `@make-software/cspr-trade-mcp` | 166 | 167 | 504 | Stable (last-month snapshot lags by ~1 day) |
| `@make-software/cspr-trade-mcp-sdk` | 157 | 158 | 543 | Stable (last-month snapshot lags by ~1 day) |

## GitHub (make-software/cspr-trade-mcp)

| Metric | 2026-04-21 | 2026-04-22 | 2026-04-23 |
|--------|-----------|-----------|-----------|
| Stars | 1 | 1 | 1 |
| Forks | 0 | 0 | 0 |
| Open Issues | 0 | 0 | 1 |
| Watchers | 1 | 1 | 1 |

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

- Issue #12 filed 2026-04-23: "Feature request: Official OHLCV/candle price history API" — our own request (task #900). Awaiting upstream CSPR.trade team response.

## Notes

- Downloads growing very slowly (flat at ~504/543 today, npm snapshot lags 1d) — announcement campaign execution blocked on xurl auth (OAuth2 token 401 — needs re-auth by Michael)
- GitHub stars stagnant at 1 — repo is not prominently linked from CSPR.trade UI; live check on 2026-04-23 found no `mcp.cspr.trade` reference in the cspr.trade homepage HTML
- Decision #187 approved: do not derive OHLCV client-side; GitHub issue #12 filed to request official API from CSPR.trade team (task #900 partially complete)
- Decision #188 approved the task #881 announcement campaign on 2026-04-22; X/dev.to posting blocked on xurl OAuth re-auth
