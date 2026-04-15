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
import { makeLintCommand } from "../src/commands/lint.ts";
import { makeLinksCommand } from "../src/commands/links.ts";
import { makeBacklinksCommand } from "../src/commands/backlinks.ts";
import { makeOrphansCommand } from "../src/commands/orphans.ts";
import { makeStatusCommand } from "../src/commands/status.ts";
import { makeSkillCommand } from "../src/commands/skill.ts";
import { makeProfileCommand } from "../src/commands/profile-cmd.ts";
import { resolveWiki } from "../src/lib/resolver.ts";
import { loadRegistry, getStorageProfile } from "../src/lib/registry.ts";
import { createProvider, effectiveFilesystemRoot } from "../src/lib/storage.ts";
import { resolveStorageProfile } from "../src/lib/profile.ts";
import type { GlobalOptions, WikiContext } from "../src/types.ts";

const program = new Command();

program
  .name("wiki")
  .description("CLI tool for LLM agents to build and maintain knowledge bases")
  .version("0.1.5")
  .option("-w, --wiki <id>", "specify wiki by registry id")
  .option(
    "-p, --profile <id>",
    "Storage profile slug: uses profiles/<slug>/ subdirectory (env: LLMWIKI_PROFILE)",
  );

// Commands that do NOT require wiki resolution
program.addCommand(makeInitCommand());
program.addCommand(makeRegistryCommand());
program.addCommand(makeUseCommand());
program.addCommand(makeSkillCommand());
program.addCommand(makeProfileCommand());

// Commands that require wiki resolution
program.addCommand(makeReadCommand());
program.addCommand(makeWriteCommand());
program.addCommand(makeAppendCommand());
program.addCommand(makeListCommand());
program.addCommand(makeSearchCommand());
program.addCommand(makeIndexCommand());
program.addCommand(makeLogCommand());
program.addCommand(makeLintCommand());
program.addCommand(makeLinksCommand());
program.addCommand(makeBacklinksCommand());
program.addCommand(makeOrphansCommand());
program.addCommand(makeStatusCommand());

// Resolve wiki context for commands that need it
const SKIP_RESOLUTION = new Set(["init", "registry", "use", "skill"]);

program.hook("preAction", async (thisCommand, actionCommand) => {
  const cmdName = actionCommand.name();
  if (
    SKIP_RESOLUTION.has(cmdName) &&
    !(cmdName === "use" && actionCommand.parent?.name() === "profile")
  ) {
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

  const registry = await loadRegistry();
  const { profile, source } = resolveStorageProfile({
    envValue: process.env.LLMWIKI_PROFILE,
    cliValue: globalOpts.profile,
    registryValue: getStorageProfile(registry, resolved.id),
    configValue: resolved.config.profile,
  });

  const effectiveRoot = effectiveFilesystemRoot(resolved.root, profile);

  const provider = await createProvider(resolved.config, resolved.root, {
    storageProfile: profile,
  });

  const context: WikiContext = {
    ...resolved,
    provider,
    storageScope: {
      profile,
      source,
      effectiveRoot,
    },
  };
  actionCommand.setOptionValueWithSource("wikiContext", context, "cli");
});

await program.parseAsync(process.argv);
