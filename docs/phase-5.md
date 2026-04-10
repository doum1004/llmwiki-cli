# Phase 5: GitHub Auth + Repo Management

**Status**: NOT STARTED

**Goal**: User can authenticate with GitHub, create/clone repos, push/pull wikis.

## Files

| File | Status | Description |
|------|--------|-------------|
| `src/lib/auth.ts` | Pending | GitHub OAuth device flow, token storage at ~/.config/llmwiki/auth.yaml |
| `src/lib/github.ts` | Pending | GitHub API: listRepos, createRepo, deleteRepo |
| `src/commands/auth.ts` | Pending | `wiki auth login/status/logout` |
| `src/commands/repo.ts` | Pending | `wiki repo list/create/clone/connect` |
| `src/commands/push.ts` | Pending | `wiki push [--wiki <name>]` |
| `src/commands/pull.ts` | Pending | `wiki pull [--wiki <name>]` |
| `src/commands/sync.ts` | Pending | `wiki sync [--wiki <name>]` — pull + push |

## Commands to Add

```
wiki auth login
wiki auth status
wiki auth logout
wiki repo list [--all] [--filter]
wiki repo create <name> [--domain] [--public]
wiki repo clone [name] [--all] [--filter]
wiki repo connect [wiki-id]
wiki push [--wiki <name>]
wiki pull [--wiki <name>]
wiki sync [--wiki <name>]
```

## Key Design Decisions

- GitHub OAuth device flow (no client secret needed, public client_id)
- Token stored at `~/.config/llmwiki/auth.yaml`
- Git credential helper at `~/.config/llmwiki/git-credential-helper.sh`
- `repo create` creates private repo named `wiki-<name>` by default
- `repo clone` auto-detects .llmwiki.yaml; scaffolds if missing
- All GitHub API calls use `fetch()` with Bearer token

## Prerequisites

- Requires a registered GitHub OAuth App (client_id)
- Network access (this is the only phase that makes network calls)

## Entry Points to Update

- `bin/wiki.ts` — register new commands, add auth commands to SKIP_RESOLUTION
