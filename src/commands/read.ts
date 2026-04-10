import { Command } from "commander";
import { join } from "path";
import { WikiManager } from "../lib/wiki.ts";
import type { WikiContext } from "../types.ts";

export function makeReadCommand(): Command {
  return new Command("read")
    .description("Print page content to stdout")
    .argument("<path>", "relative path to the page")
    .action(async function (this: Command, pagePath: string) {
      const ctx: WikiContext = this.optsWithGlobals().wikiContext;
      const wiki = new WikiManager(ctx.root);
      const content = await wiki.readPage(pagePath);
      if (content === null) {
        console.error(`Page not found: ${pagePath}`);
        process.exit(1);
      }
      process.stdout.write(content);
    });
}
