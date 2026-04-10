import { Command } from "commander";
import { join } from "path";
import { WikiManager } from "../lib/wiki.ts";
import { buildLinkGraph } from "../lib/link-parser.ts";
import { hasFrontmatter } from "../lib/frontmatter.ts";
import { IndexManager } from "../lib/index-manager.ts";
import type { WikiContext } from "../types.ts";

interface LintIssue {
  type: string;
  message: string;
  path?: string;
}

export function makeLintCommand(): Command {
  return new Command("lint")
    .description("Check wiki health")
    .option("--json", "output as JSON")
    .action(async function (this: Command, options: { json?: boolean }) {
      const ctx: WikiContext = this.optsWithGlobals().wikiContext;
      const wiki = new WikiManager(ctx.root);
      const issues: LintIssue[] = [];

      // Build link graph
      const graph = await buildLinkGraph(wiki);

      // Broken links
      for (const { source, target } of graph.brokenLinks) {
        issues.push({
          type: "broken-link",
          message: `${source} -> [[${target}]]`,
          path: source,
        });
      }

      // Orphan pages
      for (const orphan of graph.orphans) {
        issues.push({
          type: "orphan",
          message: `${orphan} (0 inbound links)`,
          path: orphan,
        });
      }

      // Missing frontmatter and empty pages
      const pages = await wiki.listPages();
      for (const page of pages) {
        const content = await wiki.readPage(page);
        if (!content) continue;

        if (!hasFrontmatter(content)) {
          issues.push({
            type: "missing-frontmatter",
            message: page,
            path: page,
          });
        }

        const body = content.replace(/^---[\s\S]*?---\s*/, "").trim();
        if (!body) {
          issues.push({
            type: "empty-page",
            message: page,
            path: page,
          });
        }
      }

      // Index consistency
      const indexMgr = new IndexManager(join(ctx.root, "wiki/index.md"));
      const indexContent = await indexMgr.read();
      for (const page of pages) {
        if (page === "wiki/index.md" || page === "wiki/log.md") continue;
        if (!page.startsWith("wiki/")) continue;
        if (!(await indexMgr.hasEntry(page))) {
          issues.push({
            type: "not-in-index",
            message: `Not in index: ${page}`,
            path: page,
          });
        }
      }

      // Index entries pointing to missing pages
      const indexLinks = indexContent.match(/\[\[([^\]]+)\]\]/g) || [];
      for (const link of indexLinks) {
        const path = link.slice(2, -2);
        if (!(await wiki.pageExists(path))) {
          issues.push({
            type: "missing-page",
            message: `In index but file missing: ${path}`,
            path,
          });
        }
      }

      if (options.json) {
        console.log(JSON.stringify({ issues, pagesChecked: pages.length }, null, 2));
        return;
      }

      if (issues.length === 0) {
        console.log(`${pages.length} pages checked. No issues found.`);
        return;
      }

      const grouped: Record<string, LintIssue[]> = {};
      for (const issue of issues) {
        grouped[issue.type] = grouped[issue.type] ?? [];
        grouped[issue.type]!.push(issue);
      }

      const labels: Record<string, string> = {
        "broken-link": "Broken links",
        orphan: "Orphan pages",
        "missing-frontmatter": "Missing frontmatter",
        "empty-page": "Empty pages",
        "not-in-index": "Not in index",
        "missing-page": "Missing pages (in index but file gone)",
      };

      for (const [type, items] of Object.entries(grouped)) {
        const label = labels[type] ?? type;
        console.log(`\n${label} (${items.length}):`);
        for (const item of items) {
          console.log(`  ${item.message}`);
        }
      }

      console.log(`\n${pages.length} pages checked, ${issues.length} issues found.`);
    });
}
