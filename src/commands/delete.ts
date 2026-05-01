import { Command } from "commander";
import { IndexManager } from "../lib/index-manager.ts";
import type { WikiContext } from "../types.ts";

export function makeDeleteCommand(): Command {
  return new Command("delete")
    .description("Delete a page and remove it from wiki/index.md if listed")
    .argument("<path>", "relative path to the page")
    .action(async function (this: Command, pagePath: string) {
      const ctx: WikiContext = this.optsWithGlobals().wikiContext;
      try {
        await ctx.provider.deletePage(pagePath);
      } catch (err: unknown) {
        if (
          err instanceof Error &&
          "code" in err &&
          (err as NodeJS.ErrnoException).code === "ENOENT"
        ) {
          console.error(`wiki delete: page not found: ${pagePath}`);
          process.exit(1);
        }
        throw err;
      }

      const indexMgr = new IndexManager(ctx.provider);
      await indexMgr.removeEntry(pagePath);
      console.log(`deleted ${pagePath}`);
    });
}
