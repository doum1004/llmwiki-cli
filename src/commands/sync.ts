import { Command } from "commander";
import * as git from "../lib/git.ts";
import { requireFilesystem } from "../lib/storage.ts";
import type { WikiContext } from "../types.ts";

export function makeSyncCommand(): Command {
  return new Command("sync")
    .description("Pull then push (sync with remote)")
    .action(async function (this: Command) {
      const ctx: WikiContext = this.optsWithGlobals().wikiContext;
      requireFilesystem(ctx, "sync");

      if (!(await git.hasRemote(ctx.root))) {
        console.error('No remote configured. Use "wiki repo connect" to add one.');
        process.exit(1);
      }

      const branch = await git.currentBranch(ctx.root);

      console.log("Pulling...");
      const pullResult = await git.pull(ctx.root, "origin", branch);
      if (!pullResult.ok) {
        console.error(`Pull failed: ${pullResult.output}`);
        process.exit(1);
      }

      if (await git.hasConflicts(ctx.root)) {
        console.error("Pull succeeded but there are merge conflicts to resolve.");
        console.log("Fix the conflicts, then: git add <files> && git rebase --continue");
        console.log("After resolving, run: wiki push");
        process.exit(1);
      }
      console.log(pullResult.output || "Already up to date.");

      console.log("Pushing...");
      const pushResult = await git.push(ctx.root, "origin", branch);
      if (!pushResult.ok) {
        console.error(`Push failed: ${pushResult.output}`);
        process.exit(1);
      }
      console.log(pushResult.output || "Pushed successfully.");

      console.log("Synced.");
    });
}
