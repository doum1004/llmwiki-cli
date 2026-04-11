import { Command } from "commander";
import * as git from "../lib/git.ts";
import { requireFilesystem } from "../lib/storage.ts";
import type { WikiContext } from "../types.ts";

export function makeHistoryCommand(): Command {
  return new Command("history")
    .description("Show git commit history")
    .argument("[path]", "show history for a specific file")
    .option("-l, --last <n>", "number of commits to show", "20")
    .action(async function (
      this: Command,
      path: string | undefined,
      options: { last: string },
    ) {
      const ctx: WikiContext = this.optsWithGlobals().wikiContext;
      requireFilesystem(ctx, "history");
      const limit = parseInt(options.last, 10);

      let result;
      if (path) {
        result = await git.logFile(ctx.root, path, limit);
      } else {
        result = await git.log(ctx.root, limit);
      }

      if (!result.ok) {
        console.error(result.output);
        process.exit(1);
      }

      if (!result.output) {
        console.log("No history found.");
        return;
      }

      console.log(result.output);
    });
}
