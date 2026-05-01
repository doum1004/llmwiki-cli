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
  index.md            # Master index of all pages (updated by wiki write)
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
wiki init [dir] --name <name> --domain <domain>      # Create new wiki (local files only)
wiki registry                                       # List all wikis
wiki use [wiki-id]                                  # Set active wiki
\`\`\`

### Reading & Writing
\`\`\`bash
wiki read <path>                                    # Print page markdown to stdout
wiki write <path> <<'JSON'                          # JSON on stdin → YAML frontmatter + body; upserts wiki/index.md
{"title":"…","content":"…"}
JSON
wiki delete <path>                                  # Delete page and remove from index
wiki list [dir] [--tree] [--json]                   # List pages
wiki search <query> [--limit N] [--all] [--json]    # Search pages
\`\`\`

### Version control and visualization (optional)
Use normal Git in your wiki directory if you want history and remotes. For an interactive link graph on GitHub Pages, copy the workflow and \`scripts/\` files from the llmwiki-cli repository (see project README: optional viz drop-in).

### Health & Links
\`\`\`bash
wiki lint [--json]                                  # Health check
wiki links <path>                                   # Outbound + inbound links
wiki backlinks <path>                               # Inbound links only
wiki orphans                                        # Pages with no inbound links
wiki status [--json]                                # Wiki overview stats
\`\`\`

## Ingest Workflow

When ingesting a new source:

1. Save the raw source to \`raw/\` (paste full text, keep immutable)
2. Create a source summary page in \`wiki/sources/\`
3. Extract entities → create/update pages in \`wiki/entities/\`
4. Extract concepts → create/update pages in \`wiki/concepts/\`
5. If cross-cutting insights emerge → create \`wiki/synthesis/\` pages
6. For each new or updated page under \`wiki/\`, use \`wiki write <path>\` with JSON on stdin — the CLI writes YAML frontmatter plus body and **upserts** \`wiki/index.md\` automatically.
7. Version changes with Git or another tool outside the CLI if you need history

## Query Workflow

When answering a question using the wiki:

1. \`wiki search "<query terms>"\` to find relevant pages
2. \`wiki read <path>\` to read promising results
3. Follow [[wikilinks]] to gather connected knowledge
4. Synthesize answer from wiki content
5. Optional: track queries in your own notes outside the CLI (there is no activity log command).

## Lint Workflow

Periodically check wiki health:

1. \`wiki lint\` to find issues (broken links, orphans, missing frontmatter)
2. Fix broken links by creating missing pages or updating references
3. Connect orphan pages by adding wikilinks from related pages
4. Add frontmatter to pages missing it
5. Re-run \`wiki lint\` until clean

## Conventions

1. File names use kebab-case: \`my-topic-name.md\`
2. One topic per file. Split large topics into sub-topics.
3. Adding or updating pages under \`wiki/\` via \`wiki write\` keeps \`wiki/index.md\` in sync; use \`wiki delete\` when removing pages.
4. Use [[wikilinks]] to connect related pages.
5. Prefer concrete examples over abstract descriptions.
6. Include the source of knowledge when possible.
7. Use callouts for important notes:
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

export function getVizWorkflow(): string {
  return `name: Build Wiki Visualization

on:
  push:
    branches: [main, master]

permissions:
  pages: write
  id-token: write
  contents: read

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Build graph data
        run: node scripts/build-graph.js
      - name: Build site
        env:
          GITHUB_REPOSITORY: \${{ github.repository }}
        run: node scripts/build-site.js
      - name: Configure Pages
        uses: actions/configure-pages@v5
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
`;
}

export function getBuildGraphScript(): string {
  return `const fs = require("fs");
const path = require("path");

const WIKILINK_RE = /\\[\\[([^\\]|]+)(?:\\|[^\\]]+)?\\]\\]/g;
const WIKI_DIR = process.env.WIKI_DIR || "wiki";
const OUT_DIR = "dist";

function findMdFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findMdFiles(full));
    } else if (entry.name.endsWith(".md")) {
      results.push(full);
    }
  }
  return results;
}

