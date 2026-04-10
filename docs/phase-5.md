# Phase 5: GitHub Auth + Repo Management

**Status**: COMPLETE

**Goal**: User can authenticate with GitHub, create/clone repos, push/pull wikis.

## Files

| File | Status | Description |
|------|--------|-------------|
| `src/lib/auth.ts` | Done | PAT-based auth, token storage at ~/.config/llmwiki/auth.yaml |
| `src/lib/github.ts` | Done | GitHub API: listRepos, createRepo |
| `src/commands/auth.ts` | Done | `wiki auth login/status/logout` |
| `src/commands/repo.ts` | Done | `wiki repo list/create/clone/connect` |
| `src/commands/push.ts` | Done | `wiki push` |
| `src/commands/pull.ts` | Done | `wiki pull` |
| `src/commands/sync.ts` | Done | `wiki sync` — pull + push |
| `test/auth.test.ts` | Done | 6 tests passing |

## Commands Added

```
wiki auth login
wiki auth status
wiki auth logout
wiki repo list [--all] [--filter]
wiki repo create <name> [--domain] [--public]
wiki repo clone [repo-name] [--dir]
wiki repo connect [wiki-id]
wiki push
wiki pull
wiki sync
```

## Tests

- 6 new tests (auth save/load/clear), all passing
- 93 total tests across 9 files
- GitHub API tests skipped (require live network + token)

## Notes

- Uses Personal Access Token (PAT) auth instead of OAuth device flow
  - Immediately functional, no OAuth App registration required
  - User creates PAT at github.com/settings/tokens with "repo" scope
  - OAuth device flow can be added later if needed
- Token stored at `~/.config/llmwiki/auth.yaml` (respects `LLMWIKI_CONFIG_DIR`)
- Token validated against GitHub API before saving
- `repo create` creates private repo named `wiki-<name>` by default
- `repo clone` auto-detects .llmwiki.yaml and registers in global registry
- `repo connect` creates a new GitHub repo and links existing local wiki
- `push/pull/sync` check for remote before operating
- Added `clone` function to git.ts
- `auth` command added to SKIP_RESOLUTION set (no wiki context needed)
