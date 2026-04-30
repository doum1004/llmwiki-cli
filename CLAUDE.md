# LLM Wiki CLI — AI / agent context

**Audience:** This file is for **AI assistants and coding agents** (instructions, rules, architecture, conventions). **Humans** should use [README.md](README.md) for project overview, installation, badges, and user-oriented examples.

## What this is

A CLI tool that helps LLM agents (Claude Code, Codex, etc.) build and maintain personal knowledge bases. The CLI is the hands — it reads, writes, searches, and manages wiki files. The LLM is the brain — it decides what to create, update, and connect.

**Key principle: The CLI never calls any LLM API. It is a pure filesystem tool: markdown under the wiki root via `StorageProvider` / `WikiManager`.**

**Index and log:** Prefer `wiki write … --from-frontmatter` when creating pages that already have YAML `title`. Keep `wiki index` / `wiki log` for `index remove`, `show`, `log append` without writing a page, and other cases called out in `wiki skill`.

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
    storage.ts           # StorageProvider factory (createProvider → WikiManager)
    wiki.ts              # WikiManager: filesystem StorageProvider
    config.ts            # .llmwiki.yaml read/write
    registry.ts          # Global registry (~/.config/llmwiki/registry.yaml)
    resolver.ts          # Wiki resolution chain (--wiki → cwd → walk up → default)
    profile.ts           # Storage profile resolution (env / CLI / registry / config)
    templates.ts         # Default file content (SCHEMA.md, index.md, log.md; optional viz workflow/scripts for drop-in)
    search.ts            # Full-text search with term-frequency ranking
    index-manager.ts     # IndexManager: uses StorageProvider for index.md
    log-manager.ts       # LogManager: uses StorageProvider for log.md
    frontmatter.ts       # YAML frontmatter parse/detect/add
    link-parser.ts       # Wikilink extraction and link graph building
  commands/
    init.ts              # wiki init (--name, --domain)
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
  read-write.test.ts     # WikiManager page operations
  storage.test.ts        # StorageProvider factory
  filesystem-provider.test.ts # Filesystem provider contract tests
  commands.test.ts       # End-to-end CLI command integration tests
scripts/
  generate-viz-scripts.ts # Extracts viz build scripts from templates.ts (used by demo workflow)
test-wiki-page/
  wiki/                  # Example wiki pages for live demo on GitHub Pages
```

## Commands (registered)

### Wiki management

```
wiki init [dir] --name --domain       # Create wiki (local files only)
wiki registry                       # List all wikis
wiki use [wiki-id]                  # Set active wiki
wiki profile show | use <slug> | clear   # Storage profile under profiles/<slug>/
```

### Reading and writing

```
wiki read <path>
wiki write <path> [--index-summary <s>] [--log-type <t> [--log-message <m>]] [--from-frontmatter]  # stdin → page; optional index + log; YAML title fills gaps when flag set
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

There are **no** top-level `wiki auth`, `wiki repo`, `wiki push`, `wiki pull`, `wiki sync`, `wiki commit`, `wiki history`, or `wiki diff` commands. Version control is out of scope: users run `git` themselves if they want it.

## Architecture

- **StorageProvider pattern:** All page I/O goes through the `StorageProvider` interface (`readPage`, `writePage`, `appendPage`, `pageExists`, `listPages`). Implementation: `WikiManager` (filesystem).
- **Provider factory:** `createProvider(config, root, options?)` in `src/lib/storage.ts` returns `WikiManager` at `effectiveFilesystemRoot`. Injected as `ctx.provider` after wiki resolution.
- **Commander:** Each command is a factory `makeXxxCommand()` registered on the program. `preAction` resolves wiki, builds provider, attaches `WikiContext` (includes `storageScope` for profiles).
- **SKIP_RESOLUTION:** `init`, `registry`, `use`, `skill` bypass wiki context. Exception: `profile use` runs under `profile` and **does** require resolution (see hook in `src/index.ts`).
- **Wiki resolution order:** `--wiki` flag → cwd `.llmwiki.yaml` → walk up directories → registry default.
- **Registry:** `~/.config/llmwiki/registry.yaml`, overridable with `LLMWIKI_CONFIG_DIR` (used in tests).
- **Optional viz (GitHub Pages):** Not part of `wiki init`. README documents copying workflow + `scripts/` from this repo into a git-managed wiki directory.

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

Use [CHANGELOG.md](CHANGELOG.md) for release-by-release detail. In the tree today: init/registry/use/profile; read/write/append/list/search; index/log; lint/links/backlinks/orphans/status; skill; filesystem storage with optional `profiles/<slug>/`; optional Pages viz as documented drop-in assets in `templates.ts` / README.

## Conventions

- Error messages → stderr (`console.error`), normal output → stdout (`console.log`)
- Exit codes: 0 = success, 1 = error
- All file paths relative to wiki root
- `--json` flag on commands producing structured output
- `wiki init` exits with an error if `.llmwiki.yaml` already exists in the target directory
- Tests use temp directories and `LLMWIKI_CONFIG_DIR` env var for isolation
- **No Bun-specific APIs in `src/`** — Node-compatible; Bun only in tests and dev script
