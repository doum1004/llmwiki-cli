import { Command } from "commander";
import * as git from "../lib/git.ts";
import { requireFilesystem } from "../lib/storage.ts";
import type { WikiContext } from "../types.ts";

export function makeDiffCommand(): Command {
  return new Command("diff")
    .description("Show uncommitted changes or a specific commit")
    .argument("[ref]", "commit ref to show (default: uncommitted changes)")
    .action(async function (this: Command, ref: string | undefined) {
      const ctx: WikiContext = this.optsWithGlobals().wikiContext;
      requireFilesystem(ctx, "diff");
      const result = await git.diff(ctx.root, ref);

      if (!result.ok) {
        console.error(result.output);
        process.exit(1);
      }

      if (!result.output) {
        console.log("No changes.");
        return;
      }

      console.log(result.output);
    });
}
