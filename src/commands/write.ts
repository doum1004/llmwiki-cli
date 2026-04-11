import { Command } from "commander";
import type { WikiContext } from "../types.ts";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

export function makeWriteCommand(): Command {
  return new Command("write")
    .description("Write stdin to a page (create or overwrite)")
    .argument("<path>", "relative path to the page")
    .action(async function (this: Command, pagePath: string) {
      const ctx: WikiContext = this.optsWithGlobals().wikiContext;
      const content = await readStdin();
      if (!content) {
        console.error("No content provided on stdin.");
        process.exit(1);
      }
      await ctx.provider.writePage(pagePath, content);
      console.log(`wrote ${pagePath}`);
    });
}
