import { Command } from "commander";
import { buildLinkGraph } from "../lib/link-parser.ts";
import type { WikiContext } from "../types.ts";

export function makeBacklinksCommand(): Command {
  return new Command("backlinks")
    .description("Show pages that link to this page")
    .argument("<path>", "page path")
    .action(async function (this: Command, pagePath: string) {
      const ctx: WikiContext = this.optsWithGlobals().wikiContext;
      const graph = await buildLinkGraph(ctx.provider);

      const pageData = graph.pages.get(pagePath);
      if (!pageData) {
        console.error(`Page not found: ${pagePath}`);
        process.exit(1);
      }

      if (pageData.inbound.length === 0) {
        console.log(`No pages link to ${pagePath}`);
        return;
      }

      console.log(`Pages linking to ${pagePath} (${pageData.inbound.length}):\n`);
      for (const link of pageData.inbound) {
        console.log(`  <- ${link}`);
      }
    });
}
