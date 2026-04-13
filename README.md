# llmwiki-cli

[![npm version](https://img.shields.io/npm/v/llmwiki-cli?style=flat-square&color=cb3837&logo=npm)](https://www.npmjs.com/package/llmwiki-cli)
![total downloads](https://img.shields.io/npm/dt/llmwiki-cli)
[![CI](https://img.shields.io/github/actions/workflow/status/doum1004/llmwiki-cli/ci.yml?branch=main&style=flat-square&label=CI&logo=github)](https://github.com/doum1004/llmwiki-cli/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/llmwiki-cli?style=flat-square&color=blue)](./LICENSE)
[![bun](https://img.shields.io/badge/built%20with-bun-f9f1e1?style=flat-square&logo=bun)](https://bun.sh)
[![ko-fi](https://img.shields.io/badge/donate-Ko--fi-FF5E5B?style=flat-square&logo=ko-fi&logoColor=white)](https://ko-fi.com/doum1004)

A CLI tool for LLM agents to build and maintain personal knowledge bases.

Inspired by [Andrej Karpathy's LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

**[Live Demo](https://doum1004.github.io/llmwiki-cli/)** — interactive d3-force graph built from the example wiki in [`test-wiki-page/`](test-wiki-page/).

## Overview

The CLI is the hands -- it reads, writes, searches, and manages wiki files. The LLM is the brain -- it decides what to create, update, and connect.

```
LLM Agent (Claude Code / Codex)
|
| shells out to:
|   $ wiki init my-wiki --domain "machine learning"
|   $ wiki write wiki/concepts/attention.md <<'EOF' ... EOF
|   $ wiki index add "concepts/attention.md" "Overview of attention"
|   $ wiki search "scaling laws"
|   $ wiki lint
|
v
wiki CLI (StorageProvider abstraction)
|
v
filesystem | git (auto-commit + auto-push) | supabase (database)
```

**Key principle**: The CLI never calls any LLM API. It is a pure storage tool with pluggable backends.

## Install

```bash
npm install -g llmwiki-cli
```

This gives you two commands: `wiki` (primary, 4 chars) and `llmwiki` (fallback if `wiki` conflicts).

## Storage Backends

| Backend | Description | Init |
|---------|-------------|------|
| `filesystem` (default) | Plain markdown files on disk | `wiki init my-wiki` |
| `git` | Filesystem + auto-commit + auto-push to GitHub | `wiki init my-wiki --backend git --git-token <pat>` |
| `supabase` | Pages in a Supabase database table | `wiki init my-wiki --backend supabase --supabase-url <url> --supabase-key <key>` |

## Quick Start

```bash
# Create a new wiki (filesystem backend, default)
wiki init my-wiki --name "My Notes" --domain "research"

# Or with git + GitHub sync
wiki init my-wiki --name "My Notes" --domain "research" --backend git --git-token ghp_xxx

# Write a page
wiki write wiki/concepts/attention.md <<'EOF'
---
title: Attention Mechanism
created: 2025-01-20
tags: [transformers, NLP]
---
The attention mechanism allows models to focus on relevant parts of the input.
See also [[transformers]] and [[self-attention]].
EOF

# Add to index and log
wiki index add "concepts/attention.md" "Overview of attention mechanisms"
wiki log append ingest "Attention mechanism page"

# Search and lint
wiki search "attention"
wiki lint
```

## Wiki Structure

When you run `wiki init` (filesystem or git backend), it creates:

```
my-wiki/
├── .git/                  # Only with --backend git
├── .github/               # Only with --backend git (--viz)
│   └── workflows/
│       └── wiki-viz.yml   # GitHub Actions → GitHub Pages visualization
├── .gitignore             # Only with --backend git (--viz)
├── .llmwiki.yaml          # Wiki config (all backends)
├── SCHEMA.md              # Instructions for LLM agents
├── scripts/               # Only with --backend git (--viz)
│   ├── build-graph.js     # Builds graph.json from wikilinks
│   └── build-site.js      # Generates d3-force visualization
├── raw/                   # Immutable source documents
│   └── assets/            # Downloaded images
└── wiki/                  # LLM-generated pages
    ├── index.md           # Master index of all pages
    ├── log.md             # Chronological activity log
    ├── entities/          # People, orgs, products
    ├── concepts/          # Ideas, frameworks, theories
    ├── sources/           # One summary per ingested source
    └── synthesis/         # Cross-cutting analysis
```

For supabase backend, only `.llmwiki.yaml` is created locally. Pages are stored in the `wiki_pages` database table.

**Schema and init:** `wiki init --backend supabase` runs a quick check against `wiki_pages` (required columns, `upsert` on `user_id,wiki_id,path` with nullable `user_id`). If the table is missing or incompatible, the CLI prints **ready-to-run SQL** for PostgreSQL **15+** (`unique nulls not distinct` on `user_id, wiki_id, path`). Apply it in the Supabase SQL Editor, then run `wiki init` again. If initial seed writes still fail with a schema-style error, the same SQL is printed again as a hint.

**`user_id`:** Optional. `NULL` means a single shared partition (works well with the **service role** key for personal tooling). When set, the row is scoped to that auth user. The trigger fills `user_id` from `auth.uid()` when the client leaves it null and a user session exists.

**RLS and auth:** Policies allow the `authenticated` role to read and write rows where `user_id is null or auth.uid() = user_id`. Use the **anon** key in `.llmwiki.yaml` plus a **Supabase Auth access token** (JWT) per session: `LLMWIKI_SUPABASE_ACCESS_TOKEN`, or optional `supabase.access_token` in config (avoid committing secrets). The **service role** key bypasses RLS; do not rely on it for multi-tenant isolation. Older layouts (for example `(wiki_id, path)` only, or non-null `user_id` without the right unique constraint) need a migration or `drop table public.wiki_pages cascade` before applying the printed SQL.

**Storage profiles (all backends):** `wiki profile use <slug>`, `--profile`, `LLMWIKI_PROFILE`, or top-level `profile` in `.llmwiki.yaml` (legacy: `supabase.profile`). For **filesystem** and **git**, pages live under `profiles/<slug>/` inside the wiki repo. For **Supabase**, the same slug selects the composite `wiki_id`. This is organizational separation only, not OS or cryptographic isolation.

## Commands

### Wiki Management
```bash
wiki init [dir] --name <name> --domain <domain> --backend <type>
wiki init [dir] --backend git --git-token <pat> [--git-repo owner/repo]
wiki init [dir] --backend git --no-viz              # Skip visualization scaffolding
wiki init [dir] --backend supabase --supabase-url <url> --supabase-key <key>
wiki init [existing-wiki-dir] --viz                 # Add visualization to existing git wiki
wiki registry                                       # List all wikis
wiki use [wiki-id]                                  # Set active wiki
wiki profile show                                   # Effective storage root / Supabase wiki_id
wiki profile use <slug>                             # Save profile in registry (all backends)
wiki profile clear                                  # Remove saved profile
```

### Reading & Writing
```bash
wiki read <path>                                    # Print page to stdout
wiki write <path>                                   # Write stdin to page
wiki append <path>                                  # Append stdin to page
wiki list [dir] [--tree] [--json]                   # List pages
wiki search <query> [--limit N] [--all] [--json]    # Search pages
```

### Index & Log
```bash
wiki index show                                     # Print master index
wiki index add <path> <summary>                     # Add entry to index
wiki index remove <path>                            # Remove entry
wiki log show [--last N] [--type T]                 # Print log entries
wiki log append <type> <message>                    # Append log entry
```

### Health & Links
```bash
wiki lint [--json]                                  # Health check
wiki links <path>                                   # Outbound + inbound links
wiki backlinks <path>                               # Inbound links only
wiki orphans                                        # Pages with no inbound links
wiki status [--json]                                # Wiki overview stats
```

## LLM Agent Skill Guide

Run `wiki skill` to print the full guide, or see [`docs/SKILL.md`](docs/SKILL.md) for the source. Covers workflows, command patterns, page format, and common gotchas for LLM agents.

## How LLM Agents Use This

The generated `SCHEMA.md` in each wiki contains complete instructions. Here are the typical workflows:

### Ingest a Source
```bash
# Save raw source
wiki write raw/paper.md <<'EOF'
<paste full text of paper>
EOF

# Create structured summary
wiki write wiki/sources/attention-paper.md <<'EOF'
---
title: Attention Is All You Need
created: 2025-01-20
tags: [transformers, attention, NLP]
source: https://arxiv.org/abs/1706.03762
---
Summary of the attention paper...
Links to [[transformers]] and [[self-attention]].
EOF

# Update bookkeeping
wiki index add "sources/attention-paper.md" "Attention Is All You Need (2017)"
wiki log append ingest "Attention paper"
```

### Answer a Question
```bash
wiki search "attention mechanism"
wiki read wiki/concepts/attention.md
wiki links wiki/concepts/attention.md    # see related pages
wiki log append query "How does multi-head attention work?"
```

### Maintain Wiki Health
```bash
wiki lint                  # find broken links, orphans, missing frontmatter
wiki orphans               # pages nobody links to
wiki status                # overview stats
```

## Git backend and GitHub

- **New repo:** With `--git-token` and no `--git-repo`, the CLI creates **`wiki-<name>` as a public repository** (straightforward to try GitHub Pages). Use `--git-repo owner/existing` to target a repo you already manage.
- **Token not committed:** `.llmwiki.yaml` stores **`git.repo` only**, not your PAT, so GitHub’s push secret scanning does not reject commits. For **`wiki write` / `wiki append`** (auto-push), set **`LLMWIKI_GIT_TOKEN`**, **`GITHUB_TOKEN`**, or **`GIT_TOKEN`** in your environment.
- **PAT permissions:** The token must be allowed to update **GitHub Actions workflow** files (classic PAT: include the **`workflow`** scope; fine-grained: grant workflow/Actions write). Otherwise the first push after init can fail on `.github/workflows/wiki-viz.yml`.

## Graph Visualization

Git-backend wikis automatically include a GitHub Actions workflow that builds an interactive d3-force graph visualization of your wiki's link structure and deploys it to GitHub Pages.

- **Auto-scaffolded**: `wiki init --backend git` creates `.github/workflows/wiki-viz.yml` and `scripts/` build scripts by default
- **On every push**: GitHub Actions parses all `[[wikilinks]]`, builds a force-directed graph, and deploys to Pages
- **Interactive**: color-coded nodes by directory, zoom/pan, click-to-highlight connections, hover tooltips
- **Opt-out**: use `--no-viz` to skip visualization scaffolding
- **Add to existing wiki**: re-run `wiki init <dir> --viz` on an existing git wiki to add visualization files

After a successful first push, init also tries to enable **GitHub Pages** (build: GitHub Actions). You can still configure it under **Settings → Pages → Source: GitHub Actions** if needed.

**Branch name:** New git wikis rename the default branch to **`main`** before the first push so the **`github-pages`** Actions environment (which often only allows `main`) accepts deployment. If you see *“Branch master is not allowed to deploy to github-pages”*, rename locally with `git branch -M main`, push `main`, and under **Settings → General** set the **default branch** to `main` (and optionally delete the old `master` branch on GitHub).

## Multi-Wiki Support

The CLI supports multiple wikis via a global registry at `~/.config/llmwiki/`:

```bash
wiki init ~/wikis/ml --name ml --domain "machine learning"
wiki init ~/wikis/personal --name personal --domain "personal notes"
wiki registry        # lists both
wiki use ml          # switch active wiki
wiki --wiki personal read wiki/index.md   # target specific wiki
wiki search "neural networks" --all       # search across all wikis
```

**Wiki resolution order**: `--wiki` flag > cwd `.llmwiki.yaml` > walk up directories > registry default.

## Requirements

- Node.js >= 18 (or Bun)
- Git (for `--backend git` only)
- `@supabase/supabase-js` (for `--backend supabase` only — optional dependency)

## Development

```bash
git clone https://github.com/doum1004/llmwiki-cli
cd llmwiki-cli
bun install
bun test            # 194 tests
bun run build       # bundle to dist/wiki.js
bun run dev -- --help
```

## DATA

![Visitors](https://visitor-badge.laobi.icu/badge?page_id=doum1004.llmwiki-cli)

## License

MIT
