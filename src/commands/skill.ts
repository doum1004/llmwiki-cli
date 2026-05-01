import { Command } from "commander";

/** Printed by `wiki skill`; canonical agent guide (README points here). Keep aligned with `src/index.ts` and `src/lib/templates.ts` SCHEMA. */
const SKILL_GUIDE = `# llmwiki-cli — LLM Agent Skill Guide

You are operating a wiki CLI that manages markdown knowledge bases. You are the brain (deciding what to create, connect, and update). The CLI is the hands (reading, writing, searching, and managing files). The CLI never calls any LLM API — it is a pure filesystem tool.

## Storage

- **Local files**: Pages are \`.md\` files under the wiki root. \`wiki init\` creates the directory layout and \`.llmwiki.yaml\`; there is no built-in Git or cloud sync.
- **Git / visualization (optional):** Use normal \`git init\` in the wiki root if you want version control. For an interactive link graph on GitHub Pages, copy the workflow and \`scripts/\` from the llmwiki-cli repo (see README: optional viz drop-in).

## Critical Patterns

### \`wiki write\` uses JSON on stdin

Pipe **one JSON object** (not markdown). The CLI validates fields, writes YAML frontmatter + body, and **upserts** \`wiki/index.md\` for paths under \`wiki/\` (except \`wiki/index.md\`).

Allowed keys: \`title\`, \`content\` (required strings); optional \`description\`, \`tags\` (string array), \`source\` (valid URL string), \`created\`, \`updated\` (ISO dates — normalized to YYYY-MM-DD). Unknown keys are rejected.

On **edit**, \`created\` is always taken from the existing file when present; otherwise defaults or your JSON value applies. \`updated\` defaults to today unless you pass it.

\`\`\`bash
wiki write wiki/concepts/attention.md <<'EOF'
{
  "title": "Attention",
  "description": "Core mechanism in transformers",
  "tags": ["transformers", "NLP"],
  "source": "https://arxiv.org/abs/1706.03762",
  "content": "# Attention\\n\\nContent and [[wikilinks]] here."
}
EOF
\`\`\`

To **change** a page: \`wiki read <path>\` → edit in your context → \`wiki write\` with the full JSON (there is no \`append\` command).

### \`wiki read\` returns stored markdown

Output is the file on disk (frontmatter + body), not JSON.

### Paths are relative to wiki root

\`\`\`bash
wiki read wiki/concepts/attention.md      # correct
wiki read /home/user/my-wiki/wiki/concepts/attention.md  # wrong
\`\`\`

### Wikilinks

- \`[[page-name]]\` — resolved by filename across all wiki directories
- \`[[page-name|Display Text]]\` — link with custom display text
- Resolution order: exact path → wiki/ prefix → subdirectories → filename match anywhere

### Page format

The CLI emits YAML frontmatter from JSON; body is your \`content\` string unchanged.

### File naming

- Use kebab-case: \`my-topic-name.md\`
- One topic per file — split large topics into sub-pages

### Directory structure

\`\`\`
raw/                  # Immutable source documents (paste originals here)
  assets/             # Downloaded images and files
wiki/                 # LLM-generated pages (all knowledge lives here)
  index.md            # Master index — updated by wiki write / delete
  entities/           # People, orgs, products
  concepts/           # Ideas, frameworks, theories
  sources/            # One summary per ingested source
  synthesis/          # Cross-cutting analysis
\`\`\`

## Workflows

### Ingest a source

\`\`\`bash
# 1. Raw capture (optional — plain markdown, no index upsert unless under wiki/)
wiki write raw/paper.txt <<'EOF'
{"title":"paper-full","content":"Full text…"}
EOF

# 2. Structured wiki page (JSON) — index line uses title
wiki write wiki/sources/paper.md <<'EOF'
{"title":"Attention Is All You Need","tags":["transformers"],"source":"https://arxiv.org/abs/1706.03762","content":"## Summary\\n…"}
EOF
\`\`\`

### Answer a question using the wiki

\`\`\`bash
wiki search "attention mechanism"
wiki read wiki/concepts/attention.md
wiki links wiki/concepts/attention.md
\`\`\`

### Maintain wiki health

\`\`\`bash
wiki lint
wiki orphans
wiki status
\`\`\`

### Multi-wiki operations

\`\`\`bash
wiki registry
wiki use ml
wiki --wiki personal read wiki/index.md
wiki search "neural networks" --all
\`\`\`

## Command Reference

### Wiki Management

| Command | Description |
|---------|-------------|
| \`wiki init [dir] --name <n> --domain <d>\` | Create new wiki (local markdown only) |
| \`wiki registry\` | List all registered wikis |
| \`wiki use [wiki-id]\` | List wikis or set active wiki |

### Reading & Writing

| Command | Description |
|---------|-------------|
| \`wiki read <path>\` | Print page markdown to stdout |
| \`wiki write <path>\` | JSON on stdin → frontmatter + body; upserts index for \`wiki/*\` paths |
| \`wiki delete <path>\` | Delete page file and remove from \`wiki/index.md\` |
| \`wiki list [dir] [--tree] [--json]\` | List pages |
| \`wiki search <query> [-l N] [--all] [--json]\` | Full-text search |

### Health & Links

| Command | Description |
|---------|-------------|
| \`wiki lint [--json]\` | Broken links, orphans, missing frontmatter, index consistency |
| \`wiki links <path>\` | Outbound + inbound links |
| \`wiki backlinks <path>\` | Inbound links only |
| \`wiki orphans\` | Pages with no inbound links |
| \`wiki status [--json]\` | Wiki overview: page counts, link stats |

## Gotchas

1. **\`wiki write\` reads JSON from stdin** — use a heredoc or pipe; passing a path as the only argument will hang waiting for stdin.

2. **Strict JSON** — unknown keys error; \`source\` must be a valid URL when present.

3. **Wiki resolution** — if commands fail with "No wiki found", either \`cd\` into a wiki directory, run \`wiki use <id>\`, or pass \`--wiki <id>\`.

4. **search --all** searches across all registered wikis.

5. **lint** skips structural \`wiki/index.md\` for frontmatter/body checks; it still checks index consistency for other \`wiki/*.md\` pages.

6. **Re-running init** — if \`.llmwiki.yaml\` already exists, \`wiki init\` exits with an error.
`;

export function makeSkillCommand(): Command {
  return new Command("skill")
    .description("Print the LLM agent skill guide")
    .action(() => {
      console.log(SKILL_GUIDE);
    });
}
