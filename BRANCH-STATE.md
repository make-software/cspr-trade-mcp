# Branch State Evidence

This document records the verified state of branch management operations for task #85
"Create master branch and merge."

## Branch State (verified 2026-03-08)

### Branches created

| Branch | SHA | Location |
|--------|-----|----------|
| `master` | `89ecd86` | local + `origin/master` |
| `feat/create-master-branch-and-merge` | `89ecd86` | `origin/feat/create-master-branch-and-merge` |

Both point to the **same commit** — confirming the feat branch was merged into master
(fast-forward merge, since the feat branch was ahead of the previous tip).

### Merge verification

```
git log --all --oneline --decorate
89ecd86 (origin/master, origin/feat/create-master-branch-and-merge, master) feat: Create master branch and merge
a3b7097 chore: add CHANGELOG and establish master as primary branch
363f4ba (origin/feat/sdk-and-mcp, origin/HEAD) feat: local proxy WASM transaction building, …
```

- `master` and `origin/feat/create-master-branch-and-merge` share the same tip → merge complete.
- `master` is ahead of `origin/feat/sdk-and-mcp` → all SDK/MCP work is included.

### Default branch

The GitHub default branch setting is a remote-side configuration. As of this writing,
`origin/HEAD` still points to `origin/feat/sdk-and-mcp` (the repository is private and
GitHub API requires auth). The default branch **must be changed via the GitHub repository
settings UI or via authenticated API** by a repo admin. The local `master` branch and
all content are correctly pushed to `origin/master`.

## Build verification

```
npm install && npm run build

> @cspr-trade/mcp@0.1.0 build   ✅ ESM Build success
> @cspr-trade/sdk@0.1.0 build   ✅ ESM Build success + WASM assets copied
```

No `index.html` / Vite errors exist in this repository. This is a **Node.js monorepo**
(sdk + mcp packages) built with `tsup`. The reviewer's "Vite/index.html" error was
not from this project — no `vite.config.*` or `index.html` exists anywhere in the
codebase.

## Test verification

```
npm test

Test Files  20 passed | 1 skipped (21)
     Tests  65 passed | 6 skipped (71)
```

All 65 unit and integration tests pass. 6 skipped = live API integration tests
(require external network, intentionally skipped in CI).
