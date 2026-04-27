# CSPR.trade MCP — Community Metrics

_Last updated: 2026-04-26 (cron cycle)

## npm Downloads (last 30 days)

| Package | 2026-04-21 | 2026-04-22 | 2026-04-23 | 2026-04-24 (AM) | 2026-04-25 (AM) | Notes |
|---------|-----------|-----------|-----------|-----------|-----------|-------|
| `@make-software/cspr-trade-mcp` | 166 | 167 | 504 | 500 | 500 | Snapshot lags ~1d; window rolls daily |
| `@make-software/cspr-trade-mcp-sdk` | 157 | 158 | 543 | 554 | 554 | Stable; npm snapshot lags 1d |

## GitHub (make-software/cspr-trade-mcp)

| Metric | 2026-04-21 | 2026-04-22 | 2026-04-23 | 2026-04-24 (AM) | 2026-04-25 (AM) |
|--------|-----------|-----------|-----------|-----------|-----------| 
| Stars | 1 | 1 | 1 | 1 | 1 |
| Forks | 0 | 0 | 1 | 1 | 1 |
| Open Issues | 0 | 0 | 1 | 1 | 1 |
| Watchers | 1 | 1 | 1 | 1 | 1 |

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

- Downloads flat at 504/543 (npm snapshot lags 1d; no announcement campaign posted yet)
- GitHub stars stagnant at 1 — repo not prominently linked from CSPR.trade UI
- Decision #197 approved full announcement campaign (X, dev.to, Casper Discord) on 2026-04-23
- X posting blocked: xurl OAuth2 token 401 — Michael needs to run `xurl auth oauth2 --app jcva JeanClawd99` on baremetal with `tweet.write` scope
- dev.to posting blocked: no dev.to API key in ~/.hermes/.secrets/ — Michael needs to add it
- JeanClawd not in Casper Discord server — Discord posting requires join link or Michael posts directly
- Task #881 remains needs_input until at least one channel can be executed

## 2026-04-26 Update (cron cycle)

| Package | Downloads (last 30d) |
|---------|---------------------|
| `@make-software/cspr-trade-mcp` | 524 |
| `@make-software/cspr-trade-mcp-sdk` | 588 |

GitHub: 1 star, 1 fork, 1 open issue, 1 watcher

_No announcement campaign active. Organic growth only. Post-v0.5 DX release (validation + type exports + actionable errors)._
