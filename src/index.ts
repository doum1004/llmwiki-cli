#!/usr/bin/env node

import { Command } from "commander";
import { makeInitCommand } from "./commands/init.ts";
import { makeRegistryCommand } from "./commands/registry.ts";
import { makeUseCommand } from "./commands/use.ts";
import { makeReadCommand } from "./commands/read.ts";
import { makeWriteCommand } from "./commands/write.ts";
import { makeDeleteCommand } from "./commands/delete.ts";
import { makeListCommand } from "./commands/list.ts";
import { makeSearchCommand } from "./commands/search.ts";
import { makeLintCommand } from "./commands/lint.ts";
import { makeLinksCommand } from "./commands/links.ts";
import { makeBacklinksCommand } from "./commands/backlinks.ts";
import { makeOrphansCommand } from "./commands/orphans.ts";
import { makeStatusCommand } from "./commands/status.ts";
import { makeSkillCommand } from "./commands/skill.ts";
import { resolveWiki } from "./lib/resolver.ts";
import { createProvider } from "./lib/storage.ts";
import type { GlobalOptions, WikiContext } from "./types.ts";
import packageJson from "../package.json" with { type: "json" };

const program = new Command();

program
  .name("wiki")
  .description(packageJson.description)
  .version(packageJson.version)
  .option("-w, --wiki <id>", "specify wiki by registry id");

// Commands that do NOT require wiki resolution
program.addCommand(makeInitCommand());
program.addCommand(makeRegistryCommand());
program.addCommand(makeUseCommand());
program.addCommand(makeSkillCommand());

// Commands that require wiki resolution
program.addCommand(makeReadCommand());
program.addCommand(makeWriteCommand());
program.addCommand(makeDeleteCommand());
program.addCommand(makeListCommand());
program.addCommand(makeSearchCommand());
program.addCommand(makeLintCommand());
program.addCommand(makeLinksCommand());
program.addCommand(makeBacklinksCommand());
program.addCommand(makeOrphansCommand());
program.addCommand(makeStatusCommand());

const SKIP_RESOLUTION = new Set(["init", "registry", "use", "skill"]);

program.hook("preAction", async (thisCommand, actionCommand) => {
  const cmdName = actionCommand.name();
  if (SKIP_RESOLUTION.has(cmdName)) {
    return;
  }

  let resolved: Awaited<ReturnType<typeof resolveWiki>>;
  let globalOpts: GlobalOptions;
  try {
    globalOpts = thisCommand.optsWithGlobals<GlobalOptions>();
    resolved = await resolveWiki(globalOpts);
  } catch (err: any) {
    console.error(err.message);
    process.exit(1);
  }

  if (!resolved) {
    console.error(
      'No wiki found. Run "wiki init" to create one, or use --wiki to specify.',
    );
    process.exit(1);
  }

  const provider = await createProvider(resolved.config, resolved.root);

  const context: WikiContext = {
    ...resolved,
    provider,
  };
  actionCommand.setOptionValueWithSource("wikiContext", context, "cli");
});

await program.parseAsync(process.argv);
