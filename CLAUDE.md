# LLM Wiki CLI

## What This Is

A CLI tool that helps LLM agents (Claude Code, Codex, etc.) build and maintain personal knowledge bases. The CLI is the hands — it reads, writes, searches, and manages wiki files. The LLM is the brain — it decides what to create, update, and connect.

**Key principle: The CLI never calls any LLM API. It is a pure filesystem + git tool.**

## Tech Stack

- **Runtime**: Bun (development), Node.js (published bundle)
- **Language**: TypeScript
- **Dependencies**: commander (CLI), js-yaml (YAML parsing)
- **Build**: `bun build` bundles to `dist/wiki.js` targeting Node.js
- **Tests**: Bun test runner (`bun test`)

## Project Structure

```
bin/wiki.ts              # CLI entry point (source)
dist/wiki.js             # Built bundle (npm-published artifact)
src/
  types.ts               # Shared TypeScript interfaces
  lib/
    config.ts            # .llmwiki.yaml read/write
    registry.ts          # Global registry (~/.config/llmwiki/registry.yaml)
    resolver.ts          # Wiki resolution chain (--wiki → cwd → walk up → default)
    git.ts               # Git operations via child_process.execFile
    templates.ts         # Default file content (SCHEMA.md, index.md, log.md)
    picker.ts            # Interactive wiki selection (prompt())
    prompt.ts            # User input prompting (readline wrapper)
    wiki.ts              # WikiManager: read/write/append/list pages
    search.ts            # Full-text search with term-frequency ranking
    index-manager.ts     # IndexManager: add/remove/has entries in index.md
    log-manager.ts       # LogManager: append/show activity log entries
    frontmatter.ts       # YAML frontmatter parse/detect/add
    link-parser.ts       # Wikilink extraction and link graph building
    auth.ts              # GitHub auth (PAT token) persistence
    github.ts            # GitHub API: listRepos, getRepo, createRepo
  commands/
    init.ts              # wiki init
    registry.ts          # wiki registry
    use.ts               # wiki use
    read.ts              # wiki read
    write.ts             # wiki write
    append.ts            # wiki append
    list.ts              # wiki list
    search.ts            # wiki search
    index-cmd.ts         # wiki index (add/remove/show)
    log-cmd.ts           # wiki log (append/show)
    commit.ts            # wiki commit
    history.ts           # wiki history
    diff.ts              # wiki diff
    lint.ts              # wiki lint
    links.ts             # wiki links
    backlinks.ts         # wiki backlinks
    orphans.ts           # wiki orphans
    status.ts            # wiki status
    auth.ts              # wiki auth (login/status/logout)
    repo.ts              # wiki repo (list/create/clone/connect)
    push.ts              # wiki push
    pull.ts              # wiki pull
    sync.ts              # wiki sync
test/
  init.test.ts           # Config, registry, resolver, templates, init integration
  git.test.ts            # Git operations (commit, log, diff, remote, branch)
  read-write.test.ts     # WikiManager page operations
  search.test.ts         # Full-text search
  index-manager.test.ts  # Index entry management
  log-manager.test.ts    # Activity log management
  links.test.ts          # Wikilink extraction and link graph
  lint.test.ts           # Frontmatter and lint checks
  auth.test.ts           # Auth persistence (save/load/clear/getToken)
  github.test.ts         # GitHub API with mocked fetch
  commands.test.ts       # End-to-end CLI command integration tests
docs/
  phase-1.md             # Phase tracking files
  phase-2.md
  phase-3.md
  phase-4.md
  phase-5.md
```

## Commands

### Wiki Management
```
wiki init [dir] --name --domain     # Create new wiki
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
wiki commit [message]               # Git add + commit (auto-message from last log entry)
wiki history [path] [--last N]      # Git log
wiki diff [ref]                     # Git diff
```

### Health & Links
```
wiki lint [--json]                  # Check wiki health (broken links, orphans, frontmatter, index)
wiki links <path>                   # Outbound + inbound links
wiki backlinks <path>               # Inbound links only
wiki orphans                        # Pages with no inbound links
wiki status [--json]                # Wiki overview stats
```

### GitHub Sync
```
wiki auth login                     # Authenticate with GitHub PAT
wiki auth status                    # Show auth status
wiki auth logout                    # Remove credentials
wiki repo list [--all] [--filter]   # List your GitHub repos
wiki repo create <name>             # Create repo + init wiki
wiki repo clone [name] [--dir]      # Clone repo + register
wiki repo connect [wiki-id]         # Connect wiki to new GitHub repo
wiki push                           # Git push
wiki pull                           # Git pull
wiki sync                           # Pull + push
```

## Architecture

- **Commander pattern**: Each command is a factory function (`makeXxxCommand()`) returning a `Command` instance, registered via `program.addCommand()`.
- **preAction hook**: Resolves which wiki to target before command execution. Commands in `SKIP_RESOLUTION` set (init, registry, use, auth) bypass this.
- **Wiki resolution order**: `--wiki` flag → cwd `.llmwiki.yaml` → walk up directories → registry default.
- **Registry**: Global at `~/.config/llmwiki/registry.yaml`, overridable via `LLMWIKI_CONFIG_DIR` env var (used in tests).
- **Git**: All operations use `child_process.execFile`, return `{ ok: boolean, output: string }`.
- **GitHub API**: Uses `fetch` with Bearer token auth. Pagination, error handling for 401/403/422.
- **No Bun-specific APIs in src/**: Source code uses only Node.js APIs for npm compatibility. Bun APIs are only used in tests.

## Development

```bash
bun install              # Install deps
bun run dev              # Run CLI via source
bun test                 # Run tests (192 tests across 11 files)
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

## Conventions

- Error messages → stderr (`console.error`), normal output → stdout (`console.log`)
- Exit codes: 0 = success, 1 = error
- All file paths relative to wiki root
- `--json` flag on commands producing structured output
- Git failures during init are warnings, not fatal errors
- Tests use temp directories and `LLMWIKI_CONFIG_DIR` env var for isolation
