# Phase 4: Lint + Links + Status

**Status**: COMPLETE

**Goal**: LLM can check wiki health and navigate the link graph.

## Files

| File | Status | Description |
|------|--------|-------------|
| `src/lib/link-parser.ts` | Done | extractWikilinks, buildLinkGraph, wikilink resolution |
| `src/lib/frontmatter.ts` | Done | parseFrontmatter, hasFrontmatter, addFrontmatter |
| `src/commands/lint.ts` | Done | `wiki lint [--json]` — broken links, orphans, missing frontmatter, empty pages, index consistency |
| `src/commands/links.ts` | Done | `wiki links <path>` — outbound + inbound links |
| `src/commands/backlinks.ts` | Done | `wiki backlinks <path>` — inbound only |
| `src/commands/orphans.ts` | Done | `wiki orphans` — pages with no inbound links |
| `src/commands/status.ts` | Done | `wiki status [--json]` — page counts, link stats, recent activity, git info |
| `test/links.test.ts` | Done | 11 tests passing |
| `test/lint.test.ts` | Done | 8 tests passing |

## Commands Added

```
wiki lint [--json]
wiki links <path>
wiki backlinks <path>
wiki orphans
wiki status [--json]
```

## Tests

- 19 new tests (11 links + 8 lint/frontmatter), all passing
- 87 total tests across 8 files

## Notes

- Wikilink resolution: exact path -> wiki/ prefix -> subdirectory scan -> filename match anywhere
- Orphan detection excludes index.md and log.md
- Lint checks: broken links, orphans, missing frontmatter, empty pages, index consistency (both directions)
- Status shows: page counts by directory, link stats, recent log entries, git commit count and remote status
- All structured output supports `--json`
