# llmwiki-cli

[![npm version](https://img.shields.io/npm/v/llmwiki-cli?style=flat-square&color=cb3837&logo=npm)](https://www.npmjs.com/package/llmwiki-cli)
![total downloads](https://img.shields.io/npm/dt/llmwiki-cli)
![Visitors](https://visitor-badge.laobi.icu/badge?page_id=doum1004.llmwiki-cli)
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
|   $ wiki init my-wiki --name "Notes" --domain "machine learning"
|   $ wiki write wiki/concepts/attention.md <<'EOF' ... JSON ... EOF
|   $ wiki delete wiki/concepts/old.md
|   $ wiki search "scaling laws"
|   $ wiki lint
|
v
wiki CLI (StorageProvider → local markdown files)
```

**Key principle**: The CLI never calls any LLM API. It reads and writes markdown on disk only (no built-in Git sync or cloud backends).

**AI assistants / coding agents:** Use [CLAUDE.md](CLAUDE.md) for instructions, rules, and technical context. This README stays oriented to people (overview, install, usage).

## Install

```bash
npm install -g llmwiki-cli
```

This gives you two commands: `wiki` (primary, 4 chars) and `llmwiki` (fallback if `wiki` conflicts).

## Quick Start

```bash
# Create a new wiki
wiki init my-wiki --name "My Notes" --domain "research"

# Write a page (JSON on stdin → YAML frontmatter + body; index updated automatically)
wiki write wiki/concepts/attention.md <<'EOF'
{
  "title": "Attention Mechanism",
  "tags": ["transformers", "NLP"],
  "content": "The attention mechanism allows models to focus on relevant parts of the input.\nSee also [[transformers]] and [[self-attention]]."
}
EOF

# Search and lint
wiki search "attention"
wiki lint
```

## Wiki Structure

When you run `wiki init`, it creates:

```
my-wiki/
├── .llmwiki.yaml          # Wiki config
├── SCHEMA.md              # Instructions for LLM agents
├── raw/                   # Immutable source documents
│   └── assets/            # Downloaded images
└── wiki/                  # LLM-generated pages
    ├── index.md           # Master index (updated by wiki write / delete)
    ├── entities/          # People, orgs, products
    ├── concepts/          # Ideas, frameworks, theories
    ├── sources/           # One summary per ingested source
    └── synthesis/         # Cross-cutting analysis
```

Use normal Git in `my-wiki/` if you want version control. The CLI does not run `git init` for you.

All markdown pages are stored directly under the wiki root (no `profiles/<slug>/` indirection).

## Commands

### Wiki Management
```bash
wiki init [dir] --name <name> --domain <domain>      # Create wiki (local files only)
wiki registry                                       # List all wikis
wiki use [wiki-id]                                  # Set active wiki
```

### Reading & Writing
```bash
wiki read <path>                                    # Print page markdown to stdout
wiki write <path>                                   # JSON on stdin → frontmatter + body; upserts wiki/index.md for wiki/* paths
wiki delete <path>                                  # Delete page + remove from index
wiki list [dir] [--tree] [--json]                   # List pages
wiki search <query> [--limit N] [--all] [--json]    # Search pages
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

Run `wiki skill` to print the full guide. The canonical text lives in [`src/commands/skill.ts`](src/commands/skill.ts) (`SKILL_GUIDE`); update it when commands change. Covers workflows, command patterns, page format, and common gotchas for LLM agents.

## How LLM Agents Use This

The generated `SCHEMA.md` in each wiki contains complete instructions. Here are the typical workflows:

### Ingest a Source
```bash
# Save raw source (JSON body — large string in "content")
wiki write raw/paper.md <<'EOF'
{"title":"Paper — full text","content":"<paste full text of paper>"}
EOF

# Create structured summary (index line uses title)
wiki write wiki/sources/attention-paper.md <<'EOF'
{
  "title": "Attention Is All You Need",
  "tags": ["transformers", "attention", "NLP"],
  "source": "https://arxiv.org/abs/1706.03762",
  "content": "Summary of the attention paper...\nLinks to [[transformers]] and [[self-attention]]."
}
EOF
```

### Answer a Question
```bash
wiki search "attention mechanism"
wiki read wiki/concepts/attention.md
wiki links wiki/concepts/attention.md    # see related pages
```

### Maintain Wiki Health
```bash
wiki lint                  # find broken links, orphans, missing frontmatter
wiki orphans               # pages nobody links to
wiki status                # overview stats
```

## Optional: link graph on GitHub Pages

The CLI does **not** scaffold Git or Actions during `wiki init`. If you want the same interactive d3-force graph as the [live demo](https://doum1004.github.io/llmwiki-cli/):

1. Initialize or clone a **git** repository at your wiki root (`git init`, add remote, etc.).
2. Copy from **this repository** into your wiki root:
   - `.github/workflows/wiki-viz.yml` — source string: `getVizWorkflow()` in [`src/lib/templates.ts`](src/lib/templates.ts)
   - `scripts/build-graph.js` and `scripts/build-site.js` — `getBuildGraphScript()` / `getBuildSiteScript()` in the same file  
   Maintainers can regenerate standalone copies with `bun scripts/generate-viz-scripts.ts [outDir]` (writes `build-graph.cjs` / `build-site.cjs`; rename to `.js` if you prefer).
3. Commit and push. In the GitHub repo, enable **Pages** with source **GitHub Actions**.

The workflow parses `[[wikilinks]]` on each push and publishes the graph site.

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

## Development

```bash
git clone https://github.com/doum1004/llmwiki-cli
cd llmwiki-cli
bun install
bun test            # run full test suite
bun run build       # bundle to dist/index.js
bun run dev -- --help
```

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=doum1004/llmwiki-cli&type=Date)](https://star-history.com/#doum1004/llmwiki-cli&Date)

## License

MIT
