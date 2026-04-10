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
  commands/
    init.ts              # wiki init
    registry.ts          # wiki registry
    use.ts               # wiki use
test/
  init.test.ts           # Phase 1 tests (23 tests)
docs/
  phase-1.md             # Phase tracking files
  phase-2.md
  phase-3.md
  phase-4.md
  phase-5.md
```

## Commands

```
wiki init [dir] --name --domain     # Create new wiki
wiki registry                       # List all wikis
wiki use [wiki-id]                  # Set active wiki
```

Phases 2-5 add: read/write/search, index/log/commit, lint/links/status, GitHub sync.

## Architecture

- **Commander pattern**: Each command is a factory function (`makeXxxCommand()`) returning a `Command` instance, registered via `program.addCommand()`.
- **preAction hook**: Resolves which wiki to target before command execution. Commands in `SKIP_RESOLUTION` set (init, registry, use) bypass this.
- **Wiki resolution order**: `--wiki` flag → cwd `.llmwiki.yaml` → walk up directories → registry default.
- **Registry**: Global at `~/.config/llmwiki/registry.yaml`, overridable via `LLMWIKI_CONFIG_DIR` env var (used in tests).
- **Git**: All operations use `child_process.execFile`, return `{ ok: boolean, output: string }`.
- **No Bun-specific APIs in src/**: Source code uses only Node.js APIs for npm compatibility. Bun APIs are only used in tests.

## Development

```bash
bun install              # Install deps
bun run dev              # Run CLI via source
bun test                 # Run tests
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

See `docs/phase-{1-5}.md` for detailed tracking. Current status:
- Phase 1: **COMPLETE** — init, registry, use
- Phase 2: **COMPLETE** — read, write, append, list, search
- Phase 3: **COMPLETE** — index, log, commit, history, diff
- Phase 4: Not started — lint, links, backlinks, orphans, status
- Phase 5: Not started — auth, repo, push, pull, sync

## Conventions

- Error messages → stderr (`console.error`), normal output → stdout (`console.log`)
- Exit codes: 0 = success, 1 = error
- All file paths relative to wiki root
- `--json` flag on commands producing structured output
- Git failures during init are warnings, not fatal errors
