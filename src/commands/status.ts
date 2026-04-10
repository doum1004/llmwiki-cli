import { Command } from "commander";
import { join } from "path";
import { WikiManager } from "../lib/wiki.ts";
import { buildLinkGraph } from "../lib/link-parser.ts";
import { LogManager } from "../lib/log-manager.ts";
import * as git from "../lib/git.ts";
import type { WikiContext } from "../types.ts";

interface StatusInfo {
  name: string;
  domain: string;
  path: string;
  created: string;
  pages: { total: number; byDir: Record<string, number> };
  links: { total: number; broken: number; orphans: number };
  recentActivity: string[];
  git: { commits: string; hasRemote: boolean };
}

export function makeStatusCommand(): Command {
  return new Command("status")
    .description("Wiki overview and stats")
    .option("--json", "output as JSON")
    .action(async function (this: Command, options: { json?: boolean }) {
      const ctx: WikiContext = this.optsWithGlobals().wikiContext;
      const wiki = new WikiManager(ctx.root);

      // Page counts
      const pages = await wiki.listPages();
      const byDir: Record<string, number> = {};
      for (const page of pages) {
        const dir = page.includes("/")
          ? page.split("/").slice(0, -1).join("/")
          : ".";
        byDir[dir] = (byDir[dir] ?? 0) + 1;
      }

      // Link graph
      const graph = await buildLinkGraph(wiki);
      let totalLinks = 0;
      for (const [, data] of graph.pages) {
        totalLinks += data.outbound.length;
      }

      // Recent activity
      const logMgr = new LogManager(join(ctx.root, "wiki/log.md"));
      const recentEntries = await logMgr.show({ last: 5 });
      const recentActivity = recentEntries.map((e) => {
        const match = e.match(/## (\[.*)/);
        return match ? match[1]! : e;
      });

      // Git info
      const gitLog = await git.log(ctx.root, 1);
      const commitCount = gitLog.ok ? (await git.log(ctx.root, 99999)).output.split("\n").filter(Boolean).length.toString() : "0";
      const remote = await git.hasRemote(ctx.root);

      const info: StatusInfo = {
        name: ctx.config.name,
        domain: ctx.config.domain,
        path: ctx.root,
        created: ctx.config.created,
        pages: { total: pages.length, byDir },
        links: {
          total: totalLinks,
          broken: graph.brokenLinks.length,
          orphans: graph.orphans.length,
        },
        recentActivity,
        git: { commits: commitCount, hasRemote: remote },
      };

      if (options.json) {
        console.log(JSON.stringify(info, null, 2));
        return;
      }

      console.log(`\n${info.name} [${info.domain}]`);
      console.log(`  Path: ${info.path}`);
      console.log(`  Created: ${info.created}`);

      console.log(`\nPages: ${info.pages.total} total`);
      for (const [dir, count] of Object.entries(info.pages.byDir).sort()) {
        console.log(`  ${dir}/ ${count}`);
      }

      console.log(`\nLinks: ${info.links.total} wikilinks`);
      if (info.links.broken > 0) console.log(`  Broken: ${info.links.broken}`);
      if (info.links.orphans > 0) console.log(`  Orphans: ${info.links.orphans}`);

      if (info.recentActivity.length > 0) {
        console.log(`\nRecent activity:`);
        for (const entry of info.recentActivity) {
          console.log(`  ${entry}`);
        }
      }

      console.log(`\nGit: ${info.git.commits} commits`);
      console.log(`  Remote: ${info.git.hasRemote ? "yes" : "none"}`);
    });
}
