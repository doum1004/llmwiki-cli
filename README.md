# llmwiki-cli

A CLI tool for LLM agents to build and maintain personal knowledge bases.

Inspired by [Andrej Karpathy's LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

## Overview

The CLI is the hands — it reads, writes, searches, and manages wiki files. The LLM is the brain — it decides what to create, update, and connect.

```
LLM Agent (Claude Code / Codex)
│
│ shells out to:
│   $ wiki init my-wiki --domain "machine learning"
│   $ wiki write wiki/concepts/attention.md <<'EOF' ... EOF
│   $ wiki index add "concepts/attention.md" "Overview of attention"
│   $ wiki commit "ingest: attention paper"
│
▼
wiki CLI (pure filesystem + git)
│
▼
Wiki Repo (markdown files + .git)
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

# List your wikis
wiki registry

# Set the active wiki
wiki use my-wiki
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

### Reading & Writing (Phase 2)
```bash
wiki read <path>                                    # Print page to stdout
wiki write <path>                                   # Write stdin to page
wiki append <path>                                  # Append stdin to page
wiki list [dir] [--tree] [--json]                   # List pages
wiki search <query> [--limit N] [--all] [--json]    # Search pages
```

### Index & Log (Phase 3)
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

### Health & Links (Phase 4)
```bash
wiki lint [--json]                                  # Health check
wiki links <path>                                   # Outbound + inbound links
wiki backlinks <path>                               # Inbound links only
wiki orphans                                        # Pages with no inbound links
wiki status [--json]                                # Wiki overview stats
```

### GitHub Sync (Phase 5)
```bash
wiki auth login                                     # GitHub device flow auth
wiki repo create <name> [--public]                  # Create repo + wiki
wiki repo clone [name]                              # Clone repo + register
wiki push                                           # Git push
wiki pull                                           # Git pull
wiki sync                                           # Pull + push
```

## How LLM Agents Use This

The generated `SCHEMA.md` in each wiki contains complete instructions. Here's the typical workflow:

### Ingest a Source
```bash
wiki write raw/paper.md <<'EOF'
<paste full text of paper>
EOF

wiki write wiki/sources/attention-paper.md <<'EOF'
---
title: Attention Is All You Need
created: 2025-01-20
tags: [transformers, attention, NLP]
source: https://arxiv.org/abs/1706.03762
---
Summary of the attention paper...
EOF

wiki index add "sources/attention-paper.md" "Attention Is All You Need (2017)"
wiki log append ingest "Attention paper"
wiki commit "ingest: attention paper"
```

### Answer a Question
```bash
wiki search "attention mechanism"
wiki read wiki/concepts/attention.md
wiki log append query "How does multi-head attention work?"
```

## Multi-Wiki Support

The CLI supports multiple wikis via a global registry at `~/.config/llmwiki/`:

```bash
wiki init ~/wikis/ml --name ml --domain "machine learning"
wiki init ~/wikis/personal --name personal --domain "personal notes"
wiki registry        # lists both
wiki use ml          # switch active wiki
wiki --wiki personal read wiki/index.md   # target specific wiki
```

**Wiki resolution order**: `--wiki` flag > cwd `.llmwiki.yaml` > walk up directories > registry default.

## Requirements

- Node.js >= 18 (or Bun)
- Git (optional, for version control features)

## Development

```bash
git clone https://github.com/user/llmwiki-cli
cd llmwiki-cli
bun install
bun test
bun run dev -- --help
```

## License

MIT
