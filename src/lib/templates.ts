import type { WikiConfig } from "../types.ts";

export function getDefaultConfig(name: string, domain: string): WikiConfig {
  return {
    name,
    domain,
    created: new Date().toISOString(),
    paths: {
      raw: "raw",
      wiki: "wiki",
      schema: "SCHEMA.md",
    },
  };
}

export function getDefaultSchema(name: string, domain: string): string {
  return `# ${name} — ${domain} Knowledge Base

## Wiki Structure

\`\`\`
raw/                  # Immutable source documents (paste originals here)
  assets/             # Downloaded images and files
wiki/                 # LLM-generated pages (all knowledge lives here)
  index.md            # Master index of all pages
  log.md              # Chronological activity log
  entities/           # People, orgs, products
  concepts/           # Ideas, frameworks, theories
  sources/            # One summary per ingested source
  synthesis/          # Cross-cutting analysis
\`\`\`

## Page Format

Every wiki page should use YAML frontmatter:

\`\`\`markdown
---
title: Page Title
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [tag1, tag2]
source: URL or description
---

Page content here. Use [[wikilinks]] to connect pages.
\`\`\`

## Wikilink Syntax

- \`[[page-name]]\` — links to a page (resolved by filename across all wiki directories)
- \`[[page-name|Display Text]]\` — link with custom display text

## CLI Commands

### Wiki Management
\`\`\`bash
wiki init [dir] --name <name> --domain <domain>   # Create new wiki
wiki registry                                       # List all wikis
wiki use [wiki-id]                                  # Set active wiki
\`\`\`

### Reading & Writing
\`\`\`bash
wiki read <path>                                    # Print page to stdout
wiki write <path> <<'EOF'                           # Write page (create/overwrite)
content here
EOF
wiki append <path> <<'EOF'                          # Append to page
additional content
EOF
wiki list [dir] [--tree] [--json]                   # List pages
wiki search <query> [--limit N] [--all] [--json]    # Search pages
\`\`\`

### Index & Log
\`\`\`bash
wiki index show                                     # Print master index
wiki index add <path> <summary>                     # Add entry to index
wiki index remove <path>                            # Remove entry from index
wiki log show [--last N] [--type T]                 # Print log entries
wiki log append <type> <message>                    # Append log entry
\`\`\`

### Git Operations
\`\`\`bash
wiki commit [message]                               # Git add + commit
wiki history [path] [--last N]                      # Git log
wiki diff [ref]                                     # Git diff
\`\`\`

### Health & Links
\`\`\`bash
wiki lint [--json]                                  # Health check
wiki links <path>                                   # Outbound + inbound links
wiki backlinks <path>                               # Inbound links only
wiki orphans                                        # Pages with no inbound links
wiki status [--json]                                # Wiki overview stats
\`\`\`

### GitHub Sync
\`\`\`bash
wiki auth login                                     # GitHub device flow auth
wiki push                                           # Git push
wiki pull                                           # Git pull
wiki sync                                           # Pull + push
\`\`\`

## Ingest Workflow

When ingesting a new source:

1. Save the raw source to \`raw/\` (paste full text, keep immutable)
2. Create a source summary page in \`wiki/sources/\`
3. Extract entities → create/update pages in \`wiki/entities/\`
4. Extract concepts → create/update pages in \`wiki/concepts/\`
5. If cross-cutting insights emerge → create \`wiki/synthesis/\` pages
6. Update \`wiki/index.md\` with new entries
7. Append to \`wiki/log.md\` with ingest activity
8. Commit: \`wiki commit "ingest: <source description>"\`

## Query Workflow

When answering a question using the wiki:

1. \`wiki search "<query terms>"\` to find relevant pages
2. \`wiki read <path>\` to read promising results
3. Follow [[wikilinks]] to gather connected knowledge
4. Synthesize answer from wiki content
5. Log the query: \`wiki log append query "<question summary>"\`

## Lint Workflow

Periodically check wiki health:

1. \`wiki lint\` to find issues (broken links, orphans, missing frontmatter)
2. Fix broken links by creating missing pages or updating references
3. Connect orphan pages by adding wikilinks from related pages
4. Add frontmatter to pages missing it
5. Commit fixes: \`wiki commit "maintenance: fix lint issues"\`

## Conventions

1. File names use kebab-case: \`my-topic-name.md\`
2. One topic per file. Split large topics into sub-topics.
3. Always update index.md when adding/removing pages.
4. Always append to log.md when making changes.
5. Use [[wikilinks]] to connect related pages.
6. Prefer concrete examples over abstract descriptions.
7. Include the source of knowledge when possible.
8. Use callouts for important notes:
   - \`> [!NOTE]\` for general notes
   - \`> [!WARNING]\` for contradictions or caveats
   - \`> [!TIP]\` for best practices
`;
}

export function getDefaultIndex(): string {
  return `# Index

## Sources

## Entities

## Concepts

## Synthesis
`;
}

export function getDefaultLog(): string {
  const now = new Date().toISOString().replace("T", " ").replace(/\.\d+Z$/, "");
  return `# Activity Log

## [${now}] init | Wiki initialized
`;
}
