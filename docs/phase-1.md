# Phase 1: Bootstrap + Init + Registry

**Status**: COMPLETE

**Goal**: User can create wikis, register them, and switch between them.

## Files

| File | Status | Description |
|------|--------|-------------|
| `package.json` | Done | npm package config, bin entries, build scripts |
| `tsconfig.json` | Done | Bun-compatible TypeScript config |
| `src/types.ts` | Done | WikiConfig, RegistryEntry, Registry, WikiContext, GlobalOptions |
| `src/lib/config.ts` | Done | .llmwiki.yaml read/write |
| `src/lib/registry.ts` | Done | Global registry CRUD at ~/.config/llmwiki/ |
| `src/lib/resolver.ts` | Done | Wiki resolution chain (--wiki → cwd → walk up → default) |
| `src/lib/templates.ts` | Done | SCHEMA.md, index.md, log.md, config templates |
| `src/lib/git.ts` | Done | Git operations via child_process.execFile |
| `src/lib/picker.ts` | Done | Interactive wiki selection with prompt() |
| `src/commands/init.ts` | Done | `wiki init [dir] --name --domain` |
| `src/commands/registry.ts` | Done | `wiki registry` |
| `src/commands/use.ts` | Done | `wiki use [wiki-id]` |
| `bin/wiki.ts` | Done | CLI entry point with preAction hook |
| `test/init.test.ts` | Done | 23 tests passing |

## Commands Added

```
wiki init [dir] --name <name> --domain <domain>
wiki registry
wiki use [wiki-id]
```

## Tests

- 23 tests, all passing
- Covers: config, registry, resolver, templates, init integration

## Notes

- Source code uses Node.js APIs only (no Bun-specific APIs) for npm compatibility
- Bundle built with `bun build --target node` to `dist/wiki.js`
- Git failures during init are treated as warnings, not fatal errors
- First registered wiki automatically becomes the default
- `LLMWIKI_CONFIG_DIR` env var overrides config location (used in tests)
