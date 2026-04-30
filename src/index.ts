#!/usr/bin/env node

import { Command } from "commander";
import { makeInitCommand } from "./commands/init.ts";
import { makeRegistryCommand } from "./commands/registry.ts";
import { makeUseCommand } from "./commands/use.ts";
import { makeReadCommand } from "./commands/read.ts";
import { makeWriteCommand } from "./commands/write.ts";
import { makeAppendCommand } from "./commands/append.ts";
import { makeListCommand } from "./commands/list.ts";
import { makeSearchCommand } from "./commands/search.ts";
import { makeIndexCommand } from "./commands/index-cmd.ts";
import { makeLogCommand } from "./commands/log-cmd.ts";
import { makeLintCommand } from "./commands/lint.ts";
import { makeLinksCommand } from "./commands/links.ts";
import { makeBacklinksCommand } from "./commands/backlinks.ts";
import { makeOrphansCommand } from "./commands/orphans.ts";
import { makeStatusCommand } from "./commands/status.ts";
import { makeSkillCommand } from "./commands/skill.ts";
import { makeProfileCommand } from "./commands/profile-cmd.ts";
import { resolveWiki } from "./lib/resolver.ts";
import { loadRegistry, getStorageProfile } from "./lib/registry.ts";
import { createProvider, effectiveFilesystemRoot } from "./lib/storage.ts";
import { resolveStorageProfile } from "./lib/profile.ts";
import type { GlobalOptions, WikiContext } from "./types.ts";
import packageJson from "../package.json" with { type: "json" };

const program = new Command();

program
  .name("wiki")
  .description(packageJson.description)
  .version(packageJson.version)
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
