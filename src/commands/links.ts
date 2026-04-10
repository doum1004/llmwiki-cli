import { Command } from "commander";
import { WikiManager } from "../lib/wiki.ts";
import { buildLinkGraph } from "../lib/link-parser.ts";
import type { WikiContext } from "../types.ts";

export function makeLinksCommand(): Command {
  return new Command("links")
    .description("Show outbound and inbound links for a page")
    .argument("<path>", "page path")
    .action(async function (this: Command, pagePath: string) {
      const ctx: WikiContext = this.optsWithGlobals().wikiContext;
      const wiki = new WikiManager(ctx.root);
      const graph = await buildLinkGraph(wiki);

      const pageData = graph.pages.get(pagePath);
      if (!pageData) {
        console.error(`Page not found: ${pagePath}`);
        process.exit(1);
      }

      console.log(pagePath);
      console.log();

      console.log(`  Outbound (${pageData.outbound.length}):`);
      if (pageData.outbound.length === 0) {
        console.log("    (none)");
      } else {
        for (const link of pageData.outbound) {
          console.log(`    -> ${link}`);
        }
      }

      console.log();

      console.log(`  Inbound (${pageData.inbound.length}):`);
      if (pageData.inbound.length === 0) {
        console.log("    (none)");
      } else {
        for (const link of pageData.inbound) {
          console.log(`    <- ${link}`);
        }
      }
    });
}
