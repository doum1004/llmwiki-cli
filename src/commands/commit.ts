import { Command } from "commander";
import * as git from "../lib/git.ts";
import { LogManager } from "../lib/log-manager.ts";
import { requireFilesystem } from "../lib/storage.ts";
import type { WikiContext } from "../types.ts";

export function makeCommitCommand(): Command {
  return new Command("commit")
    .description("Git add + commit all changes")
    .argument("[message]", "commit message")
    .action(async function (this: Command, message: string | undefined) {
      const ctx: WikiContext = this.optsWithGlobals().wikiContext;
      requireFilesystem(ctx, "commit");

      // Auto-generate message from last log entry if not provided
      if (!message) {
        const mgr = new LogManager(ctx.provider);
        const entries = await mgr.show({ last: 1 });
        if (entries.length > 0) {
          const match = entries[0]!.match(/## \[.*?\] (.+)/);
          message = match ? match[1]! : "Update wiki";
        } else {
          message = "Update wiki";
        }
      }

      await git.addAll(ctx.root);
      const result = await git.commit(ctx.root, message);

      if (!result.ok) {
        if (result.output.includes("nothing to commit")) {
          console.log("Nothing to commit.");
        } else {
          console.error(result.output);
          process.exit(1);
        }
        return;
      }

      console.log(result.output);
    });
}