function extractTitle(content, filePath) {
  const match = content.match(/^#\\s+(.+)$/m);
  if (match) return match[1].trim();
  return path.basename(filePath, ".md").replace(/-/g, " ");
}

function stripFrontmatter(content) {
  const m = content.match(/^---\\r?\\n[\\s\\S]*?\\r?\\n---\\r?\\n/);
  if (m) return content.slice(m[0].length).trim();
  return content.trim();
}

function extractFrontmatterField(content, field) {
  const m = content.match(/^---\\r?\\n([\\s\\S]*?)\\r?\\n---/);
  if (!m) return null;
  const line = m[1].split(/\\r?\\n/).find((l) => l.startsWith(field + ":"));
  if (!line) return null;
  return line.slice(field.length + 1).trim().replace(/^['"]|['"]$/g, "") || null;
}

function parseLogEntries(wikiDir) {
  const logPath = path.join(wikiDir, "log.md");
  if (!fs.existsSync(logPath)) return [];
  const content = fs.readFileSync(logPath, "utf-8");
  const entries = [];
  const re = /##\\s+\\[([^\\]]+)\\]\\s+([^|]+)\\|\\s*(.+)/g;
  let match;
  while ((match = re.exec(content)) !== null) {
    entries.push({ time: match[1].trim(), type: match[2].trim(), message: match[3].trim() });
  }
  return entries;
}

const wikiPrefix = WIKI_DIR.replace(/\\\\/g, "/").replace(/\\/$/, "") + "/";

function resolveLink(target, allFiles) {
  const withMd = target.endsWith(".md") ? target : target + ".md";
  const candidates = allFiles.map((f) => f.replace(/\\\\/g, "/"));

  if (candidates.includes(withMd)) return withMd;

  const withWiki = wikiPrefix + withMd;
  if (candidates.includes(withWiki)) return withWiki;

  const subdirs = ["entities", "concepts", "sources", "synthesis"];
  for (const sub of subdirs) {
    const candidate = wikiPrefix + sub + "/" + withMd;
    if (candidates.includes(candidate)) return candidate;
  }

  const basename = withMd.split("/").pop();
  const found = candidates.find((p) => p.endsWith("/" + basename) || p === basename);
  if (found) return found;

  return null;
}

function relDir(filePath) {
  const rel = filePath.replace(/\\\\/g, "/");
  const inner = rel.startsWith(wikiPrefix) ? rel.slice(wikiPrefix.length) : rel;
  const first = inner.split("/")[0];
  return inner.includes("/") ? first : "wiki";
}

const files = findMdFiles(WIKI_DIR);
const nodes = [];
const edges = [];

for (const file of files) {
  const content = fs.readFileSync(file, "utf-8");
  const relPath = file.replace(/\\\\/g, "/");
  const dir = relDir(relPath);
  nodes.push({ id: relPath, title: extractTitle(content, file), dir, body: stripFrontmatter(content), created: extractFrontmatterField(content, "created"), updated: extractFrontmatterField(content, "updated") });

  let match;
  const re = new RegExp(WIKILINK_RE.source, "g");
  while ((match = re.exec(content)) !== null) {
    const resolved = resolveLink(match[1], files.map((f) => f.replace(/\\\\/g, "/")));
    if (resolved) {
      edges.push({ source: relPath, target: resolved });
    }
  }
}

const activity = parseLogEntries(WIKI_DIR);
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(
  path.join(OUT_DIR, "graph.json"),
  JSON.stringify({ nodes, edges, activity }, null, 2)
);
console.log("Graph: " + nodes.length + " nodes, " + edges.length + " edges, " + activity.length + " log entries → dist/graph.json");
`;
}

export function getBuildSiteScript(): string {
  return `const fs = require("fs");
const path = require("path");

const graph = JSON.parse(fs.readFileSync(path.join("dist", "graph.json"), "utf-8"));
const repoTitle = process.env.GITHUB_REPOSITORY || "Wiki";

const html = \`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>\${repoTitle} — wiki mind map</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,700;1,9..144,500&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap" rel="stylesheet">
  <style>
    :root {
      --ink: #0e1117;
      --paper: #f4ede4;
      --paper2: #e8dcc8;
      --wood: #5c3d2e;
      --glow: #7c5cff;
      --synapse: rgba(180, 200, 255, 0.35);
      --panel-w: 300px;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    .viz-root {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      font-family: "Source Serif 4", Georgia, serif;
      color: #e8e4dc;
      background: radial-gradient(120% 80% at 70% 20%, #2a1f4a 0%, #12101c 45%, #0a090f 100%);
      overflow: hidden;
    }
    @keyframes drift {
      0%, 100% { filter: hue-rotate(0deg); }
      50% { filter: hue-rotate(12deg); }
    }
    @media (prefers-reduced-motion: reduce) {
      .viz-root { animation: none; }
    }
    @media (prefers-reduced-motion: no-preference) {
      .viz-root { animation: drift 48s ease-in-out infinite; }
    }
    .viz-header {
      flex-shrink: 0;
      padding: 0.65rem 1.25rem;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      background: linear-gradient(180deg, rgba(20,16,32,0.95), rgba(12,10,20,0.6));
      display: flex;
      align-items: baseline;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .viz-header h1 {
      font-family: Fraunces, Georgia, serif;
      font-size: 1.35rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      color: #faf6f0;
    }
    .viz-header .tagline {
      font-size: 0.88rem;
      opacity: 0.88;
      max-width: 42rem;
      line-height: 1.45;
    }
    .viz-main {
      flex: 1;
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      min-height: 0;
      align-items: stretch;
    }
    @media (max-width: 960px) {
      .viz-main {
        flex-direction: column;
        overflow-y: auto;
      }
    }
    .viz-panel {
      width: var(--panel-w);
      flex-shrink: 0;
      padding: 1rem 1.1rem 1.25rem;
      background: linear-gradient(165deg, var(--paper) 0%, var(--paper2) 100%);
      color: var(--ink);
      border-right: 3px solid var(--wood);
      box-shadow: inset 0 0 40px rgba(92,61,46,0.08);
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    @media (max-width: 960px) {
      .viz-panel {
        width: 100%;
        border-right: none;
        border-bottom: 2px solid var(--wood);
        max-height: none;
      }
    }
    .viz-panel h2 {
      font-family: Fraunces, Georgia, serif;
      font-size: 1rem;
      color: var(--wood);
      margin: 0.75rem 0 0.35rem;
      font-weight: 700;
    }
    .viz-panel h2:first-of-type { margin-top: 0; }
    .viz-panel .blurb {
      font-size: 0.82rem;
      line-height: 1.5;
      margin-bottom: 0.75rem;
      opacity: 0.92;
    }
    .viz-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.4rem 0.6rem;
      font-size: 0.8rem;
      margin-bottom: 0.6rem;
    }
    .viz-stats span { font-variant-numeric: tabular-nums; font-weight: 600; color: var(--wood); }
    .viz-controls { display: flex; flex-direction: column; gap: 0.45rem; margin: 0.5rem 0 0.75rem; }
    .viz-controls input[type="search"] {
      width: 100%;
      padding: 0.4rem 0.5rem;
      border: 1px solid rgba(92,61,46,0.35);
      border-radius: 4px;
      font: inherit;
      background: #fffefb;
    }
    .viz-controls button {
      font-family: inherit;
      font-size: 0.8rem;
      padding: 0.45rem 0.6rem;
      border-radius: 4px;
      border: 1px solid var(--wood);
      background: #fffefb;
      color: var(--wood);
      cursor: pointer;
    }
    .viz-controls button:hover { background: var(--paper2); }
    .viz-legend-row {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.78rem;
      margin: 0.25rem 0;
      line-height: 1.35;
    }
    .viz-legend-row .swatch {
      width: 11px;
      height: 11px;
      border-radius: 50%;
      flex-shrink: 0;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.15);
    }
    .viz-hint {
      font-size: 0.72rem;
      opacity: 0.85;
      margin-top: 0.75rem;
      line-height: 1.45;
      border-top: 1px dashed rgba(92,61,46,0.25);
      padding-top: 0.6rem;
    }
    .viz-canvas-wrap {
      flex: 1 1 28%;
      position: relative;
      min-width: 0;
      min-height: 0;
      background: radial-gradient(ellipse at 50% 40%, rgba(124,92,255,0.12) 0%, transparent 55%);
    }
    @media (max-width: 960px) {
      .viz-canvas-wrap {
        flex: 1 1 auto;
        min-height: 40vh;
        height: 42vh;
      }
    }
    .viz-doc {
      flex: 0 1 46%;
      min-width: min(42rem, 48vw);
      max-width: 52rem;
      display: flex;
      flex-direction: column;
      min-height: 0;
      background: linear-gradient(180deg, #fffefb 0%, var(--paper) 100%);
      color: var(--ink);
      border-left: 3px solid var(--wood);
      box-shadow: -6px 0 24px rgba(0,0,0,0.12);
    }
    @media (max-width: 960px) {
      .viz-doc {
        flex: 1 1 auto;
        min-width: 0;
        max-width: none;
        width: 100%;
        min-height: 35vh;
        border-left: none;
        border-top: 3px solid var(--wood);
        box-shadow: none;
      }
    }
    .viz-doc-head {
      flex-shrink: 0;
      padding: 0.65rem 1rem 0.55rem;
      border-bottom: 1px solid rgba(92,61,46,0.15);
      background: rgba(248,244,236,0.98);
    }
    #readerTitle {
      font-family: Fraunces, Georgia, serif;
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--wood);
      line-height: 1.3;
      display: block;
    }
    #readerPath {
      display: block;
      margin-top: 0.35rem;
      font-size: 0.75rem;
      opacity: 0.78;
      word-break: break-all;
      font-family: ui-monospace, "Cascadia Code", Consolas, monospace;
    }
    .viz-doc-body {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 1rem 1.15rem 1.5rem;
      font-size: 0.95rem;
      line-height: 1.62;
    }
    .viz-reader-empty {
      margin: 0;
      opacity: 0.78;
      font-style: italic;
      font-size: 0.95rem;
    }
    .md-viewer > *:first-child { margin-top: 0; }
    .md-viewer > *:last-child { margin-bottom: 0; }
    .md-viewer h1, .md-viewer h2, .md-viewer h3, .md-viewer h4 {
      font-family: Fraunces, Georgia, serif;
      color: var(--wood);
      margin: 1.1em 0 0.45em;
      line-height: 1.25;
      font-weight: 700;
    }
    .md-viewer h1 { font-size: 1.55rem; }
    .md-viewer h2 { font-size: 1.28rem; }
    .md-viewer h3 { font-size: 1.1rem; }
    .md-viewer h4 { font-size: 1rem; }
    .md-viewer p { margin: 0.65em 0; }
    .md-viewer ul, .md-viewer ol { margin: 0.65em 0; padding-left: 1.35rem; }
    .md-viewer li { margin: 0.25em 0; }
    .md-viewer blockquote {
      margin: 0.75em 0;
      padding: 0.4rem 0.75rem;
      border-left: 4px solid rgba(92,61,46,0.35);
      background: rgba(92,61,46,0.06);
      color: #2a2420;
    }
    .md-viewer a {
      color: #4a3a9e;
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    .md-viewer a:hover { color: var(--glow); }
    .md-viewer hr {
      border: none;
      border-top: 1px solid rgba(92,61,46,0.2);
      margin: 1.25em 0;
    }
    .md-viewer code {
      font-size: 0.88em;
      font-family: ui-monospace, "Cascadia Code", Consolas, monospace;
      background: rgba(92,61,46,0.08);
      padding: 0.12em 0.35em;
      border-radius: 4px;
    }
    .md-viewer pre {
      margin: 0.85em 0;
      padding: 0.75rem 0.85rem;
      overflow-x: auto;
      background: #1e1b26;
      color: #e8e4f0;
      border-radius: 6px;
      font-size: 0.82rem;
      line-height: 1.45;
    }
    .md-viewer pre code {
      background: none;
      padding: 0;
      color: inherit;
      font-size: inherit;
    }
    .md-viewer table {
      border-collapse: collapse;
      width: 100%;
      margin: 0.85em 0;
      font-size: 0.88rem;
    }
    .md-viewer th, .md-viewer td {
      border: 1px solid rgba(92,61,46,0.22);
      padding: 0.35rem 0.5rem;
      text-align: left;
    }
    .md-viewer th {
      background: rgba(92,61,46,0.1);
      font-weight: 600;
    }
    #viz-svg {
      width: 100%;
      height: 100%;
      display: block;
      cursor: grab;
    }
    #viz-svg:active { cursor: grabbing; }
    .tooltip {
      position: fixed;
      display: none;
      z-index: 50;
      max-width: 280px;
      padding: 0.55rem 0.7rem;
      background: rgba(14, 17, 23, 0.94);
      color: #eef0f5;
      border: 1px solid rgba(124, 92, 255, 0.45);
      border-radius: 6px;
      font-size: 0.78rem;
      line-height: 1.4;
      pointer-events: none;
      box-shadow: 0 8px 28px rgba(0,0,0,0.35);
    }
    .tooltip .tt-title { font-weight: 700; color: #fff; margin-bottom: 0.2rem; }
    .tooltip .tt-path { font-size: 0.72rem; opacity: 0.75; word-break: break-all; }
    .tooltip .tt-meta { font-size: 0.7rem; opacity: 0.8; margin-top: 0.35rem; }
    #readerDates {
      display: block;
      margin-top: 0.2rem;
      font-size: 0.72rem;
      opacity: 0.65;
      font-family: ui-monospace, "Cascadia Code", Consolas, monospace;
    }
    .viz-activity { font-size: 0.74rem; line-height: 1.45; margin-bottom: 0.5rem; }
    .viz-activity-item { padding: 0.2rem 0; border-bottom: 1px dashed rgba(92,61,46,0.15); }
    .viz-activity-item .act-type { font-weight: 600; color: var(--wood); text-transform: uppercase; font-size: 0.68rem; letter-spacing: 0.04em; }
    .viz-activity-item .act-time { opacity: 0.6; font-size: 0.68rem; }
  </style>
</head>
<body class="viz-root">
  <header class="viz-header">
    <h1>\${repoTitle}</h1>
    <p class="tagline">A living map of your wiki — synapses are links, stacks are topics. Pan and zoom the mind; use the shelf to search and refocus.</p>
  </header>
  <main class="viz-main">
    <aside class="viz-panel library-panel" aria-label="Library sidebar">
      <h2>Stacks</h2>
      <p class="blurb">Each color is a shelf in your library. Larger nodes are ideas more connected to others.</p>
      <div class="viz-stats" role="status">
        <div>Pages <span id="stat-nodes">0</span></div>
        <div>Links <span id="stat-edges">0</span></div>
        <div style="grid-column: span 2;">In focus <span id="stat-focus">—</span></div>
      </div>
      <div class="viz-controls">
        <label for="searchFilter" class="sr-only">Search pages</label>
        <input type="search" id="searchFilter" placeholder="Search titles & paths…" autocomplete="off" />
        <button type="button" id="btnReset">Reset view & focus</button>
      </div>
      <h2>Shelf key</h2>
      <div class="viz-legend-row"><span class="swatch" style="background:#4a9eff"></span><span><strong>Entities</strong> — who &amp; what you track</span></div>
      <div class="viz-legend-row"><span class="swatch" style="background:#4caf50"></span><span><strong>Concepts</strong> — ideas &amp; frameworks</span></div>
      <div class="viz-legend-row"><span class="swatch" style="background:#ff9800"></span><span><strong>Sources</strong> — readings &amp; inputs</span></div>
      <div class="viz-legend-row"><span class="swatch" style="background:#ab47bc"></span><span><strong>Synthesis</strong> — cross-cutting views</span></div>
      <div class="viz-legend-row"><span class="swatch" style="background:#888"></span><span><strong>Other</strong> — index, log, templates…</span></div>
      <h2>Recent Activity</h2>
      <div id="activityFeed" class="viz-activity"></div>
      <p class="viz-hint">Tip: click a node in the graph to open the full page in the reader column and spotlight its neighborhood. On small screens the reader stacks below the graph. Rebuild graph + site after edits. Click the same node again to clear.</p>
    </aside>
    <div class="viz-canvas-wrap" aria-label="Graph canvas">
      <svg id="viz-svg" role="img" aria-label="Wiki link graph"></svg>
    </div>
    <article class="viz-doc" aria-label="Page reader">
      <div class="viz-doc-head">
        <span id="readerTitle"></span>
        <span id="readerPath"></span>
        <span id="readerDates"></span>
      </div>
      <div id="readerBody" class="viz-doc-body md-viewer" aria-live="polite">
        <p class="viz-reader-empty">Click a page in the graph to read it here.</p>
      </div>
    </article>
  </main>
  <div class="tooltip" id="tooltip" role="tooltip"></div>
  <style>.sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); border:0; }</style>
  <script type="module">
    import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
    import { marked } from "https://cdn.jsdelivr.net/npm/marked@12/+esm";
    import DOMPurify from "https://cdn.jsdelivr.net/npm/dompurify@3/+esm";

    const data = \${JSON.stringify(graph)};

    const mdOpts = { gfm: true, breaks: true, headerIds: false, mangle: false };

    function showReader(d) {
      const titleEl = document.getElementById("readerTitle");
      const pathEl = document.getElementById("readerPath");
      const datesEl = document.getElementById("readerDates");
      const bodyEl = document.getElementById("readerBody");
      if (!titleEl || !pathEl || !bodyEl) return;
      titleEl.textContent = d.title || d.id;
      pathEl.textContent = d.id;
      if (datesEl) {
        const parts = [];
        if (d.created) parts.push("created " + d.created);
        if (d.updated && d.updated !== d.created) parts.push("updated " + d.updated);
        datesEl.textContent = parts.join(" · ");
      }
      const raw = typeof d.body === "string" ? d.body : "";
      if (!raw) {
        bodyEl.innerHTML = DOMPurify.sanitize(
          '<p class="viz-reader-empty">No text for this page in graph.json. Run <code>node scripts/build-graph.js</code> then rebuild the site.</p>',
          { USE_PROFILES: { html: true } },
        );
        return;
      }
      const dirty = marked.parse(raw, mdOpts);
      bodyEl.innerHTML = DOMPurify.sanitize(dirty, { USE_PROFILES: { html: true } });
    }
    function clearReader() {
      const titleEl = document.getElementById("readerTitle");
      const pathEl = document.getElementById("readerPath");
      const datesEl = document.getElementById("readerDates");
      const bodyEl = document.getElementById("readerBody");
      if (titleEl) titleEl.textContent = "";
      if (pathEl) pathEl.textContent = "";
      if (datesEl) datesEl.textContent = "";
      if (bodyEl) {
        bodyEl.innerHTML = DOMPurify.sanitize(
          '<p class="viz-reader-empty">Click a page in the graph to read it here.</p>',
          { USE_PROFILES: { html: true } },
        );
      }
    }

    const DIR_COLORS = {
      entities: "#4a9eff",
      concepts: "#4caf50",
      sources: "#ff9800",
      synthesis: "#ab47bc",
    };

    function layoutSize() {
      const el = document.querySelector(".viz-canvas-wrap");
      const r = el ? el.getBoundingClientRect() : { width: 400, height: 400 };
      return { w: Math.max(240, r.width), h: Math.max(240, r.height) };
    }

    let { w: width, h: height } = layoutSize();
    const svg = d3.select("#viz-svg").attr("width", width).attr("height", height);
    const zoomG = svg.append("g").attr("class", "zoom-layer");
    const zoom = d3.zoom().scaleExtent([0.12, 10]).on("zoom", (e) => {
      zoomG.attr("transform", e.transform);
    });
    svg.call(zoom);
    svg.on("dblclick.zoom", null);
    svg.on("dblclick", (e) => {
      const t = e.target;
      if (t && t.tagName && t.tagName.toLowerCase() !== "circle" && t.tagName.toLowerCase() !== "text") {
        clearFocus();
      }
    });

    zoomG.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "transparent")
      .style("pointer-events", "none");

    const deg = new Map();
    for (const n of data.nodes) deg.set(n.id, 0);
    for (const e of data.edges) {
      const s = typeof e.source === "object" ? e.source.id : e.source;
      const t = typeof e.target === "object" ? e.target.id : e.target;
      deg.set(s, (deg.get(s) || 0) + 1);
      deg.set(t, (deg.get(t) || 0) + 1);
    }

    function nodeRadius(d) {
      const d0 = deg.get(d.id) || 1;
      return Math.max(5, Math.min(22, 4 + Math.sqrt(d0) * 3.2));
    }

    function linkPath(d) {
      const s = d.source;
      const t = d.target;
      if (typeof s !== "object" || typeof t !== "object" || s.x == null || t.x == null) {
        return "M0,0L0,0";
      }
      const mx = (s.x + t.x) * 0.5;
      const my = (s.y + t.y) * 0.5;
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const L = Math.hypot(dx, dy) || 1;
      const nx = -dy / L;
      const ny = dx / L;
      const bend = L * 0.14;
      const cx = mx + nx * bend;
      const cy = my + ny * bend;
      return "M" + s.x + "," + s.y + " Q" + cx + "," + cy + " " + t.x + "," + t.y;
    }

    const simulation = d3.forceSimulation(data.nodes)
      .force("link", d3.forceLink(data.edges).id((d) => d.id).distance(92).strength(0.55))
      .force("charge", d3.forceManyBody().strength(-260))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius((d) => nodeRadius(d) + 6));

    const linkG = zoomG.append("g").attr("class", "links");
    const link = linkG
      .selectAll("path")
      .data(data.edges)
      .join("path")
      .attr("fill", "none")
      .attr("stroke", "rgba(120,140,200,0.28)")
      .attr("stroke-width", 1.35)
      .attr("stroke-linecap", "round");

    const nodeG = zoomG.append("g").attr("class", "nodes");
    const node = nodeG
      .selectAll("circle")
      .data(data.nodes)
      .join("circle")
      .attr("r", (d) => nodeRadius(d))
      .attr("fill", (d) => DIR_COLORS[d.dir] || "#888")
      .attr("stroke", (d) => (DIR_COLORS[d.dir] ? "#fff" : "#ccc"))
      .attr("stroke-width", 1.2)
      .style("filter", "drop-shadow(0 0 6px rgba(124,92,255,0.25))")
      .call(
        d3
          .drag()
          .on("start", (e, d) => {
            if (!e.active) simulation.alphaTarget(0.35).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (e, d) => {
            d.fx = e.x;
            d.fy = e.y;
          })
          .on("end", (e, d) => {
            if (!e.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }),
      );

    const label = zoomG
      .append("g")
      .attr("class", "labels")
      .selectAll("text")
      .data(data.nodes)
      .join("text")
      .text((d) => d.title)
      .attr("font-size", (d) => Math.max(8, Math.min(12, 7 + nodeRadius(d) * 0.22)))
      .attr("fill", "rgba(240,238,255,0.92)")
      .attr("dx", (d) => nodeRadius(d) + 4)
      .attr("dy", "0.35em")
      .style("pointer-events", "none")
      .style("text-shadow", "0 1px 3px rgba(0,0,0,0.85)");

    document.getElementById("stat-nodes").textContent = String(data.nodes.length);
    document.getElementById("stat-edges").textContent = String(data.edges.length);

    const tooltip = document.getElementById("tooltip");
    function showTip(e, d) {
      const nbr = deg.get(d.id) || 0;
      tooltip.style.display = "block";
      tooltip.innerHTML =
        '<div class="tt-title"></div><div class="tt-path"></div><div class="tt-meta"></div>';
      tooltip.querySelector(".tt-title").textContent = d.title;
      tooltip.querySelector(".tt-path").textContent = d.id;
      const connStr = nbr + " connection" + (nbr === 1 ? "" : "s");
      tooltip.querySelector(".tt-meta").textContent = d.created ? connStr + " · " + d.created : connStr;
      positionTip(e);
    }
    function positionTip(e) {
      tooltip.style.left = e.clientX + 14 + "px";
      tooltip.style.top = e.clientY - 6 + "px";
    }
    function hideTip() {
      tooltip.style.display = "none";
    }
    let selected = null;
    let searchQ = "";

    node
      .on("mouseover", (e, d) => showTip(e, d))
      .on("mousemove", positionTip)
      .on("mouseout", hideTip)
      .on("click", (e, d) => {
        e.stopPropagation();
        if (searchQ.trim()) {
          showReader(d);
          applySearch();
          return;
        }
        if (selected === d.id) {
          selected = null;
          clearReader();
        } else {
          selected = d.id;
          showReader(d);
        }
        applyFocusOpacity();
      });

    function applySearch() {
      const q = searchQ.trim().toLowerCase();
      if (!q) {
        applyFocusOpacity();
        return;
      }
      const match = (d) =>
        (d.title && d.title.toLowerCase().includes(q)) ||
        (d.id && d.id.toLowerCase().includes(q)) ||
        (typeof d.body === "string" && d.body.toLowerCase().includes(q));
      node.attr("opacity", (d) => (match(d) ? 1 : 0.12));
      label.attr("opacity", (d) => (match(d) ? 1 : 0.1));
      link.attr("opacity", (l) => {
        const s = typeof l.source === "object" ? l.source : data.nodes.find((n) => n.id === l.source);
        const t = typeof l.target === "object" ? l.target : data.nodes.find((n) => n.id === l.target);
        return s && t && (match(s) || match(t)) ? 0.55 : 0.04;
      });
      document.getElementById("stat-focus").textContent = "search";
    }

    function applyFocusOpacity() {
      if (searchQ.trim()) {
        applySearch();
        return;
      }
      if (!selected) {
        node.attr("opacity", 1);
        link.attr("opacity", 0.85);
        label.attr("opacity", 1);
        document.getElementById("stat-focus").textContent = "—";
        return;
      }
      const connected = new Set([selected]);
      data.edges.forEach((e) => {
        const src = typeof e.source === "object" ? e.source.id : e.source;
        const tgt = typeof e.target === "object" ? e.target.id : e.target;
        if (src === selected) connected.add(tgt);
        if (tgt === selected) connected.add(src);
      });
      node.attr("opacity", (n) => (connected.has(n.id) ? 1 : 0.11));
      link.attr("opacity", (l) => {
        const src = typeof l.source === "object" ? l.source.id : l.source;
        const tgt = typeof l.target === "object" ? l.target.id : l.target;
        return src === selected || tgt === selected ? 0.95 : 0.05;
      });
      label.attr("opacity", (n) => (connected.has(n.id) ? 1 : 0.12));
      document.getElementById("stat-focus").textContent = selected;
    }

    function clearFocus() {
      selected = null;
      searchQ = "";
      const inp = document.getElementById("searchFilter");
      if (inp) inp.value = "";
      clearReader();
      applyFocusOpacity();
    }

    document.getElementById("btnReset").addEventListener("click", () => {
      clearFocus();
      svg.transition().duration(380).call(zoom.transform, d3.zoomIdentity);
    });

    document.getElementById("searchFilter").addEventListener("input", (e) => {
      searchQ = e.target.value || "";
      applySearch();
    });

    simulation.on("tick", () => {
      link.attr("d", linkPath);
      node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
      label.attr("x", (d) => d.x).attr("y", (d) => d.y);
    });

    function relayout() {
      const z = layoutSize();
      width = z.w;
      height = z.h;
      svg.attr("width", width).attr("height", height);
      zoomG.select("rect").attr("width", width).attr("height", height);
      simulation.force("center", d3.forceCenter(width / 2, height / 2));
      simulation.alpha(0.35).restart();
    }
    let resizeT = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(relayout, 120);
    });

    applyFocusOpacity();

    const feed = document.getElementById("activityFeed");
    if (feed && data.activity && data.activity.length) {
      const recent = [...data.activity].reverse().slice(0, 8);
      feed.innerHTML = DOMPurify.sanitize(
        recent.map((a) =>
          '<div class="viz-activity-item">' +
          '<span class="act-type">' + a.type + '</span> ' + a.message +
          '<br><span class="act-time">' + a.time + '</span></div>'
        ).join(""),
        { USE_PROFILES: { html: true } }
      );
    }
  </script>
</body>
</html>\`;

fs.writeFileSync(path.join("dist", "index.html"), html);
console.log("Site built → dist/index.html");
`;
}

export function getWikiGitignore(): string {
  return `node_modules/
dist/
.DS_Store
`;
}
