import { Command } from "commander";
import * as git from "../lib/git.ts";
import type { WikiContext } from "../types.ts";

export function makePullCommand(): Command {
  return new Command("pull")
    .description("Pull wiki changes from remote")
    .action(async function (this: Command) {
      const ctx: WikiContext = this.optsWithGlobals().wikiContext;

      if (!(await git.hasRemote(ctx.root))) {
        console.error('No remote configured. Use "wiki repo connect" to add one.');
        process.exit(1);
      }

      const result = await git.pull(ctx.root);
      if (!result.ok) {
        console.error(`Pull failed: ${result.output}`);
        process.exit(1);
      }

      console.log(result.output || "Already up to date.");
    });
}
