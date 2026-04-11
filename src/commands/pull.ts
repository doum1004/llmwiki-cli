import { Command } from "commander";
import * as git from "../lib/git.ts";
import { requireFilesystem } from "../lib/storage.ts";
import type { WikiContext } from "../types.ts";

export function makePullCommand(): Command {
  return new Command("pull")
    .description("Pull wiki changes from remote")
    .action(async function (this: Command) {
      const ctx: WikiContext = this.optsWithGlobals().wikiContext;
      requireFilesystem(ctx, "pull");

      if (!(await git.hasRemote(ctx.root))) {
        console.error('No remote configured. Use "wiki repo connect" to add one.');
        process.exit(1);
      }

      const branch = await git.currentBranch(ctx.root);
      const result = await git.pull(ctx.root, "origin", branch);
      if (!result.ok) {
        console.error(`Pull failed: ${result.output}`);
        process.exit(1);
      }

      if (await git.hasConflicts(ctx.root)) {
        console.error("Pull succeeded but there are merge conflicts to resolve.");
        console.log("Fix the conflicts, then: git add <files> && git rebase --continue");
        process.exit(1);
      }

      console.log(result.output || "Already up to date.");
    });
}
