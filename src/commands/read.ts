import { Command } from "commander";
import type { WikiContext } from "../types.ts";

export function makeReadCommand(): Command {
  return new Command("read")
    .description("Print page content to stdout")
    .argument("<path>", "relative path to the page")
    .action(async function (this: Command, pagePath: string) {
      const ctx: WikiContext = this.optsWithGlobals().wikiContext;
      const content = await ctx.provider.readPage(pagePath);
      if (content === null) {
        console.error(`Page not found: ${pagePath}`);
        process.exit(1);
      }
      process.stdout.write(content);
    });
}
