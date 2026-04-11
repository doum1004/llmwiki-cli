import { Command } from "commander";
import { loadRegistry, setDefault } from "../lib/registry.ts";

export function makeUseCommand(): Command {
  return new Command("use")
    .description("Set the active wiki")
    .argument("[wiki-id]", "wiki identifier to activate")
    .action(async (wikiId: string | undefined) => {
      if (!wikiId) {
        const registry = await loadRegistry();
        const ids = Object.keys(registry.wikis);
        if (ids.length === 0) {
          console.error('No wikis registered. Run "wiki init" first.');
          process.exit(1);
        }
        console.log("Available wikis:");
        for (const id of ids) {
          const marker = id === registry.default ? " (active)" : "";
          console.log(`  ${id}${marker}`);
        }
        console.log('\nUsage: wiki use <wiki-id>');
        return;
      }

      const success = await setDefault(wikiId);
      if (!success) {
        const registry = await loadRegistry();
        const ids = Object.keys(registry.wikis);
        console.error(`Wiki "${wikiId}" not found in registry.`);
        if (ids.length > 0) {
          console.error(`Available wikis: ${ids.join(", ")}`);
        }
        process.exit(1);
      }

      console.log(`Active wiki set to "${wikiId}".`);
    });
}
