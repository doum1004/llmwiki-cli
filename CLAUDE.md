# LLM Wiki CLI

## What This Is

A CLI tool that helps LLM agents (Claude Code, Codex, etc.) build and maintain personal knowledge bases. The CLI is the hands — it reads, writes, searches, and manages wiki files. The LLM is the brain — it decides what to create, update, and connect.

**Key principle: The CLI never calls any LLM API. It is a pure storage tool with pluggable backends (filesystem, git, supabase).**

## Tech Stack

- **Runtime**: Bun (development), Node.js (published bundle)
- **Language**: TypeScript
- **Dependencies**: commander (CLI), js-yaml (YAML parsing), @supabase/supabase-js (optional)
- **Build**: `bun build` bundles to `dist/wiki.js` targeting Node.js
- **Tests**: Bun test runner (`bun test`)

## LLM Agent Skill Guide

Run `wiki skill` to print the full guide, or see [`docs/SKILL.md`](docs/SKILL.md) for the source. Covers workflows, command patterns, and gotchas for LLM agents.

## Project Structure

```
bin/wiki.ts              # CLI entry point (source)
dist/wiki.js             # Built bundle (npm-published artifact)
src/
  types.ts               # Shared TypeScript interfaces
  lib/
    storage.ts           # StorageProvider factory (createProvider)
    wiki.ts              # WikiManager: filesystem StorageProvider
    git-provider.ts      # GitProvider: filesystem + auto-commit + auto-push
    supabase-provider.ts # SupabaseProvider: Supabase database StorageProvider
    supabase-wiki-pages-probe.ts # init-time check for wiki_pages schema; drives printed SQL
    config.ts            # .llmwiki.yaml read/write
    registry.ts          # Global registry (~/.config/llmwiki/registry.yaml)
    resolver.ts          # Wiki resolution chain (--wiki → cwd → walk up → default)
    git.ts               # Git operations via child_process.execFile
    github.ts            # GitHub API: createRepo, getUsername, enablePages
    git-credentials.ts   # resolvedGitToken: env LLMWIKI_GIT_TOKEN / GITHUB_TOKEN / GIT_TOKEN, then YAML
    templates.ts         # Default file content (SCHEMA.md, index.md, log.md, viz workflow/scripts)
    search.ts            # Full-text search with term-frequency ranking
    index-manager.ts     # IndexManager: uses StorageProvider for index.md
    log-manager.ts       # LogManager: uses StorageProvider for log.md
    frontmatter.ts       # YAML frontmatter parse/detect/add
    link-parser.ts       # Wikilink extraction and link graph building
  commands/
    init.ts              # wiki init (--backend, --git-token, --viz, --supabase-url, etc.)
    registry.ts          # wiki registry
    use.ts               # wiki use
    read.ts              # wiki read
    write.ts             # wiki write
    append.ts            # wiki append
    list.ts              # wiki list
    search.ts            # wiki search
    index-cmd.ts         # wiki index (add/remove/show)
    log-cmd.ts           # wiki log (append/show)
    lint.ts              # wiki lint
    links.ts             # wiki links
    backlinks.ts         # wiki backlinks
    orphans.ts           # wiki orphans
    status.ts            # wiki status
    skill.ts             # wiki skill (print LLM agent guide)
test/
  init.test.ts           # Config, registry, resolver, templates, init integration
  git.test.ts            # Git operations (commit, log, diff, remote, branch)
  read-write.test.ts     # WikiManager page operations
  storage.test.ts        # StorageProvider factory
  filesystem-provider.test.ts # Filesystem provider contract tests
  git-provider.test.ts   # GitProvider auto-commit tests
  supabase-provider.test.ts # SupabaseProvider with mocked client
  supabase-wiki-pages-probe.test.ts # Schema probe (mocked @supabase/supabase-js)
  git-credentials.test.ts # resolvedGitToken precedence
  github.test.ts         # GitHub API with mocked fetch
  commands.test.ts       # End-to-end CLI command integration tests
docs/
  phase-1.md             # Phase tracking files
  phase-2.md
  phase-3.md
  phase-4.md
  phase-5.md
scripts/
  generate-viz-scripts.ts # Extracts viz build scripts from templates.ts (used by demo workflow)
test-wiki-page/
  wiki/                  # Example wiki pages for live demo on GitHub Pages
    index.md
    log.md
    concepts/
    sources/
    synthesis/
```

## Commands

### Wiki Management
```
wiki init [dir] --name --domain --backend <filesystem|git|supabase>
wiki init [dir] --backend git --git-token <pat> [--git-repo owner/repo]
wiki init [dir] --backend git --no-viz              # Skip visualization scaffolding
wiki init [dir] --backend supabase --supabase-url <url> --supabase-key <key>
wiki init [existing-wiki-dir] --viz                 # Add visualization to existing git wiki
wiki registry                       # List all wikis
wiki use [wiki-id]                  # Set active wiki
```

