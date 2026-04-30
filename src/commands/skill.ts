import { Command } from "commander";

/** Printed by `wiki skill`; canonical agent guide (README points here). Keep aligned with `src/index.ts` and `src/lib/templates.ts` SCHEMA. */
const SKILL_GUIDE = `# llmwiki-cli — LLM Agent Skill Guide

You are operating a wiki CLI that manages markdown knowledge bases. You are the brain (deciding what to create, connect, and update). The CLI is the hands (reading, writing, searching, and managing files). The CLI never calls any LLM API — it is a pure filesystem tool.

## Storage

- **Local files**: Pages are \`.md\` files under the wiki root. \`wiki init\` creates the directory layout and \`.llmwiki.yaml\`; there is no built-in Git or cloud sync.
- **Profiles:** \`wiki profile use <slug>\`, \`--profile\`, \`LLMWIKI_PROFILE\`, or \`profile\` in \`.llmwiki.yaml\` choose a namespace. Files are stored under \`profiles/<slug>/\` in the wiki directory. Not a security boundary on shared disks.
- **Git / visualization (optional):** Use normal \`git init\` in the wiki root if you want version control. For an interactive link graph on GitHub Pages, copy the workflow and \`scripts/\` from the llmwiki-cli repo (see README: optional viz drop-in).

## Critical Patterns

### stdin via heredoc

\`write\` and \`append\` read from **stdin**. Always pipe content with a heredoc:

\`\`\`bash
wiki write wiki/concepts/attention.md <<'EOF'
---
title: Attention Mechanism
created: 2025-01-20
tags: [transformers, NLP]
---
Content here. Link to [[self-attention]] and [[transformers]].
EOF
\`\`\`

Use \`<<'EOF'\` (single-quoted) to prevent shell variable expansion inside content.

### Paths are relative to wiki root

All page paths are relative to the wiki root directory:

\`\`\`bash
wiki read wiki/concepts/attention.md      # correct
wiki read /home/user/my-wiki/wiki/concepts/attention.md  # wrong
\`\`\`

### Wikilinks

- \`[[page-name]]\` — resolved by filename across all wiki directories
- \`[[page-name|Display Text]]\` — link with custom display text
- Resolution order: exact path → wiki/ prefix → subdirectories → filename match anywhere

### Page format

Every wiki page should have YAML frontmatter:

\`\`\`markdown
---
title: Page Title
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [tag1, tag2]
source: URL or description
---

Page content here. Use [[wikilinks]] to connect pages.
\`\`\`

### File naming

- Use kebab-case: \`my-topic-name.md\`
- One topic per file — split large topics into sub-pages

### Directory structure

\`\`\`
raw/                  # Immutable source documents (paste originals here)
  assets/             # Downloaded images and files
wiki/                 # LLM-generated pages (all knowledge lives here)
  index.md            # Master index — update when adding/removing pages
  log.md              # Activity log — append after every action
  entities/           # People, orgs, products
  concepts/           # Ideas, frameworks, theories
  sources/            # One summary per ingested source
  synthesis/          # Cross-cutting analysis
\`\`\`

## Workflows

### Index and log: \`wiki write\` flags vs dedicated commands

- **Default for new wiki pages with YAML frontmatter:** \`wiki write <path> --from-frontmatter\` plus optional \`--log-type …\` (omit \`--log-message\` to use \`title\` in the log). One invocation writes the file and updates \`wiki/index.md\` / \`wiki/log.md\` when you opt in.
- **Keep \`wiki index\` and \`wiki log\`:** they are not redundant. Use them for \`index remove\`, \`index show\` / \`log show\`, \`index add\` without rewriting a page, \`log append\` when **no** page body is written (queries, maintenance), raw \`raw/\` drops without frontmatter, or summaries that must differ from \`title\`.

### Ingest a source

\`\`\`bash
# 1. Save raw source (immutable) — usually no index/log hook here
wiki write raw/attention-paper.md <<'EOF'
<full text of paper>
EOF

# 2. Structured summary: index + log from YAML title (\`--log-type\` alone reuses title as log message)
wiki write wiki/sources/attention-paper.md \\
  --from-frontmatter --log-type ingest <<'EOF'
---
title: Attention Is All You Need
created: 2025-01-20
tags: [transformers, attention, NLP]
source: https://arxiv.org/abs/1706.03762
---
Summary of the attention paper...
See [[transformers]] and [[self-attention]].
EOF

# 3. Concept page (same pattern)
wiki write wiki/concepts/transformers.md \\
  --from-frontmatter --log-type ingest <<'EOF'
---
title: Transformers
created: 2025-01-20
tags: [architecture, deep-learning]
---
The Transformer architecture...
EOF
\`\`\`

**One shared ingest log line** after several pages: use a single \`wiki log append ingest "…"\` and skip \`--log-type\` on intermediate \`wiki write\` calls (or use \`--from-frontmatter\` without \`--log-type\` for index-only on those pages).

**Explicit summaries** that differ from \`title\`: use \`--index-summary\` / \`--log-message\`, or plain \`wiki write\` followed by \`wiki index add\` / \`wiki log append\`:

\`\`\`bash
wiki write wiki/concepts/transformers.md \\
  --index-summary "Transformer architecture overview" \\
  --log-type ingest --log-message "Attention paper and transformer concepts" <<'EOF'
---
title: Transformers
created: 2025-01-20
tags: [architecture, deep-learning]
---
The Transformer architecture...
EOF
\`\`\`

### Answer a question using the wiki

\`\`\`bash
# 1. Search for relevant pages
wiki search "attention mechanism"

# 2. Read top results
wiki read wiki/concepts/attention.md

# 3. Follow links to gather more context
wiki links wiki/concepts/attention.md
wiki read wiki/sources/attention-paper.md

# 4. Log the query
wiki log append query "How does multi-head attention work?"
\`\`\`

### Maintain wiki health

\`\`\`bash
# 1. Check for issues
wiki lint

# 2. Review what needs fixing
wiki orphans                         # pages nobody links to
wiki status                          # overview stats

# 3. Fix issues: add frontmatter, create missing pages, connect orphans
wiki log append maintenance "Fixed broken links and orphan pages"
\`\`\`

### Multi-wiki operations

\`\`\`bash
wiki registry                        # list all wikis
wiki use ml                          # switch active wiki
wiki --wiki personal read wiki/index.md   # target specific wiki
wiki search "neural networks" --all  # search across all wikis
\`\`\`

## Command Reference

### Wiki Management

| Command | Description |
|---------|-------------|
| \`wiki init [dir] --name <n> --domain <d>\` | Create new wiki (local markdown only) |
| \`wiki registry\` | List all registered wikis |
| \`wiki use [wiki-id]\` | List wikis or set active wiki |
| \`wiki profile show | use <slug> | clear\` | Storage profile: uses \`profiles/<slug>/\` subdirectory; \`--profile\` / \`LLMWIKI_PROFILE\` override |

### Reading & Writing

| Command | Description |
|---------|-------------|
| \`wiki read <path>\` | Print page content to stdout |
| \`wiki write <path>\` | Write stdin to page (create or overwrite); optional \`--index-summary\`, \`--log-type\` + \`--log-message\`, \`--from-frontmatter\` (YAML \`title\` fills omitted index/log text) |
| \`wiki append <path>\` | Append stdin to existing page |
| \`wiki list [dir] [--tree] [--json]\` | List pages (optionally as tree or JSON) |
| \`wiki search <query> [-l N] [--all] [--json]\` | Full-text search with ranking |

### Index & Log

| Command | Description |
|---------|-------------|
| \`wiki index show\` | Print master index |
| \`wiki index add <path> <summary>\` | Add entry to index (also covered by \`wiki write\` flags when creating a page) |
| \`wiki index remove <path>\` | Remove entry from index (no \`write\` equivalent) |
| \`wiki log show [--last N] [--type T]\` | Print log entries (filter by count/type) |
| \`wiki log append <type> <message>\` | Append log entry — use for query/maintenance and any log line **without** a page write |

### Health & Links

| Command | Description |
|---------|-------------|
| \`wiki lint [--json]\` | Check health: broken links, orphans, missing frontmatter, index gaps |
| \`wiki links <path>\` | Show outbound + inbound links for a page |
| \`wiki backlinks <path>\` | Show inbound links only |
| \`wiki orphans\` | List pages with no inbound links |
| \`wiki status [--json]\` | Wiki overview: page counts, link stats, recent activity |

## Gotchas

1. **Always use heredoc for write/append** — these commands read stdin, not arguments. Running \`wiki write path.md "content"\` will hang waiting for stdin.

2. **Always update index + log** — for new pages with frontmatter, prefer \`wiki write … --from-frontmatter\` (and optional \`--log-type\`). Use \`wiki index\` / \`wiki log\` for \`index remove\`, read-only \`show\`, \`log append\` without a page write, or when summaries must differ from \`title\`. The \`wiki lint\` command checks for pages missing from the index.

3. **append fails if page doesn't exist** — use \`wiki write\` to create new pages, \`wiki append\` only for existing ones.

4. **Wiki resolution** — if commands fail with "No wiki found", either \`cd\` into a wiki directory, run \`wiki use <id>\` to set a default, or pass \`--wiki <id>\`.

5. **search --all** searches across all registered wikis, not just the active one.

6. **lint checks five things**: broken wikilinks, orphan pages, missing frontmatter, empty pages, and index consistency (pages not in index, index entries pointing to missing pages).

7. **Re-running init** — if a directory already has \`.llmwiki.yaml\`, \`wiki init\` exits with an error. Choose a new directory or remove the existing config first.`;

export function makeSkillCommand(): Command {
  return new Command("skill")
    .description("Print the LLM agent skill guide")
    .action(() => {
      console.log(SKILL_GUIDE);
    });
}
