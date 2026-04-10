#!/usr/bin/env node

import { Command } from "commander";
import { makeInitCommand } from "../src/commands/init.ts";
import { makeRegistryCommand } from "../src/commands/registry.ts";
import { makeUseCommand } from "../src/commands/use.ts";
import { makeReadCommand } from "../src/commands/read.ts";
import { makeWriteCommand } from "../src/commands/write.ts";
import { makeAppendCommand } from "../src/commands/append.ts";
import { makeListCommand } from "../src/commands/list.ts";
import { makeSearchCommand } from "../src/commands/search.ts";
import { makeIndexCommand } from "../src/commands/index-cmd.ts";
import { makeLogCommand } from "../src/commands/log-cmd.ts";
import { makeCommitCommand } from "../src/commands/commit.ts";
import { makeHistoryCommand } from "../src/commands/history.ts";
import { makeDiffCommand } from "../src/commands/diff.ts";
import { resolveWiki } from "../src/lib/resolver.ts";
import type { GlobalOptions } from "../src/types.ts";

const program = new Command();

program
  .name("wiki")
  .description("CLI tool for LLM agents to build and maintain knowledge bases")
  .version("0.1.0")
  .option("-w, --wiki <id>", "specify wiki by registry id");

// Commands that do NOT require wiki resolution
program.addCommand(makeInitCommand());
program.addCommand(makeRegistryCommand());
program.addCommand(makeUseCommand());

// Commands that require wiki resolution
program.addCommand(makeReadCommand());
program.addCommand(makeWriteCommand());
program.addCommand(makeAppendCommand());
program.addCommand(makeListCommand());
program.addCommand(makeSearchCommand());
program.addCommand(makeIndexCommand());
program.addCommand(makeLogCommand());
program.addCommand(makeCommitCommand());
program.addCommand(makeHistoryCommand());
program.addCommand(makeDiffCommand());

// Resolve wiki context for commands that need it
const SKIP_RESOLUTION = new Set(["init", "registry", "use"]);

program.hook("preAction", async (thisCommand, actionCommand) => {
  if (SKIP_RESOLUTION.has(actionCommand.name())) return;

  const globalOpts = thisCommand.optsWithGlobals<GlobalOptions>();
  const context = await resolveWiki(globalOpts);

  if (!context) {
    console.error(
      'No wiki found. Run "wiki init" to create one, or use --wiki to specify.',
    );
    process.exit(1);
  }

  actionCommand.setOptionValueWithSource("wikiContext", context, "cli");
});

await program.parseAsync(process.argv);
