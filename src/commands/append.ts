import { Command } from "commander";
import { WikiManager } from "../lib/wiki.ts";
import type { WikiContext } from "../types.ts";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

export function makeAppendCommand(): Command {
  return new Command("append")
    .description("Append stdin to an existing page")
    .argument("<path>", "relative path to the page")
    .action(async function (this: Command, pagePath: string) {
      const ctx: WikiContext = this.optsWithGlobals().wikiContext;
      const content = await readStdin();
      if (!content) {
        console.error("No content provided on stdin.");
        process.exit(1);
      }
      const wiki = new WikiManager(ctx.root);
      const ok = await wiki.appendPage(pagePath, content);
      if (!ok) {
        console.error(`Page not found: ${pagePath}`);
        process.exit(1);
      }
      console.log(`appended to ${pagePath}`);
    });
}
