# Phase 2: Read + Write + List + Search

**Status**: NOT STARTED

**Goal**: LLM can read, write, and search wiki pages.

## Files

| File | Status | Description |
|------|--------|-------------|
| `src/lib/wiki.ts` | Pending | WikiManager class: readPage, writePage, appendPage, listPages, pageExists |
| `src/lib/search.ts` | Pending | Text search: term-frequency scoring, snippet extraction |
| `src/commands/read.ts` | Pending | `wiki read <path>` — print page to stdout |
| `src/commands/write.ts` | Pending | `wiki write <path>` — read stdin, write page |
| `src/commands/append.ts` | Pending | `wiki append <path>` — read stdin, append to page |
| `src/commands/list.ts` | Pending | `wiki list [dir] [--tree] [--json]` |
| `src/commands/search.ts` | Pending | `wiki search <query> [--limit N] [--all] [--json]` |
| `test/read-write.test.ts` | Pending | Read/write/append/list tests |
| `test/search.test.ts` | Pending | Search scoring, snippets, limits |

## Commands to Add

```
wiki read <path>
wiki write <path>
wiki append <path>
wiki list [dir] [--tree] [--json]
wiki search <query> [--limit N] [--all] [--json]
```

## Key Design Decisions

- `write` and `append` read from stdin (`process.stdin`)
- `write` creates parent directories automatically
- `list` uses glob to find all .md files
- Search uses term-frequency scoring (upgradeable to BM25 later)
- `--all` flag on search iterates all registered wikis
- All structured output supports `--json`

## Entry Points to Update

- `bin/wiki.ts` — register new commands
