# llmwiki-cli — LLM Agent Skill Guide

You are operating a wiki CLI that manages markdown knowledge bases. You are the brain (deciding what to create, connect, and update). The CLI is the hands (reading, writing, searching, and syncing files). The CLI never calls any LLM API — it is a pure storage tool.

## Storage Backends

The CLI supports three storage backends:

| Backend | Description | Init |
|---------|-------------|------|
| `filesystem` (default) | Plain markdown files on disk, no versioning | `wiki init my-wiki` |
| `git` | Filesystem + auto-commit on every write/append + git commands | `wiki init my-wiki --backend git` |
| `supabase` | Pages stored in a Supabase database table | `wiki init my-wiki --backend supabase --supabase-url <url> --supabase-key <key>` |

- **filesystem**: Simplest. Pages are `.md` files. No versioning.
- **git**: Every `wiki write` and `wiki append` auto-commits. Git commands (`commit`, `push`, `pull`, `sync`, `history`, `diff`) only work with this backend.
- **supabase**: Pages stored in `wiki_pages` table. No local files. Requires `@supabase/supabase-js` installed.

## Critical Patterns

### stdin via heredoc

`write` and `append` read from **stdin**. Always pipe content with a heredoc:

```bash
wiki write wiki/concepts/attention.md <<'EOF'
---
title: Attention Mechanism
created: 2025-01-20
tags: [transformers, NLP]
---
Content here. Link to [[self-attention]] and [[transformers]].
EOF
```

Use `<<'EOF'` (single-quoted) to prevent shell variable expansion inside content.

### Paths are relative to wiki root

All page paths are relative to the wiki root directory:

```bash
wiki read wiki/concepts/attention.md      # correct
wiki read /home/user/my-wiki/wiki/concepts/attention.md  # wrong
```

### Wikilinks

- `[[page-name]]` — resolved by filename across all wiki directories
- `[[page-name|Display Text]]` — link with custom display text
- Resolution order: exact path → wiki/ prefix → subdirectories → filename match anywhere

### Page format

Every wiki page should have YAML frontmatter:

```markdown
---
title: Page Title
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [tag1, tag2]
source: URL or description
---

Page content here. Use [[wikilinks]] to connect pages.
```

### File naming

- Use kebab-case: `my-topic-name.md`
- One topic per file — split large topics into sub-pages

### Directory structure (filesystem/git backends)

```
raw/                  # Immutable source documents (paste originals here)
  assets/             # Downloaded images and files
wiki/                 # LLM-generated pages (all knowledge lives here)
  index.md            # Master index — update when adding/removing pages
  log.md              # Activity log — append after every action
  entities/           # People, orgs, products
  concepts/           # Ideas, frameworks, theories
  sources/            # One summary per ingested source
  synthesis/          # Cross-cutting analysis
```

For supabase backend, the same paths are used as keys in the database — no local directory structure is created.

## Workflows

### Ingest a source

```bash
# 1. Save raw source (immutable)
wiki write raw/attention-paper.md <<'EOF'
<full text of paper>
EOF

# 2. Create structured summary page
wiki write wiki/sources/attention-paper.md <<'EOF'
---
title: Attention Is All You Need
created: 2025-01-20
tags: [transformers, attention, NLP]
source: https://arxiv.org/abs/1706.03762
---
Summary of the attention paper...
See [[transformers]] and [[self-attention]].
EOF

# 3. Create/update entity and concept pages as needed
wiki write wiki/concepts/transformers.md <<'EOF'
---
title: Transformers
created: 2025-01-20
tags: [architecture, deep-learning]
---
The Transformer architecture...
EOF

# 4. Update bookkeeping
wiki index add "sources/attention-paper.md" "Attention Is All You Need (2017)"
wiki index add "concepts/transformers.md" "Transformer architecture overview"
wiki log append ingest "Attention paper and transformer concepts"

# Done — git backend auto-commits on write
```

### Answer a question using the wiki

```bash
# 1. Search for relevant pages
wiki search "attention mechanism"

# 2. Read top results
wiki read wiki/concepts/attention.md

# 3. Follow links to gather more context
wiki links wiki/concepts/attention.md
wiki read wiki/sources/attention-paper.md

# 4. Log the query
wiki log append query "How does multi-head attention work?"
```

### Maintain wiki health

```bash
# 1. Check for issues
wiki lint

# 2. Review what needs fixing
wiki orphans                         # pages nobody links to
wiki status                          # overview stats

# 3. Fix issues: add frontmatter, create missing pages, connect orphans
# 4. Log fixes (git backend auto-commits on write)
wiki log append maintenance "Fixed broken links and orphan pages"
```

### Multi-wiki operations

```bash
wiki registry                        # list all wikis
wiki use ml                          # switch active wiki
wiki --wiki personal read wiki/index.md   # target specific wiki
wiki search "neural networks" --all  # search across all wikis
```

## Command Reference

### Wiki Management

| Command | Description |
|---------|-------------|
| `wiki init [dir] --name <n> --domain <d> --backend <type>` | Create new wiki (backends: filesystem, git, supabase) |
| `wiki init [dir] --backend supabase --supabase-url <url> --supabase-key <key>` | Create Supabase-backed wiki |
| `wiki registry` | List all registered wikis |
| `wiki use [wiki-id]` | Set active wiki (interactive picker if no id) |

### Reading & Writing

| Command | Description |
|---------|-------------|
| `wiki read <path>` | Print page content to stdout |
| `wiki write <path>` | Write stdin to page (create or overwrite) |
| `wiki append <path>` | Append stdin to existing page |
| `wiki list [dir] [--tree] [--json]` | List pages (optionally as tree or JSON) |
| `wiki search <query> [-l N] [--all] [--json]` | Full-text search with ranking |

### Index & Log

| Command | Description |
|---------|-------------|
| `wiki index show` | Print master index |
| `wiki index add <path> <summary>` | Add entry to index |
| `wiki index remove <path>` | Remove entry from index |
| `wiki log show [--last N] [--type T]` | Print log entries (filter by count/type) |
| `wiki log append <type> <message>` | Append log entry (types: ingest, query, maintenance, etc.) |

### Health & Links

| Command | Description |
|---------|-------------|
| `wiki lint [--json]` | Check health: broken links, orphans, missing frontmatter, index gaps |
| `wiki links <path>` | Show outbound + inbound links for a page |
| `wiki backlinks <path>` | Show inbound links only |
| `wiki orphans` | List pages with no inbound links |
| `wiki status [--json]` | Wiki overview: page counts, link stats, recent activity, git info |

## Gotchas

1. **Always use heredoc for write/append** — these commands read stdin, not arguments. Running `wiki write path.md "content"` will hang waiting for stdin.

2. **Always update index + log** — after creating or modifying pages, call `wiki index add` and `wiki log append`. The `wiki lint` command checks for pages missing from the index.

3. **append fails if page doesn't exist** — use `wiki write` to create new pages, `wiki append` only for existing ones.

5. **Wiki resolution** — if commands fail with "No wiki found", either `cd` into a wiki directory, run `wiki use <id>` to set a default, or pass `--wiki <id>`.

6. **search --all** searches across all registered wikis, not just the active one.

7. **lint checks five things**: broken wikilinks, orphan pages, missing frontmatter, empty pages, and index consistency (pages not in index, index entries pointing to missing pages).
