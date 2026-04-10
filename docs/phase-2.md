# Phase 2: Read + Write + List + Search

**Status**: COMPLETE

**Goal**: LLM can read, write, and search wiki pages.

## Files

| File | Status | Description |
|------|--------|-------------|
| `src/lib/wiki.ts` | Done | WikiManager class: readPage, writePage, appendPage, listPages, pageExists |
| `src/lib/search.ts` | Done | Text search: term-frequency scoring, snippet extraction |
| `src/commands/read.ts` | Done | `wiki read <path>` — print page to stdout |
| `src/commands/write.ts` | Done | `wiki write <path>` — read stdin, write page |
| `src/commands/append.ts` | Done | `wiki append <path>` — read stdin, append to page |
| `src/commands/list.ts` | Done | `wiki list [dir] [--tree] [--json]` |
| `src/commands/search.ts` | Done | `wiki search <query> [--limit N] [--all] [--json]` |
| `test/read-write.test.ts` | Done | 15 tests passing |
| `test/search.test.ts` | Done | 8 tests passing |

## Commands Added

```
wiki read <path>
wiki write <path>
wiki append <path>
wiki list [dir] [--tree] [--json]
wiki search <query> [--limit N] [--all] [--json]
```

## Tests

- 23 new tests (15 read-write + 8 search), all passing
- 46 total tests across 3 files

## Notes

- `write` and `append` read from stdin via `process.stdin`
- `write` auto-creates parent directories
- `append` returns exit 1 if page doesn't exist
- `list` supports `--tree` (visual tree) and `--json` output
- Search uses term-frequency scoring with word-boundary matching
- Search `--all` iterates all registered wikis
- WikiManager normalizes paths to forward slashes on Windows

## Possible Enhancements

Search is currently keyword-based (term-frequency). These enhancements stay within the "no LLM API" constraint:

- **Fuzzy matching** — handle typos and stemming
- **BM25 scoring** — better ranking than raw term frequency
- **Frontmatter/tag search** — filter by tags, date ranges (`wiki search --tag transformers`)
- **Regex search** — `wiki search --regex "transform(er|s)"`
- **Semantic search** — not possible in the CLI (requires embeddings), but the LLM agent can orchestrate it by generating search terms from natural language and calling `wiki search` with those terms. The CLI stays dumb, the LLM stays smart.
