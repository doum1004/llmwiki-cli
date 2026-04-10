import { Command } from "commander";
import * as git from "../lib/git.ts";
import type { WikiContext } from "../types.ts";

export function makePushCommand(): Command {
  return new Command("push")
    .description("Push wiki changes to remote")
    .action(async function (this: Command) {
      const ctx: WikiContext = this.optsWithGlobals().wikiContext;

      if (!(await git.hasRemote(ctx.root))) {
        console.error('No remote configured. Use "wiki repo connect" to add one.');
        process.exit(1);
      }

      const branch = await git.currentBranch(ctx.root);
      const result = await git.push(ctx.root, "origin", branch);
      if (!result.ok) {
        console.error(`Push failed: ${result.output}`);
        process.exit(1);
      }

      console.log(result.output || "Pushed successfully.");
    });
}
