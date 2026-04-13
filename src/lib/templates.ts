import type { WikiConfig, BackendType } from "../types.ts";

export function getDefaultConfig(
  name: string,
  domain: string,
  backend: BackendType = "filesystem",
  options?: {
    profile?: string;
    git?: { token: string; repo: string };
    supabase?: { url: string; key: string; profile?: string; access_token?: string };
  },
): WikiConfig {
  const config: WikiConfig = {
    name,
    domain,
    created: new Date().toISOString(),
    backend,
    paths: {
      raw: "raw",
      wiki: "wiki",
      schema: "SCHEMA.md",
    },
  };
  if (options?.profile !== undefined) {
    config.profile = options.profile;
  }
  if (options?.git) {
    config.git = options.git;
  }
  if (options?.supabase) {
    config.supabase = options.supabase;
  }
  return config;
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

export function getVizWorkflow(): string {
  return `name: Build Wiki Visualization

on:
  push:
    branches: [main]

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
const WIKI_DIR = "wiki";
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

function resolveLink(target, allFiles) {
  const withMd = target.endsWith(".md") ? target : target + ".md";
  const candidates = allFiles.map((f) => f.replace(/\\\\/g, "/"));

  if (candidates.includes(withMd)) return withMd;

  const withWiki = "wiki/" + withMd;
  if (candidates.includes(withWiki)) return withWiki;

  const dirs = ["wiki/entities", "wiki/concepts", "wiki/sources", "wiki/synthesis"];
  for (const dir of dirs) {
    const candidate = dir + "/" + withMd;
    if (candidates.includes(candidate)) return candidate;
  }

  const basename = withMd.split("/").pop();
  const found = candidates.find((p) => p.endsWith("/" + basename) || p === basename);
  if (found) return found;

  return null;
}

const files = findMdFiles(WIKI_DIR);
const nodes = [];
const edges = [];

for (const file of files) {
  const content = fs.readFileSync(file, "utf-8");
  const relPath = file.replace(/\\\\/g, "/");
  const dir = relPath.split("/")[1] || "wiki";
  nodes.push({ id: relPath, title: extractTitle(content, file), dir });

  let match;
  const re = new RegExp(WIKILINK_RE.source, "g");
  while ((match = re.exec(content)) !== null) {
    const resolved = resolveLink(match[1], files.map((f) => f.replace(/\\\\/g, "/")));
    if (resolved) {
      edges.push({ source: relPath, target: resolved });
    }
  }
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(
  path.join(OUT_DIR, "graph.json"),
  JSON.stringify({ nodes, edges }, null, 2)
);
console.log("Graph: " + nodes.length + " nodes, " + edges.length + " edges → dist/graph.json");
`;
}

export function getBuildSiteScript(): string {
  return `const fs = require("fs");
const path = require("path");

const graph = JSON.parse(fs.readFileSync(path.join("dist", "graph.json"), "utf-8"));

const html = \`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Wiki Graph</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #1a1a2e; overflow: hidden; font-family: system-ui, sans-serif; }
    svg { width: 100vw; height: 100vh; display: block; }
    .tooltip {
      position: fixed; padding: 6px 10px; background: #16213e; color: #e0e0e0;
      border: 1px solid #0f3460; border-radius: 4px; font-size: 12px;
      pointer-events: none; display: none; z-index: 10;
    }
    .legend {
      position: fixed; top: 12px; left: 12px; background: rgba(22,33,62,0.9);
      padding: 10px 14px; border-radius: 6px; color: #ccc; font-size: 12px;
    }
    .legend div { margin: 3px 0; display: flex; align-items: center; gap: 6px; }
    .legend span { display: inline-block; width: 10px; height: 10px; border-radius: 50%; }
  </style>
</head>
<body>
  <div class="tooltip" id="tooltip"></div>
  <div class="legend">
    <div><span style="background:#4a9eff"></span> Entities</div>
    <div><span style="background:#4caf50"></span> Concepts</div>
    <div><span style="background:#ff9800"></span> Sources</div>
    <div><span style="background:#ab47bc"></span> Synthesis</div>
    <div><span style="background:#888"></span> Other</div>
  </div>
  <svg id="graph"></svg>
  <script type="module">
    import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

    const data = \\\${JSON.stringify(graph)};

    const DIR_COLORS = {
      entities: "#4a9eff",
      concepts: "#4caf50",
      sources: "#ff9800",
      synthesis: "#ab47bc",
    };

    const width = window.innerWidth;
    const height = window.innerHeight;

    const svg = d3.select("#graph");
    const g = svg.append("g");

    svg.call(d3.zoom().scaleExtent([0.1, 8]).on("zoom", (e) => g.attr("transform", e.transform)));

    const simulation = d3.forceSimulation(data.nodes)
      .force("link", d3.forceLink(data.edges).id((d) => d.id).distance(80))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30));

    const link = g.append("g")
      .selectAll("line")
      .data(data.edges)
      .join("line")
      .attr("stroke", "#334")
      .attr("stroke-width", 1);

    const node = g.append("g")
      .selectAll("circle")
      .data(data.nodes)
      .join("circle")
      .attr("r", 6)
      .attr("fill", (d) => DIR_COLORS[d.dir] || "#888")
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.5)
      .call(d3.drag()
        .on("start", (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on("end", (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }));

    const label = g.append("g")
      .selectAll("text")
      .data(data.nodes)
      .join("text")
      .text((d) => d.title)
      .attr("font-size", 9)
      .attr("fill", "#ccc")
      .attr("dx", 10)
      .attr("dy", 3);

    const tooltip = document.getElementById("tooltip");
    node.on("mouseover", (e, d) => {
      tooltip.style.display = "block";
      tooltip.textContent = d.id;
      tooltip.style.left = e.clientX + 12 + "px";
      tooltip.style.top = e.clientY - 8 + "px";
    }).on("mousemove", (e) => {
      tooltip.style.left = e.clientX + 12 + "px";
      tooltip.style.top = e.clientY - 8 + "px";
    }).on("mouseout", () => {
      tooltip.style.display = "none";
    });

    let selected = null;
    node.on("click", (e, d) => {
      if (selected === d.id) {
        selected = null;
        node.attr("opacity", 1);
        link.attr("opacity", 1);
        label.attr("opacity", 1);
        return;
      }
      selected = d.id;
      const connected = new Set();
      connected.add(d.id);
      data.edges.forEach((e) => {
        const src = typeof e.source === "object" ? e.source.id : e.source;
        const tgt = typeof e.target === "object" ? e.target.id : e.target;
        if (src === d.id) connected.add(tgt);
        if (tgt === d.id) connected.add(src);
      });
      node.attr("opacity", (n) => connected.has(n.id) ? 1 : 0.1);
      link.attr("opacity", (l) => {
        const src = typeof l.source === "object" ? l.source.id : l.source;
        const tgt = typeof l.target === "object" ? l.target.id : l.target;
        return src === d.id || tgt === d.id ? 1 : 0.05;
      });
      label.attr("opacity", (n) => connected.has(n.id) ? 1 : 0.1);
    });

    simulation.on("tick", () => {
      link.attr("x1", (d) => d.source.x).attr("y1", (d) => d.source.y)
          .attr("x2", (d) => d.target.x).attr("y2", (d) => d.target.y);
      node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
      label.attr("x", (d) => d.x).attr("y", (d) => d.y);
    });
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
