import { Command } from "commander";
import { WikiManager } from "../lib/wiki.ts";
import { buildLinkGraph } from "../lib/link-parser.ts";
import type { WikiContext } from "../types.ts";

export function makeOrphansCommand(): Command {
  return new Command("orphans")
    .description("List pages with no inbound links")
    .action(async function (this: Command) {
      const ctx: WikiContext = this.optsWithGlobals().wikiContext;
      const wiki = new WikiManager(ctx.root);
      const graph = await buildLinkGraph(wiki);

      if (graph.orphans.length === 0) {
        console.log("No orphan pages found.");
        return;
      }

      console.log(`Orphan pages (${graph.orphans.length}):\n`);
      for (const orphan of graph.orphans) {
        console.log(`  ${orphan}`);
      }
    });
}
