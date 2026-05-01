---
title: SCHEMA
created: 2026-04-30
updated: 2026-04-30
tags: [meta, documentation]
---

# llmwiki-demo — documentation

Example knowledge base for the [llmwiki-cli](https://github.com/doum1004/llmwiki-cli) live demo (GitHub Pages graph). The CLI never calls an LLM; it only reads and writes files under this directory.

## Layout

```
raw/                  # Immutable originals (papers, dumps); optional
  assets/
wiki/
  index.md            # Master index (wikilink list; updated by wiki write / delete)
  entities/ concepts/ sources/ synthesis/
SCHEMA.md             # This file
.llmwiki.yaml         # Wiki metadata
```

## Writing pages (CLI v1+)

Use **`wiki write <path>`** with **JSON on stdin** — not raw markdown. Required keys: `title`, `content`. Optional: `description`, `tags`, `source` (URL), `created`, `updated` (ISO dates). The CLI emits YAML frontmatter plus your markdown body and upserts **`wiki/index.md`** for paths under `wiki/` (except `wiki/index.md`).

```bash
wiki write wiki/concepts/example.md <<'EOF'
{
  "title": "Example",
  "tags": ["demo"],
  "content": "# Example\n\nLink to [[agent-loop]] and [[sources/react-paper]]."
}
EOF
```

Edit flow: **`wiki read`** → merge in your agent → **`wiki write`** again with full JSON. There is no append command.

## Wikilinks

In page bodies, links use paired double brackets around a target (see any note under `wiki/`). Targets can be a basename like `agent-loop`, a path prefix such as `sources/react-paper`, or a display override with a pipe. The CLI resolves targets to files under `wiki/**`.

## Commands (summary)

```bash
wiki read <path>
wiki write <path>    # JSON stdin
wiki delete <path>
wiki search "<query>"
wiki lint
wiki links <path>
wiki status
```

Run **`wiki skill`** for the full agent-oriented guide.

## Conventions

- Kebab-case filenames; one main topic per page
- Prefer linking related notes with wikilinks so the graph visualization stays meaningful
