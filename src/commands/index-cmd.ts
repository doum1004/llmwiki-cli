import { Command } from "commander";
import { join } from "path";
import { IndexManager } from "../lib/index-manager.ts";
import type { WikiContext } from "../types.ts";

export function makeIndexCommand(): Command {
  const cmd = new Command("index").description("Manage the wiki index");

  cmd
    .command("show")
    .description("Print index.md to stdout")
    .action(async function (this: Command) {
      const ctx: WikiContext = this.parent!.optsWithGlobals().wikiContext;
      const mgr = new IndexManager(join(ctx.root, "wiki/index.md"));
      const content = await mgr.read();
      process.stdout.write(content);
    });

  cmd
    .command("add")
    .description("Add an entry to the index")
    .argument("<path>", "page path")
    .argument("<summary>", "one-line summary")
    .action(async function (this: Command, path: string, summary: string) {
      const ctx: WikiContext = this.parent!.optsWithGlobals().wikiContext;
      const mgr = new IndexManager(join(ctx.root, "wiki/index.md"));
      await mgr.addEntry(path, summary);
      console.log(`Added to index: ${path}`);
    });

  cmd
    .command("remove")
    .description("Remove an entry from the index")
    .argument("<path>", "page path")
    .action(async function (this: Command, path: string) {
      const ctx: WikiContext = this.parent!.optsWithGlobals().wikiContext;
      const mgr = new IndexManager(join(ctx.root, "wiki/index.md"));
      const removed = await mgr.removeEntry(path);
      if (!removed) {
        console.error(`Entry not found in index: ${path}`);
        process.exit(1);
      }
      console.log(`Removed from index: ${path}`);
    });

  return cmd;
}
