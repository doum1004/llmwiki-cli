# Phase 3: Index + Log + Git Commands

**Status**: COMPLETE

**Goal**: LLM can maintain the index, log activity, and commit changes.

## Files

| File | Status | Description |
|------|--------|-------------|
| `src/lib/index-manager.ts` | Done | IndexManager: read, addEntry, removeEntry, hasEntry |
| `src/lib/log-manager.ts` | Done | LogManager: append, show (with --last N, --type filter) |
| `src/commands/index-cmd.ts` | Done | `wiki index show/add/remove` |
| `src/commands/log-cmd.ts` | Done | `wiki log show/append` |
| `src/commands/commit.ts` | Done | `wiki commit [message]` — auto-generates from last log entry |
| `src/commands/history.ts` | Done | `wiki history [path] [--last N]` |
| `src/commands/diff.ts` | Done | `wiki diff [ref]` |
| `test/index-manager.test.ts` | Done | 10 tests passing |
| `test/log-manager.test.ts` | Done | 6 tests passing |
| `test/git.test.ts` | Done | 6 tests passing |

## Commands Added

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

## Tests

- 22 new tests (10 index + 6 log + 6 git), all passing
- 68 total tests across 6 files

## Notes

- Index auto-detects section from path (sources/, entities/, concepts/, synthesis/)
- Unknown paths default to Concepts section
- Log entries formatted as `## [YYYY-MM-DD HH:MM:SS] type | message`
- `commit` with no message auto-generates from last log entry
- Added `logFile` function to git.ts for per-file history
- Git error handler now includes stdout in error output (for "nothing to commit" messages)
