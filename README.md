# llmwiki-cli

[![npm version](https://img.shields.io/npm/v/llmwiki-cli?style=flat-square&color=cb3837&logo=npm)](https://www.npmjs.com/package/llmwiki-cli)
![total downloads](https://img.shields.io/npm/dt/llmwiki-cli)
[![CI](https://img.shields.io/github/actions/workflow/status/doum1004/llmwiki-cli/ci.yml?branch=main&style=flat-square&label=CI&logo=github)](https://github.com/doum1004/llmwiki-cli/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/llmwiki-cli?style=flat-square&color=blue)](./LICENSE)
[![bun](https://img.shields.io/badge/built%20with-bun-f9f1e1?style=flat-square&logo=bun)](https://bun.sh)
[![ko-fi](https://img.shields.io/badge/donate-Ko--fi-FF5E5B?style=flat-square&logo=ko-fi&logoColor=white)](https://ko-fi.com/doum1004)

A CLI tool for LLM agents to build and maintain personal knowledge bases.

Inspired by [Andrej Karpathy's LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

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
|   $ wiki commit "ingest: attention paper"
|   $ wiki push
|
v
wiki CLI (pure filesystem + git)
|
v
Wiki Repo (markdown files + .git + GitHub)
```

**Key principle**: The CLI never calls any LLM API. It is a pure filesystem + git tool.

## Install

```bash
npm install -g llmwiki-cli
```

This gives you two commands: `wiki` (primary, 4 chars) and `llmwiki` (fallback if `wiki` conflicts).

## Quick Start

```bash
# Create a new wiki
wiki init my-wiki --name "My Notes" --domain "research"

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

# Search, lint, commit
wiki search "attention"
wiki lint
wiki commit "ingest: attention mechanism"
```

## Wiki Structure

When you run `wiki init`, it creates:

```
my-wiki/
├── .git/
├── .llmwiki.yaml          # Wiki config
├── SCHEMA.md              # Instructions for LLM agents
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

## Commands

### Wiki Management
```bash
wiki init [dir] --name <name> --domain <domain>   # Create new wiki
wiki registry                                       # List all wikis
wiki use [wiki-id]                                  # Set active wiki
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
wiki commit [message]                               # Git add + commit
wiki history [path] [--last N]                      # Git log
wiki diff [ref]                                     # Git diff
```

### Health & Links
```bash
wiki lint [--json]                                  # Health check
wiki links <path>                                   # Outbound + inbound links
wiki backlinks <path>                               # Inbound links only
wiki orphans                                        # Pages with no inbound links
wiki status [--json]                                # Wiki overview stats
```

### GitHub Sync
```bash
wiki auth login                                     # Authenticate with GitHub PAT
wiki auth status                                    # Show auth status
wiki auth logout                                    # Remove credentials
wiki repo list [--all] [--filter]                   # List your GitHub repos
wiki repo create <name> [--domain] [--public]       # Create repo + init wiki
wiki repo clone [name] [--dir]                      # Clone repo + register
wiki repo connect [wiki-id]                         # Connect wiki to new GitHub repo
wiki push                                           # Git push
wiki pull                                           # Git pull
wiki sync                                           # Pull + push
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
wiki commit "ingest: attention paper"
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
wiki commit "maintenance: fix lint issues"
```

### Sync to GitHub
```bash
wiki auth login            # one-time setup with GitHub PAT
wiki repo create research  # creates private wiki-research repo
wiki push                  # after making changes
wiki sync                  # pull + push
```

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
- Git (optional but recommended for version control)

## Development

```bash
git clone https://github.com/doum1004/llmwiki-cli
cd llmwiki-cli
bun install
bun test            # 192 tests
bun run build       # bundle to dist/wiki.js
bun run dev -- --help
```

## DATA

![Visitors](https://visitor-badge.laobi.icu/badge?page_id=doum1004.llmwiki-cli)

## License

MIT