### Reading & Writing
```
wiki read <path>                    # Print page to stdout
wiki write <path>                   # Write stdin to page
wiki append <path>                  # Append stdin to page
wiki list [dir] [--tree] [--json]   # List pages
wiki search <query> [--limit N] [--json]  # Search pages
```

### Index & Log
```
wiki index show                     # Print master index
wiki index add <path> <summary>     # Add entry to index
wiki index remove <path>            # Remove entry
wiki log show [--last N] [--type T] # Print log entries
wiki log append <type> <message>    # Append log entry
```

### Health & Links
```
wiki lint [--json]                  # Check wiki health (broken links, orphans, frontmatter, index)
wiki links <path>                   # Outbound + inbound links
wiki backlinks <path>               # Inbound links only
wiki orphans                        # Pages with no inbound links
wiki status [--json]                # Wiki overview stats
```

## Architecture

- **StorageProvider pattern**: All page I/O goes through the `StorageProvider` interface (5 methods: readPage, writePage, appendPage, pageExists, listPages). Three implementations:
  - `WikiManager` — filesystem (default)
  - `GitProvider` — wraps WikiManager, auto-commits + auto-pushes on write/append
  - `SupabaseProvider` — pages in Supabase `wiki_pages` table (dynamic import, optional dependency). Nullable `user_id` (NULL = shared scope); with a user JWT, queries filter `user_id = sub`; without, they filter `user_id IS NULL`. `wiki init --backend supabase` calls `probeWikiPagesTable` first; on failure or schema-like seed write errors it prints canonical DDL (PostgreSQL 15+ for `unique nulls not distinct`).
- **Provider factory**: `createProvider(config, root)` in `src/lib/storage.ts`. Async (for dynamic Supabase import). Called once in preAction hook, injected as `ctx.provider`.
- **Commander pattern**: Each command is a factory function (`makeXxxCommand()`) returning a `Command` instance, registered via `program.addCommand()`.
- **preAction hook**: Resolves which wiki to target, creates the StorageProvider, attaches both to `WikiContext`. Commands in `SKIP_RESOLUTION` set (init, registry, use, skill) bypass this.
- **Wiki resolution order**: `--wiki` flag → cwd `.llmwiki.yaml` → walk up directories → registry default.
- **Credentials in config**: Supabase URL/key in `.llmwiki.yaml`. Git stores **`git.repo` only**; PAT comes from `LLMWIKI_GIT_TOKEN`, `GITHUB_TOKEN`, or `GIT_TOKEN` (or legacy optional `git.token` in YAML). No separate auth commands — `wiki init` flags for first-time setup.
- **IndexManager/LogManager**: Accept `StorageProvider` in constructor (not filesystem paths). Backend-agnostic.
- **Registry**: Global at `~/.config/llmwiki/registry.yaml`, overridable via `LLMWIKI_CONFIG_DIR` env var (used in tests).
- **Git**: All operations use `child_process.execFile`, return `{ ok: boolean, output: string }`.
- **GitHub API**: `createRepo`, `getUsername`, `enablePages` in `src/lib/github.ts`. Used by init for auto-creating repos and enabling GitHub Pages.
- **Viz scaffolding**: `wiki init --backend git` scaffolds GitHub Actions workflow + build scripts for d3-force graph visualization deployed to GitHub Pages. Controlled by `--viz` (default true) / `--no-viz`. Re-running `wiki init <dir> --viz` on an existing git wiki adds viz files without overwriting wiki content.
- **No Bun-specific APIs in src/**: Source code uses only Node.js APIs for npm compatibility. Bun APIs are only used in tests.

## Development

```bash
bun install              # Install deps
bun run dev              # Run CLI via source
bun test                 # Run tests (194 tests across 13 files)
bun run build            # Bundle to dist/wiki.js
bun run typecheck        # TypeScript check
```

## Naming

| Aspect | Value |
|--------|-------|
| npm package | `llmwiki-cli` |
| CLI command (primary) | `wiki` |
| CLI command (fallback) | `llmwiki` |
| Config file | `.llmwiki.yaml` |
| Global config dir | `~/.config/llmwiki/` |

## Build Phases

See `docs/phase-{1-5}.md` for detailed tracking. All phases complete:
- Phase 1: **COMPLETE** — init, registry, use
- Phase 2: **COMPLETE** — read, write, append, list, search
- Phase 3: **COMPLETE** — index, log, commit, history, diff
- Phase 4: **COMPLETE** — lint, links, backlinks, orphans, status
- Phase 5: **COMPLETE** — auth, repo, push, pull, sync
- Phase 6: **COMPLETE** — StorageProvider abstraction (filesystem, git, supabase backends)
- Phase 7: **COMPLETE** — GitHub Pages visualization (GitHub Actions workflow, d3-force graph)

## Conventions

- Error messages → stderr (`console.error`), normal output → stdout (`console.log`)
- Exit codes: 0 = success, 1 = error
- All file paths relative to wiki root
- `--json` flag on commands producing structured output
- Git failures during init are warnings, not fatal errors
- Tests use temp directories and `LLMWIKI_CONFIG_DIR` env var for isolation
