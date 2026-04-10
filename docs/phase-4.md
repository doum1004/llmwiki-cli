# Phase 4: Lint + Links + Status

**Status**: NOT STARTED

**Goal**: LLM can check wiki health and navigate the link graph.

## Files

| File | Status | Description |
|------|--------|-------------|
| `src/lib/link-parser.ts` | Pending | extractWikilinks, buildLinkGraph, LinkGraph interface |
| `src/lib/frontmatter.ts` | Pending | parseFrontmatter, hasFrontmatter, addFrontmatter |
| `src/commands/lint.ts` | Pending | `wiki lint [--json]` — broken links, orphans, missing frontmatter, empty pages, index consistency |
| `src/commands/links.ts` | Pending | `wiki links <path>` — outbound + inbound links |
| `src/commands/backlinks.ts` | Pending | `wiki backlinks <path>` — inbound only |
| `src/commands/orphans.ts` | Pending | `wiki orphans` — pages with no inbound links |
| `src/commands/status.ts` | Pending | `wiki status [--json]` — page counts, link stats, recent activity, git info |
| `test/lint.test.ts` | Pending | Lint detection tests |
| `test/links.test.ts` | Pending | Wikilink extraction, graph building |

## Commands to Add

```
wiki lint [--json]
wiki links <path>
wiki backlinks <path>
wiki orphans
wiki status [--json]
```

## Key Design Decisions

- Wikilink syntax: `[[target]]` and `[[target|display]]`
- Wikilink resolution: check exact match, then check with directory prefix (entities/, concepts/, etc.)
- Orphan detection excludes index.md and log.md
- Lint checks: broken links, orphans, missing frontmatter, empty pages, index consistency
- `status` shows: page counts by directory, link stats, recent log entries, git info

## Entry Points to Update

- `bin/wiki.ts` — register new commands
