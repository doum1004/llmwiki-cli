# LLM Wiki CLI — AI / agent context

**Audience:** This file is for **AI assistants and coding agents** (instructions, rules, architecture, conventions). **Humans** should use [README.md](README.md) for project overview, installation, badges, and user-oriented examples.

## What this is

A CLI tool that helps LLM agents (Claude Code, Codex, etc.) build and maintain personal knowledge bases. The CLI is the hands — it reads, writes, searches, and manages wiki files. The LLM is the brain — it decides what to create, update, and connect.

**Key principle: The CLI never calls any LLM API. It is a pure storage tool with pluggable backends (filesystem, git).**

## Tech stack

- **Runtime:** Bun (development), Node.js (published bundle)
- **Language:** TypeScript
- **Dependencies:** commander (CLI), js-yaml (YAML parsing)
- **Build:** `bun build` bundles to `dist/index.js` targeting Node.js
- **Tests:** Bun test runner (`bun test`)

## LLM agent skill guide

Run `wiki skill` to print the full guide. **Source of truth** for that text is the `SKILL_GUIDE` string in [`src/commands/skill.ts`](src/commands/skill.ts) — keep it aligned with commands registered in [`src/index.ts`](src/index.ts) and with scaffolded wiki docs in [`src/lib/templates.ts`](src/lib/templates.ts) (e.g. `SCHEMA.md`). End users are also pointed here from README.

## Project structure

```
dist/index.js            # Built bundle (npm-published artifact)
src/
  index.ts               # CLI entry point (source)
  types.ts               # Shared TypeScript interfaces
  lib/
    storage.ts           # StorageProvider factory (createProvider)
    wiki.ts              # WikiManager: filesystem StorageProvider
    git-provider.ts      # GitProvider: filesystem + auto-commit + auto-push
    config.ts            # .llmwiki.yaml read/write
    registry.ts          # Global registry (~/.config/llmwiki/registry.yaml)
    resolver.ts          # Wiki resolution chain (--wiki → cwd → walk up → default)
    profile.ts           # Storage profile resolution (env / CLI / registry / config)
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
    init.ts              # wiki init (--backend, --git-token, --viz)
    registry.ts          # wiki registry
    use.ts                 # wiki use
    profile-cmd.ts       # wiki profile (show / use / clear)
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
  git-credentials.test.ts # resolvedGitToken precedence
  github.test.ts         # GitHub API with mocked fetch
  commands.test.ts       # End-to-end CLI command integration tests
scripts/
  generate-viz-scripts.ts # Extracts viz build scripts from templates.ts (used by demo workflow)
test-wiki-page/
  wiki/                  # Example wiki pages for live demo on GitHub Pages
```

## Commands (registered)

### Wiki management

```
wiki init [dir] --name --domain --backend <filesystem|git>
wiki init [dir] --backend git --git-token <pat> [--git-repo owner/repo]
wiki init [dir] --backend git --no-viz              # Skip visualization scaffolding
wiki init [existing-wiki-dir] --viz                 # Add visualization to existing git wiki
wiki registry                       # List all wikis
wiki use [wiki-id]                  # Set active wiki
wiki profile show | use <slug> | clear   # Storage profile under profiles/<slug>/
```

### Reading and writing

```
wiki read <path>
wiki write <path>                   # stdin → page
wiki append <path>                 # stdin appended
wiki list [dir] [--tree] [--json]
wiki search <query> [--limit N] [--all] [--json]
```

### Index and log

```
wiki index show | add <path> <summary> | remove <path>
wiki log show [--last N] [--type T] | append <type> <message>
```

### Health and links

```
wiki lint [--json]
wiki links <path>
wiki backlinks <path>
wiki orphans
wiki status [--json]
```

### Agent help

```
wiki skill                          # Print LLM agent skill guide (source: skill.ts)
```

There are **no** top-level `wiki auth`, `wiki repo`, `wiki push`, `wiki pull`, `wiki sync`, `wiki commit`, `wiki history`, or `wiki diff` commands. Git remote sync for the **git** backend happens inside `GitProvider` on successful `write` / `append` when repo and token are configured.

## Architecture

- **StorageProvider pattern:** All page I/O goes through the `StorageProvider` interface (`readPage`, `writePage`, `appendPage`, `pageExists`, `listPages`). Implementations: `WikiManager` (filesystem), `GitProvider` (wraps wiki root + optional auto push).
- **Provider factory:** `createProvider(config, root, options?)` in `src/lib/storage.ts`. Async. Injected as `ctx.provider` after wiki resolution.
- **Commander:** Each command is a factory `makeXxxCommand()` registered on the program. `preAction` resolves wiki, builds provider, attaches `WikiContext` (includes `storageScope` for profiles).
- **SKIP_RESOLUTION:** `init`, `registry`, `use`, `skill` bypass wiki context. Exception: `profile use` runs under `profile` and **does** require resolution (see hook in `src/index.ts`).
- **Wiki resolution order:** `--wiki` flag → cwd `.llmwiki.yaml` → walk up directories → registry default.
- **Credentials:** Git stores `git.repo` only; PAT from `LLMWIKI_GIT_TOKEN`, `GITHUB_TOKEN`, or `GIT_TOKEN` (or legacy optional `git.token` in YAML).
- **Registry:** `~/.config/llmwiki/registry.yaml`, overridable with `LLMWIKI_CONFIG_DIR` (used in tests).
- **Git:** `child_process.execFile`. **GitHub API:** `createRepo`, `getUsername`, `enablePages` in `src/lib/github.ts` for init.
- **Viz:** Git init can scaffold GitHub Actions + d3-force graph for Pages (`--viz` default / `--no-viz`).

## Development

```bash
bun install              # Install deps
bun run dev              # Run CLI via source
bun test                 # Run tests
bun run build            # Bundle to dist/index.js
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

## Shipped capabilities (high level)

Use [CHANGELOG.md](CHANGELOG.md) for release-by-release detail. In the tree today: init/registry/use/profile; read/write/append/list/search; index/log; lint/links/backlinks/orphans/status; skill; filesystem and git backends with optional `profiles/<slug>/`; GitHub Pages viz scaffolding for git wikis.

## Conventions

- Error messages → stderr (`console.error`), normal output → stdout (`console.log`)
- Exit codes: 0 = success, 1 = error
- All file paths relative to wiki root
- `--json` flag on commands producing structured output
- Git failures during init are warnings, not fatal errors
- Tests use temp directories and `LLMWIKI_CONFIG_DIR` env var for isolation
- **No Bun-specific APIs in `src/`** — Node-compatible; Bun only in tests and dev script
