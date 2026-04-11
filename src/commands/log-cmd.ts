import { Command } from "commander";
import { LogManager } from "../lib/log-manager.ts";
import type { WikiContext } from "../types.ts";

export function makeLogCommand(): Command {
  const cmd = new Command("log").description("Manage the activity log");

  cmd
    .command("show")
    .description("Print log entries")
    .option("-l, --last <n>", "show last N entries")
    .option("-t, --type <type>", "filter by type")
    .action(async function (
      this: Command,
      options: { last?: string; type?: string },
    ) {
      const ctx: WikiContext = this.optsWithGlobals().wikiContext;
      const mgr = new LogManager(ctx.provider);
      const entries = await mgr.show({
        last: options.last ? parseInt(options.last, 10) : undefined,
        type: options.type,
      });

      if (entries.length === 0) {
        console.log("No log entries found.");
        return;
      }

      for (const entry of entries) {
        console.log(entry);
        console.log();
      }
    });

  cmd
    .command("append")
    .description("Append a log entry")
    .argument("<type>", "entry type (e.g. ingest, query, maintenance)")
    .argument("<message>", "log message")
    .action(async function (this: Command, type: string, message: string) {
      const ctx: WikiContext = this.optsWithGlobals().wikiContext;
      const mgr = new LogManager(ctx.provider);
      await mgr.append(type, message);
      console.log(`Logged: ${type} | ${message}`);
    });

  return cmd;
}
