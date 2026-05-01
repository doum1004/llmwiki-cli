# Changelog

<!-- New entries are prepended automatically by the publish workflow -->

=======

## v1.0.0 — 2026-04-30

### Breaking

- **`wiki write`** now expects **JSON on stdin** (not markdown). Required keys: `title`, `content`. Optional: `description`, `tags`, `source` (valid URL), `created`, `updated` (ISO dates). Unknown keys are rejected. The command writes YAML frontmatter plus the body from `content`, and **upserts** `wiki/index.md` for paths under `wiki/` (except `wiki/index.md`).
- Removed **`wiki append`**, **`wiki index`**, **`wiki log`**, and **`wiki profile`**. Removed **`wiki/log.md`** from `wiki init`. No activity log feature.
- **Storage profiles removed:** no `--profile`, no `LLMWIKI_PROFILE`, no `profile` in `.llmwiki.yaml`, no `profiles/<slug>/` roots in the CLI, no `storageProfiles` in the registry. All pages are read/written under the wiki root. Users who used profiles must move files out of `profiles/<slug>/` manually.
- **`wiki status`** JSON no longer includes `recentActivity`.

### Added

- **`wiki delete <path>`** deletes the page file and removes its line from `wiki/index.md` when present.
- **`StorageProvider.deletePage`** / **`WikiManager.deletePage`**.

---

## v0.3.1 — 2026-04-30

### Changes

- refactor: enhance wiki write command with index and log options (2eaafc0)
- refactor: remove Git backend support and related code (4f07b6a)
- Refactor wiki CLI structure and documentation (1a85663)
- Update README with star history and visitor badge (799d069)

**Full diff:** [v0.2.3...v0.3.1](https://github.com/doum1004/llmwiki-cli/compare/v0.2.3...v0.3.1)

---

## v0.3.0 — 2026-04-30

### Breaking

- Remove the **git storage backend** (`GitProvider`), GitHub API usage, and all `wiki init` flags for `--backend`, `--git-token`, `--git-repo`, `--viz`, and `--no-viz`. `wiki init` only creates local markdown layout; it exits with an error if `.llmwiki.yaml` already exists in the target directory.
- Remove `backend` and `git` from `WikiConfig` (older YAML may still contain them; they are ignored).
- Remove git-related libraries (`git.ts`, `github.ts`, `git-credentials.ts`, `git-provider.ts`) and their tests.
- `wiki status` no longer includes a `git` field in JSON or human output.

### Changes

- README documents **optional GitHub Pages visualization** as a manual drop-in (copy workflow + scripts from this repo or regenerate via `scripts/generate-viz-scripts.ts`).

---

## v0.2.3 — 2026-04-15

### Changes

- Refactor storage backend: Remove Supabase support and related code (cf0bf05)

**Full diff:** [v0.2.2...v0.2.3](https://github.com/doum1004/llmwiki-cli/compare/v0.2.2...v0.2.3)

---

## v0.2.2 — 2026-04-13

### Changes

- feat: add frontmatter extraction and activity log parsing to templates (901d063)
- Add foundational concepts and entities related to LLMs and AI agents (b19bd2e)
- feat: enhance git integration and improve wiki initialization (51b4ce6)
- feat: add support for storage profiles in wiki commands and providers (3082a07)
- feat: add npm install and uninstall commands to permissions, and improve Supabase initialization logic (bd0107a)
- feat: add GitHub Pages visualization support with scaffolding options for git backend (63de75a)

**Full diff:** [v0.2.1...v0.2.2](https://github.com/doum1004/llmwiki-cli/compare/v0.2.1...v0.2.2)

---


## v0.2.1 — 2026-04-11

### Changes

- refactor: remove deprecated commands and authentication logic (bf2ddb1)
- feat: implement tests for SupabaseProvider and GitProvider, and refactor StorageProvider tests (0d62175)
- refactor: remove Git backend commands from documentation (a346a2f)
- feat: update documentation to reflect StorageProvider abstraction and backend options (d0d4f23)
- feat: add Supabase backend support for wiki storage and commands (5ed99c7)
- feat: implement Git backend support for wiki storage and commands (9e8f913)
- Refactor storage management and command handling (2a591b6)

**Full diff:** [v0.1.5...v0.2.1](https://github.com/doum1004/llmwiki-cli/compare/v0.1.5...v0.2.1)

---


## v0.1.5 — 2026-04-11

### Changes

- feat: add Git author and committer environment variables to runWiki function (3157fbe)
- feat: add skill command to print LLM agent skill guide and update documentation references (a6df78d)
- feat: add LLM Agent Skill Guide for improved CLI usage reference (65d9196)
- feat: add npm test command to settings and update test count in README (2fe13f4)
- Add comprehensive tests for Git operations, GitHub API interactions, and WikiManager functionality (cf49167)
- feat: enhance error handling and conflict resolution in git commands (d74498f)
- feat: enhance git commands to use current branch for pull and push operations (987dc62)
- fix: update context retrieval in index and log commands to use optsWithGlobals directly (e8df760)
- feat: implement promptUser function for user input handling in authentication and repository commands (c01191d)
- feat: add GitHub CLI permissions for repository management and authentication (86ca9f0)
- Update README.md (f332b54)

**Full diff:** [v0.1.4...v0.1.5](https://github.com/doum1004/llmwiki-cli/compare/v0.1.4...v0.1.5)

---


## v0.1.4 — 2026-04-10

### Changes

- feat: add MIT license file and specify license in package.json (140b224)
- fix: correct punctuation and enhance README clarity (3e6dfca)
- Phase 5: GitHub Auth + Repo Management (58a1261)

**Full diff:** [v0.1.3...v0.1.4](https://github.com/doum1004/llmwiki-cli/compare/v0.1.3...v0.1.4)

---


## v0.1.3 — 2026-04-10

### Changes

- Phase 4: Lint + Links + Status (6b05447)

**Full diff:** [v0.1.2...v0.1.3](https://github.com/doum1004/llmwiki-cli/compare/v0.1.2...v0.1.3)

---


## v0.1.2 — 2026-04-10

### Changes

- Phase 3: Index + Log + Git Commands (b23e8c0)
- Phase 2: Read + Write + List + Search (f9c8d47)

**Full diff:** [v0.1.1...v0.1.2](https://github.com/doum1004/llmwiki-cli/compare/v0.1.1...v0.1.2)

---


## v0.1.1 — 2026-04-10

### Changes

- Add settings.local.json with permissions configuration (c3c161b)
- Update README and package.json with additional metadata and badges (7ef1378)
- Add CI, publish workflow, funding, and changelog (3e788ce)
- Phase 1: Bootstrap + Init + Registry (6a8b9a5)


---

