# Phase 3: Index + Log + Git Commands

**Status**: NOT STARTED

**Goal**: LLM can maintain the index, log activity, and commit changes.

## Files

| File | Status | Description |
|------|--------|-------------|
| `src/lib/index-manager.ts` | Pending | IndexManager: read, addEntry, removeEntry, hasEntry |
| `src/lib/log-manager.ts` | Pending | LogManager: append, show (with --last N, --type filter) |
| `src/commands/index-cmd.ts` | Pending | `wiki index show/add/remove` |
| `src/commands/log-cmd.ts` | Pending | `wiki log show/append` |
| `src/commands/commit.ts` | Pending | `wiki commit [message]` |
| `src/commands/history.ts` | Pending | `wiki history [path] [--last N]` |
| `src/commands/diff.ts` | Pending | `wiki diff [ref]` |
| `test/index-manager.test.ts` | Pending | Index CRUD tests |
| `test/log-manager.test.ts` | Pending | Log append/show tests |
| `test/git.test.ts` | Pending | Commit/history/diff tests |

## Commands to Add

```
wiki index show
wiki index add <path> <summary>
wiki index remove <path>
wiki log show [--last N] [--type T]
wiki log append <type> <message>
wiki commit [message]
wiki history [path] [--last N]
wiki diff [ref]
```

## Key Design Decisions

- Index sections: `## Sources`, `## Entities`, `## Concepts`, `## Synthesis` — category determined from file path
- Index entries formatted as: `- [[path]] — summary`
- Log entries formatted as: `## [YYYY-MM-DD HH:MM] type | message`
- `commit` with no message auto-generates from last log entry
- `history` format: `<short-hash> <date> <message>`

## Entry Points to Update

- `bin/wiki.ts` — register new commands
